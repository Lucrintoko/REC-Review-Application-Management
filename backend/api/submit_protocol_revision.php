<?php
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
    echo json_encode(["status" => "error", "message" => "Only POST requests allowed"]);
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

if (!isset($input['application_id']) || !isset($input['revision_notes'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing required fields: application_id and revision_notes are required."]);
    exit;
}

$application_id = intval($input['application_id']);
$revision_notes = trim($input['revision_notes']);
$applicant_id = isset($input['applicant_id']) ? intval($input['applicant_id']) : null;
$document_metadata = [];
if (isset($input['document_metadata'])) {
    if (is_array($input['document_metadata'])) {
        $document_metadata = $input['document_metadata'];
    } else {
        $decoded = json_decode($input['document_metadata'], true);
        $document_metadata = is_array($decoded) ? $decoded : [];
    }
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Start atomic transaction
    $db->beginTransaction();

    // 1. Verify application exists and fetch current details
    $getApp = "SELECT r.application_id, r.status, r.form_data, a.applicant_id, a.first_name, a.last_name
               FROM research_applications r
               JOIN applicants a ON a.applicant_id = r.applicant_id
               WHERE r.application_id = :application_id FOR UPDATE";
    $stmtApp = $db->prepare($getApp);
    $stmtApp->execute([':application_id' => $application_id]);
    $appData = $stmtApp->fetch(PDO::FETCH_ASSOC);

    if (!$appData) {
        $db->rollBack();
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Application not found."]);
        exit;
    }

    $applicant_name = $appData['first_name'] . ' ' . $appData['last_name'];
    $formData = $appData['form_data'] ? json_decode($appData['form_data'], true) : [];
    if (!is_array($formData)) {
        $formData = [];
    }

    // 2. Process uploaded files if any
    $uploadedFiles = [];
    $uploadDir = __DIR__ . '/../uploads/documents/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    if (isset($_FILES['files']) && !empty($_FILES['files']['name'])) {
        $fileNames = is_array($_FILES['files']['name']) ? $_FILES['files']['name'] : [$_FILES['files']['name']];
        $fileTmpNames = is_array($_FILES['files']['tmp_name']) ? $_FILES['files']['tmp_name'] : [$_FILES['files']['tmp_name']];
        $fileErrors = is_array($_FILES['files']['error']) ? $_FILES['files']['error'] : [$_FILES['files']['error']];
        $fileSizes = is_array($_FILES['files']['size']) ? $_FILES['files']['size'] : [$_FILES['files']['size']];

        foreach ($fileNames as $index => $originalName) {
            if ($fileErrors[$index] === UPLOAD_ERR_OK && is_uploaded_file($fileTmpNames[$index])) {
                $ext = pathinfo($originalName, PATHINFO_EXTENSION);
                $safeBaseName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
                $uniqueFileName = 'rev_' . time() . '_' . $index . '_' . $safeBaseName . '.' . $ext;
                $destination = $uploadDir . $uniqueFileName;

                if (move_uploaded_file($fileTmpNames[$index], $destination)) {
                    $savedPath = 'uploads/documents/' . $uniqueFileName;
                    $sizeKb = round($fileSizes[$index] / 1024);

                    $meta = isset($document_metadata[$index]) ? $document_metadata[$index] : [];
                    $category = isset($meta['category']) ? $meta['category'] : 'Revised Protocol';

                    $fileEntry = [
                        'name' => $originalName,
                        'savedPath' => $savedPath,
                        'size' => $fileSizes[$index],
                        'size_kb' => $sizeKb,
                        'category' => $category,
                        'uploaded_at' => date('Y-m-d H:i:s')
                    ];
                    $uploadedFiles[] = $fileEntry;

                    // Insert into research_documents table
                    $insertDoc = "INSERT INTO research_documents (
                                    application_id, document_type, file_name, file_path, file_size_kb, version_number
                                  ) VALUES (
                                    :application_id, 'Revised Protocol', :file_name, :file_path, :file_size_kb, 
                                    COALESCE((SELECT MAX(version_number) + 1 FROM research_documents WHERE application_id = :app_sub AND document_type = 'Revised Protocol'), 1)
                                  )";
                    $stmtDoc = $db->prepare($insertDoc);
                    $stmtDoc->execute([
                        ':application_id' => $application_id,
                        ':file_name'      => $originalName,
                        ':file_path'      => $savedPath,
                        ':file_size_kb'   => $sizeKb,
                        ':app_sub'        => $application_id
                    ]);
                }
            }
        }
    }

    // 3. Update form_data structure to record the revision submission history
    if (!isset($formData['revision_submissions'])) {
        $formData['revision_submissions'] = [];
    }

    $currentAttemptNo = isset($input['revision_attempt_no']) ? intval($input['revision_attempt_no']) : 1;
    $formData['revision_submissions'][] = [
        'attempt_no'   => $currentAttemptNo,
        'submitted_at' => date('Y-m-d H:i:s'),
        'notes'        => $revision_notes,
        'files'        => $uploadedFiles
    ];

    // If new files were uploaded, also append to requirements for ReviewTypeModal visibility
    if (!isset($formData['requirements'])) {
        $formData['requirements'] = [];
    }
    if (!isset($formData['requirements']['revisedDocuments'])) {
        $formData['requirements']['revisedDocuments'] = [];
    }
    foreach ($uploadedFiles as $uf) {
        $formData['requirements']['revisedDocuments'][] = $uf;
    }

    // 4. Update research_applications record
    // Invariant: Status stays 'Type of Review', payments table remains 100% untouched
    $updateApp = "UPDATE research_applications 
                  SET form_data = :form_data, 
                      updated_at = CURRENT_TIMESTAMP
                  WHERE application_id = :application_id";
    $stmtUpdateApp = $db->prepare($updateApp);
    $stmtUpdateApp->execute([
        ':form_data'      => json_encode($formData),
        ':application_id' => $application_id
    ]);

    // 5. Complete active Protocol Revision in application_history
    $findPendingRevision = "SELECT history_id FROM application_history 
                            WHERE application_id = :application_id 
                              AND process_point::text IN ('Protocol Revision', 'Proponent Revisions') 
                              AND status = 'Pending' 
                            ORDER BY history_id DESC LIMIT 1";
    $stmtFindRev = $db->prepare($findPendingRevision);
    $stmtFindRev->execute([':application_id' => $application_id]);
    $pendingHistoryId = $stmtFindRev->fetchColumn();

    if ($pendingHistoryId) {
        $updatePendingHist = "UPDATE application_history 
                              SET status = 'Completed', 
                                  date_completed = CURRENT_TIMESTAMP, 
                                  proponent_name = :proponent_name, 
                                  notes = :notes 
                              WHERE history_id = :history_id";
        $stmtUpHist = $db->prepare($updatePendingHist);
        $stmtUpHist->execute([
            ':proponent_name' => $applicant_name,
            ':notes'          => $revision_notes,
            ':history_id'     => $pendingHistoryId
        ]);
    } else {
        // Fallback if no pending row found
        recordHistory($db, $application_id, 'Protocol Revision', 'Completed', $applicant_name, $revision_notes, false);
    }

    // 6. Spawn Attempt #2 (or sequential next) of 'Review Type Assessment' for Ethics Chair
    recordHistory($db, $application_id, 'Review Type Assessment', 'Pending', '', null, false);

    // Commit atomic transaction
    $db->commit();

    // 7. Calculate milestone progress
    $milestone = calculatorFlowChartMilestone('Type of Review');

    http_response_code(200);
    echo json_encode([
        "status"    => "success",
        "success"   => true,
        "message"   => "Protocol revisions submitted successfully. The Ethics Chair has been notified for Review Type Assessment (Attempt #" . ($currentAttemptNo + 1) . ").",
        "milestone" => $milestone,
        "data"      => [
            "application_id" => $application_id,
            "attempt_no"     => $currentAttemptNo + 1,
            "uploaded_files" => count($uploadedFiles)
        ]
    ]);

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "success" => false,
        "message" => "Failed to submit protocol revision: " . $e->getMessage()
    ]);
}
