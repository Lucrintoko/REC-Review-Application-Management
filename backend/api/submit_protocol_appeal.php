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

if (!isset($input['application_id']) || !isset($input['appeal_justification'])) {
    http_response_code(400);
    echo json_encode([
        "status" => "error", 
        "message" => "Missing required fields: application_id and appeal_justification are required."
    ]);
    exit;
}

$application_id = intval($input['application_id']);
$appeal_title = isset($input['appeal_title']) && trim($input['appeal_title']) !== '' 
    ? trim($input['appeal_title']) 
    : "Formal Reconsideration Petition";
$appeal_justification = trim($input['appeal_justification']);
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

    // 1. Verify application exists and lock for update
    $getApp = "SELECT r.application_id, r.status, r.form_data, r.current_cycle, r.is_appealed,
                      a.applicant_id, a.first_name, a.last_name
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

    // Invariant check: In Approach A, single appeal cycle per disapproval
    if (!empty($appData['is_appealed'])) {
        $db->rollBack();
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "A formal appeal has already been lodged for this application."
        ]);
        exit;
    }

    $applicant_name = $appData['first_name'] . ' ' . $appData['last_name'];
    $formData = $appData['form_data'] ? json_decode($appData['form_data'], true) : [];
    if (!is_array($formData)) {
        $formData = [];
    }

    // 2. Fetch latest consolidated evaluation to snapshot prior disapproval
    $getConsol = "SELECT consolidation_id, cycle_number, status, consolidated_recommendation,
                         summary_notes, directives_for_revisions, meeting_date, chair_id,
                         adm.first_name AS chair_first_name, adm.last_name AS chair_last_name
                  FROM consolidated_evaluations ce
                  LEFT JOIN admins adm ON adm.admin_id = ce.chair_id
                  WHERE ce.application_id = :application_id
                  ORDER BY ce.cycle_number DESC, ce.consolidation_id DESC
                  LIMIT 1";
    $stmtConsol = $db->prepare($getConsol);
    $stmtConsol->execute([':application_id' => $application_id]);
    $latestConsol = $stmtConsol->fetch(PDO::FETCH_ASSOC);

    $priorChairName = ($latestConsol && !empty($latestConsol['chair_first_name']))
        ? trim($latestConsol['chair_first_name'] . ' ' . $latestConsol['chair_last_name'])
        : 'Ethics Committee Chair';

    $priorDisapprovalSnapshot = [
        'consolidation_id'           => $latestConsol ? (int)$latestConsol['consolidation_id'] : null,
        'cycle_number'               => $latestConsol ? (int)$latestConsol['cycle_number'] : 1,
        'meeting_date'               => $latestConsol ? $latestConsol['meeting_date'] : null,
        'chair_name'                 => $priorChairName,
        'directives_for_revisions'   => $latestConsol ? $latestConsol['directives_for_revisions'] : null,
        'summary_notes'              => $latestConsol ? $latestConsol['summary_notes'] : null,
        'recommendation'             => $latestConsol ? $latestConsol['consolidated_recommendation'] : 'Disapproved'
    ];

    // 3. Process uploaded corrective files if any
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
                $uniqueFileName = 'appeal_' . time() . '_' . $index . '_' . $safeBaseName . '.' . $ext;
                $destination = $uploadDir . $uniqueFileName;

                if (move_uploaded_file($fileTmpNames[$index], $destination)) {
                    $savedPath = 'uploads/documents/' . $uniqueFileName;
                    $sizeKb = round($fileSizes[$index] / 1024);

                    $meta = isset($document_metadata[$index]) ? $document_metadata[$index] : [];
                    $category = isset($meta['category']) ? $meta['category'] : 'restructured_protocol_clean';

                    $fileEntry = [
                        'name'        => $originalName,
                        'savedPath'   => $savedPath,
                        'size'        => $fileSizes[$index],
                        'size_kb'     => $sizeKb,
                        'category'    => $category,
                        'uploaded_at' => date('Y-m-d H:i:s')
                    ];
                    $uploadedFiles[] = $fileEntry;

                    // Insert into research_documents table
                    // document_type uses 'Revised Protocol' to satisfy document_type_enum
                    $insertDoc = "INSERT INTO research_documents (
                                    application_id, document_type, file_name, file_path, file_size_kb, version_number
                                  ) VALUES (
                                    :application_id, 'Revised Protocol', :file_name, :file_path, :file_size_kb, 2
                                  )";
                    $stmtDoc = $db->prepare($insertDoc);
                    $stmtDoc->execute([
                        ':application_id' => $application_id,
                        ':file_name'      => $originalName,
                        ':file_path'      => $savedPath,
                        ':file_size_kb'   => $sizeKb
                    ]);
                }
            }
        }
    }

    // 4. Update form_data structure with appeal_submissions array
    if (!isset($formData['appeal_submissions'])) {
        $formData['appeal_submissions'] = [];
    }

    $appealEntry = [
        'appeal_id'                  => 'APL-' . time() . '-' . (count($formData['appeal_submissions']) + 1),
        'cycle_number'               => 2,
        'submitted_at'               => date('Y-m-d H:i:s'),
        'proponent_name'             => $applicant_name,
        'appeal_title'               => $appeal_title,
        'appeal_justification'       => $appeal_justification,
        'corrective_documents'       => $uploadedFiles,
        'prior_disapproval_snapshot' => $priorDisapprovalSnapshot,
        'affirmation'                => true
    ];
    $formData['appeal_submissions'][] = $appealEntry;

    // Append corrective files to requirements for ongoing review accessibility
    if (!isset($formData['requirements'])) {
        $formData['requirements'] = [];
    }
    if (!isset($formData['requirements']['appealDocuments'])) {
        $formData['requirements']['appealDocuments'] = [];
    }
    foreach ($uploadedFiles as $uf) {
        $formData['requirements']['appealDocuments'][] = $uf;
    }

    // 5. Update research_applications record
    // Advances to current_cycle = 2, is_appealed = TRUE, status = 'Ongoing Review'
    $updateApp = "UPDATE research_applications 
                  SET current_cycle = 2,
                      is_appealed = TRUE,
                      status = 'Ongoing Review'::status_enum,
                      form_data = :form_data, 
                      updated_at = CURRENT_TIMESTAMP
                  WHERE application_id = :application_id";
    $stmtUpdateApp = $db->prepare($updateApp);
    $stmtUpdateApp->execute([
        ':form_data'      => json_encode($formData),
        ':application_id' => $application_id
    ]);

    // 5b. Automatically initialize Cycle 2 peer reviews for the assigned committee
    // Duplicates the reviewer roster from Cycle 1 with clean evaluation worksheets ('In Progress')
    $initCycle2Reviews = "INSERT INTO protocol_reviews (
                              application_id, reviewer_id, reviewer_role, review_status,
                              recommendation, comments, form_data, assigned_date, cycle_number
                          )
                          SELECT 
                              application_id, reviewer_id, reviewer_role, 'In Progress'::review_status_enum,
                              NULL, NULL, NULL, CURRENT_DATE, 2
                          FROM protocol_reviews
                          WHERE application_id = :application_id AND cycle_number = 1
                          ON CONFLICT (application_id, reviewer_id, cycle_number) DO NOTHING";
    $stmtInitReviews = $db->prepare($initCycle2Reviews);
    $stmtInitReviews->execute([':application_id' => $application_id]);

    // 6. Complete active 'Decision Issued' step in application_history
    $completeDecision = "UPDATE application_history 
                         SET status = 'Completed', 
                             date_completed = CURRENT_TIMESTAMP, 
                             notes = 'Decision letter received by applicant. Formal appeal & petition for reconsideration filed.'
                         WHERE application_id = :application_id 
                           AND process_point = 'Decision Issued' 
                           AND status = 'Pending'";
    $stmtCompDec = $db->prepare($completeDecision);
    $stmtCompDec->execute([':application_id' => $application_id]);

    // 7. Record 'Protocol Appeal' as Completed
    recordHistory(
        $db,
        $application_id,
        'Protocol Appeal',
        'Completed',
        $applicant_name,
        "Formal Reconsideration Petition: {$appeal_title}. Justification provided with " . count($uploadedFiles) . " corrective document(s).",
        false
    );

    // 8. Spawn 'Appeal Re-deliberation' as Pending for the Full Board Committee
    recordHistory(
        $db,
        $application_id,
        'Appeal Re-deliberation',
        'Pending',
        'Ethics Committee Chair / Full Board',
        "Cycle 2 Heightened Board Scrutiny initiated to verify resolution of prior fatal ethical flaws.",
        false
    );

    // Commit atomic transaction
    $db->commit();

    // 9. Calculate milestone progress
    $milestone = calculatorFlowChartMilestone('Ongoing Review');

    http_response_code(200);
    echo json_encode([
        "status"       => "success",
        "success"      => true,
        "message"      => "Formal appeal for reconsideration submitted successfully. The protocol has advanced to Cycle 2 under Heightened Board Scrutiny.",
        "milestone"    => $milestone,
        "data"         => [
            "application_id" => $application_id,
            "cycle_number"   => 2,
            "is_appealed"    => true,
            "new_status"     => "Ongoing Review",
            "uploaded_files" => count($uploadedFiles),
            "appeal_id"      => $appealEntry['appeal_id']
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
        "message" => "Failed to submit protocol appeal: " . $e->getMessage()
    ]);
}
?>
