<?php
// Handles researchers re-submission of their applications via the recommendations issued
// on 'Decision Letter Issued' Status

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/history_helper.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "status"  => "error",
        "success" => false,
        "message" => "Only POST requests are allowed."
    ]);
    exit;
}

// Support both multipart/form-data and application/json
$isMultipart = isset($_POST['application_id']) || isset($_POST['payload']);
if ($isMultipart) {
    if (isset($_POST['payload'])) {
        $input = json_decode($_POST['payload'], true);
    } else {
        $input = $_POST;
    }
} else {
    $input = json_decode(file_get_contents('php://input'), true);
}

// 1. Validate mandatory fields
if (!isset($input['application_id'])) {
    http_response_code(400);
    echo json_encode([
        "status"  => "error",
        "success" => false,
        "message" => "Missing required parameter: application_id."
    ]);
    exit;
}

$application_id = intval($input['application_id']);
$cover_notes = isset($input['revision_notes']) ? trim($input['revision_notes']) : '';
if (empty($cover_notes) && isset($input['cover_notes'])) {
    $cover_notes = trim($input['cover_notes']);
}

// Parse compliance_matrix
$compliance_matrix = [];
if (isset($input['compliance_matrix'])) {
    if (is_array($input['compliance_matrix'])) {
        $compliance_matrix = $input['compliance_matrix'];
    } else {
        $decoded = json_decode($input['compliance_matrix'], true);
        $compliance_matrix = is_array($decoded) ? $decoded : [];
    }
}

// Parse document_metadata
$document_metadata = [];
if (isset($input['document_metadata'])) {
    if (is_array($input['document_metadata'])) {
        $document_metadata = $input['document_metadata'];
    } else {
        $decodedMeta = json_decode($input['document_metadata'], true);
        $document_metadata = is_array($decodedMeta) ? $decodedMeta : [];
    }
}

$savedFilesOnDisk = []; // Tracks physical files to roll back if transaction fails

try {
    $database = new Database();
    $db = $database->getConnection();

    // Start atomic PDO transaction
    $db->beginTransaction();

    // 2. Row-lock application and verify status precondition
    $getApp = "SELECT r.application_id, r.protocol_code, r.status, r.current_cycle, r.is_appealed, r.form_data,
                      a.applicant_id, a.first_name, a.last_name
               FROM research_applications r
               JOIN applicants a ON a.applicant_id = r.applicant_id
               WHERE r.application_id = :application_id
               FOR UPDATE";
    $stmtApp = $db->prepare($getApp);
    $stmtApp->execute([':application_id' => $application_id]);
    $appData = $stmtApp->fetch(PDO::FETCH_ASSOC);

    if (!$appData) {
        $db->rollBack();
        http_response_code(404);
        echo json_encode([
            "status"  => "error",
            "success" => false,
            "message" => "Research application not found."
        ]);
        exit;
    }

    // Invariant: Status must be 'Decision Letter Issued'
    if ($appData['status'] !== 'Decision Letter Issued') {
        $db->rollBack();
        http_response_code(409);
        echo json_encode([
            "status"  => "error",
            "success" => false,
            "message" => "Application is not awaiting revised submission (Current status: {$appData['status']})."
        ]);
        exit;
    }

    $applicant_name = trim($appData['first_name'] . ' ' . $appData['last_name']);
    $current_cycle  = (int)($appData['current_cycle'] ?? 1);
    $formData       = $appData['form_data'] ? json_decode($appData['form_data'], true) : [];
    if (!is_array($formData)) {
        $formData = [];
    }

    // 3. Process uploaded files if any
    $uploadedFiles = [];
    $uploadDir = __DIR__ . '/../uploads/documents/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    if (isset($_FILES['files']) && !empty($_FILES['files']['name'])) {
        $fileNames    = is_array($_FILES['files']['name']) ? $_FILES['files']['name'] : [$_FILES['files']['name']];
        $fileTmpNames = is_array($_FILES['files']['tmp_name']) ? $_FILES['files']['tmp_name'] : [$_FILES['files']['tmp_name']];
        $fileErrors   = is_array($_FILES['files']['error']) ? $_FILES['files']['error'] : [$_FILES['files']['error']];
        $fileSizes    = is_array($_FILES['files']['size']) ? $_FILES['files']['size'] : [$_FILES['files']['size']];

        foreach ($fileNames as $index => $originalName) {
            if ($fileErrors[$index] === UPLOAD_ERR_OK && is_uploaded_file($fileTmpNames[$index])) {
                $ext = pathinfo($originalName, PATHINFO_EXTENSION);
                $safeBaseName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
                $uniqueFileName = 'post_rev_' . time() . '_' . $index . '_' . $safeBaseName . '.' . $ext;
                $destination = $uploadDir . $uniqueFileName;

                if (move_uploaded_file($fileTmpNames[$index], $destination)) {
                    $savedFilesOnDisk[] = $destination;
                    $savedPath = 'uploads/documents/' . $uniqueFileName;
                    $sizeKb = round($fileSizes[$index] / 1024);

                    $meta = isset($document_metadata[$index]) ? $document_metadata[$index] : [];
                    $category = isset($meta['category']) ? $meta['category'] : 'revised_protocol_clean';

                    // Map category to document_type_enum:
                    // 'revised_protocol_clean' | 'revised_protocol_tracked' -> 'Revised Protocol'
                    // 'updated_consent_form' -> 'Informed Consent Form'
                    // others -> 'Other'
                    $docType = 'Revised Protocol';
                    if ($category === 'updated_consent_form') {
                        $docType = 'Informed Consent Form';
                    } elseif ($category === 'other_supporting' || $category === 'clarification_matrix') {
                        $docType = 'Other';
                    }

                    // Insert into research_documents table
                    $insertDoc = "INSERT INTO research_documents (
                                    application_id, document_type, file_name, file_path, file_size_kb, version_number, uploaded_at
                                  ) VALUES (
                                    :application_id, :doc_type::document_type_enum, :file_name, :file_path, :file_size_kb,
                                    COALESCE((
                                        SELECT MAX(version_number) + 1 
                                        FROM research_documents 
                                        WHERE application_id = :app_sub 
                                          AND document_type = :doc_type_sub::document_type_enum
                                    ), 1),
                                    CURRENT_TIMESTAMP
                                  ) RETURNING document_id, version_number";
                    $stmtDoc = $db->prepare($insertDoc);
                    $stmtDoc->execute([
                        ':application_id' => $application_id,
                        ':doc_type'       => $docType,
                        ':file_name'      => $originalName,
                        ':file_path'      => $savedPath,
                        ':file_size_kb'   => $sizeKb,
                        ':app_sub'        => $application_id,
                        ':doc_type_sub'   => $docType
                    ]);
                    $docRow = $stmtDoc->fetch(PDO::FETCH_ASSOC);

                    $uploadedFiles[] = [
                        'document_id'    => $docRow ? (int)$docRow['document_id'] : null,
                        'version_number' => $docRow ? (int)$docRow['version_number'] : 1,
                        'name'           => $originalName,
                        'savedPath'      => $savedPath,
                        'size_kb'        => $sizeKb,
                        'category'       => $category,
                        'uploaded_at'    => date('Y-m-d H:i:s')
                    ];
                }
            }
        }
    }

    // 4. Update form_data structure to record the revision submission history
    if (!isset($formData['revision_submissions'])) {
        $formData['revision_submissions'] = [];
    }

    $attemptNo = count($formData['revision_submissions']) + 1;
    $submissionRecord = [
        'stage'             => 'post_review_revision',
        'attempt_no'        => $attemptNo,
        'cycle_number'      => $current_cycle,
        'submitted_at'      => date('c'),
        'proponent_name'    => $applicant_name,
        'cover_notes'       => $cover_notes,
        'compliance_matrix' => $compliance_matrix,
        'files'             => $uploadedFiles
    ];
    $formData['revision_submissions'][] = $submissionRecord;

    // 5. Update research_applications record
    // Invariant: Status transitions to 'Revisions Submitted'
    $updateApp = "UPDATE research_applications 
                  SET status = 'Revisions Submitted'::status_enum,
                      form_data = :form_data::jsonb, 
                      updated_at = CURRENT_TIMESTAMP
                  WHERE application_id = :application_id";
    $stmtUpdateApp = $db->prepare($updateApp);
    $stmtUpdateApp->execute([
        ':form_data'      => json_encode($formData),
        ':application_id' => $application_id
    ]);

    // 6. Complete active 'Decision Issued' / 'Proponent Revisions' in application_history
    $completeActiveHist = "UPDATE application_history 
                           SET status = 'Completed'::history_status_enum, 
                               date_completed = CURRENT_TIMESTAMP
                           WHERE application_id = :application_id 
                             AND process_point::text IN ('Decision Issued', 'Proponent Revisions') 
                             AND status = 'Pending'::history_status_enum";
    $stmtCompleteHist = $db->prepare($completeActiveHist);
    $stmtCompleteHist->execute([':application_id' => $application_id]);

    // 7. Record 'Proponent Revisions' as Completed
    $insertPropHist = "INSERT INTO application_history (
                        application_id, process_point, status, proponent_name, date_completed, notes, attempt_no, is_rejected
                      ) VALUES (
                        :application_id, 'Proponent Revisions'::process_point_enum, 'Completed'::history_status_enum,
                        :proponent_name, CURRENT_TIMESTAMP, :notes, :attempt_no, FALSE
                      )";
    $stmtPropHist = $db->prepare($insertPropHist);
    $stmtPropHist->execute([
        ':application_id' => $application_id,
        ':proponent_name' => $applicant_name,
        ':notes'          => !empty($cover_notes) ? $cover_notes : "Point-by-point clarification matrix and revised study protocol submitted.",
        ':attempt_no'     => $attemptNo
    ]);

    // 8. Spawn 'Revisions Verification' as Pending for Ethics Committee Chair / Secretariat
    $insertNextHist = "INSERT INTO application_history (
                        application_id, process_point, status, proponent_name, date_completed, notes, attempt_no, is_rejected
                      ) VALUES (
                        :application_id, 'Revisions Verification'::process_point_enum, 'Pending'::history_status_enum,
                        'Ethics Committee Chair / Secretariat', NULL, 
                        'Revised protocol documents and point-by-point compliance matrix submitted. Awaiting verification by Ethics Committee Chair.',
                        :attempt_no, FALSE
                      )";
    $stmtNextHist = $db->prepare($insertNextHist);
    $stmtNextHist->execute([
        ':application_id' => $application_id,
        ':attempt_no'     => $attemptNo
    ]);

    // Commit atomic transaction
    $db->commit();

    echo json_encode([
        "status"      => "success",
        "success"     => true,
        "message"     => "Revised protocol and point-by-point compliance matrix successfully submitted.",
        "data"        => [
            "application_id" => $application_id,
            "status"         => "Revisions Submitted",
            "attempt_no"     => $attemptNo,
            "cycle_number"   => $current_cycle,
            "submitted_at"   => $submissionRecord['submitted_at'],
            "files_count"    => count($uploadedFiles),
            "matrix_count"   => count($compliance_matrix)
        ]
    ]);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    // Clean up physical files on disk
    foreach ($savedFilesOnDisk as $path) {
        if (file_exists($path)) {
            @unlink($path);
        }
    }
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "success" => false,
        "message" => "Database transaction error: " . $e->getMessage()
    ]);
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    foreach ($savedFilesOnDisk as $path) {
        if (file_exists($path)) {
            @unlink($path);
        }
    }
    http_response_code($e->getCode() >= 400 && $e->getCode() <= 500 ? $e->getCode() : 500);
    echo json_encode([
        "status"  => "error",
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
