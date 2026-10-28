<?php
// Has 2 methods of proceeding: Path 1 - All recommendations satisfied proceed to 'Clearance Granted Status;
// Path 2 - Recommendations not satisfied proceed to 'Decision Letter Issued' Status and  then revisions need to be redone

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
        "message" => "Method not allowed. Only POST requests are accepted."
    ]);
    exit;
}

// Support both JSON body and POST form data
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);
if (!$input && !empty($_POST)) {
    if (isset($_POST['payload'])) {
        $input = json_decode($_POST['payload'], true);
    } else {
        $input = $_POST;
    }
}

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode([
        "status"  => "error",
        "success" => false,
        "message" => "Invalid or empty JSON payload."
    ]);
    exit;
}

// 1. Mandatory Parameter Validation
if (!isset($input['application_id']) || intval($input['application_id']) <= 0) {
    http_response_code(400);
    echo json_encode([
        "status"  => "error",
        "success" => false,
        "message" => "Missing or invalid required parameter: application_id."
    ]);
    exit;
}

$application_id = intval($input['application_id']);
$action = isset($input['action']) ? trim($input['action']) : '';

$validActions = ['grant_clearance', 'request_clarification'];
if (!in_array($action, $validActions, true)) {
    http_response_code(400);
    echo json_encode([
        "status"  => "error",
        "success" => false,
        "message" => "Invalid action parameter. Must be 'grant_clearance' or 'request_clarification'."
    ]);
    exit;
}

// Extract optional / contextual fields
$admin_id                   = isset($input['admin_id']) ? intval($input['admin_id']) : 0;
$chair_name                 = isset($input['chair_name']) ? trim($input['chair_name']) : '';
$general_verification_notes = isset($input['general_verification_notes']) ? trim($input['general_verification_notes']) : '';
$validity_period_years      = isset($input['validity_period_years']) ? max(1, min(5, intval($input['validity_period_years']))) : 1;

// Parse verification_checklist
$verification_checklist = [];
if (isset($input['verification_checklist'])) {
    if (is_array($input['verification_checklist'])) {
        $verification_checklist = $input['verification_checklist'];
    } else {
        $decoded = json_decode($input['verification_checklist'], true);
        $verification_checklist = is_array($decoded) ? $decoded : [];
    }
}

// 2. Action-Specific Domain Validation Rules
if ($action === 'grant_clearance') {
    // Assert no checklist item is marked 'Deficient'
    foreach ($verification_checklist as $qId => $item) {
        $status = is_array($item) ? ($item['status'] ?? '') : '';
        if (strcasecmp($status, 'Deficient') === 0) {
            http_response_code(422);
            echo json_encode([
                "status"  => "error",
                "success" => false,
                "message" => "Cannot grant ethical clearance while one or more directives remain marked as Deficient."
            ]);
            exit;
        }
    }
} elseif ($action === 'request_clarification') {
    // Assert there are reasons provided (either deficient items or general notes)
    $hasDeficientItem = false;
    foreach ($verification_checklist as $qId => $item) {
        $status = is_array($item) ? ($item['status'] ?? '') : '';
        if (strcasecmp($status, 'Deficient') === 0) {
            $hasDeficientItem = true;
            break;
        }
    }

    if (!$hasDeficientItem && empty($general_verification_notes)) {
        http_response_code(422);
        echo json_encode([
            "status"  => "error",
            "success" => false,
            "message" => "Please mark deficient directives in the verification checklist or provide general clarification notes explaining required modifications."
        ]);
        exit;
    }
}

try {
    $database = new Database();
    $db = $database->getConnection();

    // Start strict atomic PDO transaction
    $db->beginTransaction();

    // 3. Row-lock application and verify status precondition
    $getApp = "SELECT r.application_id, r.protocol_code, r.research_title, r.status, r.current_cycle,
                      r.is_appealed, r.clearance_date, r.form_data,
                      a.applicant_id, a.first_name, a.last_name, a.email
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

    // Invariant: Status must be 'Revisions Submitted'
    if ($appData['status'] !== 'Revisions Submitted') {
        $db->rollBack();
        http_response_code(409);
        echo json_encode([
            "status"  => "error",
            "success" => false,
            "message" => "Application is not awaiting revisions verification (Current status: {$appData['status']})."
        ]);
        exit;
    }

    $applicant_name = trim($appData['first_name'] . ' ' . $appData['last_name']);
    $applicant_id   = (int)$appData['applicant_id'];
    $protocol_code  = !empty($appData['protocol_code']) ? $appData['protocol_code'] : ('REC-' . date('Y') . '-' . str_pad($application_id, 4, '0', STR_PAD_LEFT));
    $current_cycle  = (int)($appData['current_cycle'] ?? 1);

    // Resolve verifier admin details
    $resolvedChairName = $chair_name;
    $resolvedAdminId   = $admin_id > 0 ? $admin_id : 2;

    if (empty($resolvedChairName)) {
        if ($admin_id > 0) {
            $stmtAdmin = $db->prepare("SELECT admin_id, first_name, last_name, role FROM admins WHERE admin_id = :aid");
            $stmtAdmin->execute([':aid' => $admin_id]);
            $adminRow = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
            if ($adminRow) {
                $resolvedChairName = trim($adminRow['first_name'] . ' ' . $adminRow['last_name']);
            }
        }
        if (empty($resolvedChairName)) {
            $stmtChair = $db->query("SELECT admin_id, first_name, last_name, role FROM admins WHERE role = 'Ethics Chair' ORDER BY admin_id ASC LIMIT 1");
            $chairRow = $stmtChair ? $stmtChair->fetch(PDO::FETCH_ASSOC) : null;
            if ($chairRow) {
                $resolvedChairName = trim($chairRow['first_name'] . ' ' . $chairRow['last_name']);
                if ($admin_id <= 0) {
                    $resolvedAdminId = (int)$chairRow['admin_id'];
                }
            } else {
                $resolvedChairName = "Ethics Research Board Chair";
            }
        }
    }

    // Parse existing form_data
    $formData = $appData['form_data'] ? json_decode($appData['form_data'], true) : [];
    if (!is_array($formData)) {
        $formData = [];
    }

    $revisionsList = isset($formData['revision_submissions']) && is_array($formData['revision_submissions'])
        ? $formData['revision_submissions']
        : [];
    $attemptNo = max(1, count($revisionsList));

    // 4. Branch based on action outcome
    if ($action === 'grant_clearance') {
        // --- PATH A: GRANT CLEARANCE ---
        $newAppStatus = 'Clearance Granted';
        $certNumber   = 'AdZU-REC-' . $protocol_code;
        $validityStart = date('Y-m-d');
        $validityEnd   = date('Y-m-d', strtotime("+{$validity_period_years} year -1 day"));

        $clearanceDetails = [
            'certificate_number'         => $certNumber,
            'validity_start'             => $validityStart,
            'validity_end'               => $validityEnd,
            'validity_period_years'      => $validity_period_years,
            'issued_by_admin_id'         => $resolvedAdminId,
            'chair_name'                 => $resolvedChairName,
            'granted_at'                 => date('c'),
            'general_verification_notes' => $general_verification_notes,
            'verification_checklist'     => $verification_checklist
        ];

        $formData['clearance_details'] = $clearanceDetails;
        if (!isset($formData['clearance_history']) || !is_array($formData['clearance_history'])) {
            $formData['clearance_history'] = [];
        }
        $formData['clearance_history'][] = $clearanceDetails;

        // 4A. Update research_applications record
        $updateApp = "UPDATE research_applications 
                      SET status = 'Clearance Granted'::status_enum,
                          clearance_date = CURRENT_DATE,
                          form_data = :form_data::jsonb,
                          updated_at = CURRENT_TIMESTAMP
                      WHERE application_id = :application_id";
        $stmtUpdateApp = $db->prepare($updateApp);
        $stmtUpdateApp->execute([
            ':form_data'      => json_encode($formData),
            ':application_id' => $application_id
        ]);

        // 4B. Complete pending 'Revisions Verification' in application_history
        $verificationNote = !empty($general_verification_notes)
            ? $general_verification_notes
            : "All revised protocol documents and directives point-by-point matrix verified and satisfied.";

        $completeHist = "UPDATE application_history 
                         SET status = 'Completed'::history_status_enum,
                             date_completed = CURRENT_TIMESTAMP,
                             notes = :notes
                         WHERE application_id = :application_id 
                           AND process_point = 'Revisions Verification'::process_point_enum 
                           AND status = 'Pending'::history_status_enum";
        $stmtCompleteHist = $db->prepare($completeHist);
        $stmtCompleteHist->execute([
            ':notes'          => $verificationNote,
            ':application_id' => $application_id
        ]);

        // 4C. Insert 'Clearance Granted' terminal milestone in application_history
        $insertClearanceHist = "INSERT INTO application_history (
                                  application_id, process_point, status, proponent_name, date_completed, notes, attempt_no, is_rejected
                                ) VALUES (
                                  :application_id, 'Clearance Granted'::process_point_enum, 'Completed'::history_status_enum,
                                  :proponent_name, CURRENT_TIMESTAMP, :notes, :attempt_no, FALSE
                                )";
        $stmtClearanceHist = $db->prepare($insertClearanceHist);
        $stmtClearanceHist->execute([
            ':application_id' => $application_id,
            ':proponent_name' => $resolvedChairName,
            ':notes'          => "Certificate of Ethical Clearance issued for Protocol {$protocol_code} (Certificate No: {$certNumber}). Valid until " . date('F d, Y', strtotime($validityEnd)) . ".",
            ':attempt_no'     => $attemptNo
        ]);

        // 4D. Insert notification for applicant
        $notifSql = "INSERT INTO notifications (
                       application_id, recipient_type, recipient_id, title, message, notification_type, is_read, email_sent
                     ) VALUES (
                       :application_id, 'Applicant'::recipient_type_enum, :recipient_id,
                       'Ethical Clearance Granted',
                       :message,
                       'Clearance Granted'::notification_type_enum, FALSE, FALSE
                     )";
        $stmtNotif = $db->prepare($notifSql);
        $stmtNotif->execute([
            ':application_id' => $application_id,
            ':recipient_id'   => $applicant_id,
            ':message'        => "Your research protocol {$protocol_code} has successfully satisfied all committee directives and has been granted official Ethical Clearance (Certificate No: {$certNumber})."
        ]);

        $responseMessage = "Revisions verified successfully. Official Ethical Clearance has been granted.";
        $responseData = [
            "application_id"    => $application_id,
            "protocol_code"     => $protocol_code,
            "status"            => "Clearance Granted",
            "clearance_date"    => $validityStart,
            "clearance_details" => $clearanceDetails
        ];

    } else {
        // --- PATH B: REQUEST CLARIFICATION ---
        $newAppStatus = 'Decision Letter Issued';

        $clarificationRecord = [
            'attempt_no'             => $attemptNo,
            'requested_at'           => date('c'),
            'verified_by_admin_id'   => $resolvedAdminId,
            'chair_name'             => $resolvedChairName,
            'general_notes'          => $general_verification_notes,
            'verification_checklist' => $verification_checklist
        ];

        if (!isset($formData['clarification_requests']) || !is_array($formData['clarification_requests'])) {
            $formData['clarification_requests'] = [];
        }
        $formData['clarification_requests'][] = $clarificationRecord;

        // 4A. Update research_applications record
        $updateApp = "UPDATE research_applications 
                      SET status = 'Decision Letter Issued'::status_enum,
                          form_data = :form_data::jsonb, 
                          updated_at = CURRENT_TIMESTAMP
                      WHERE application_id = :application_id";
        $stmtUpdateApp = $db->prepare($updateApp);
        $stmtUpdateApp->execute([
            ':form_data'      => json_encode($formData),
            ':application_id' => $application_id
        ]);

        // 4B. Complete pending 'Revisions Verification' as rejected in application_history
        $rejectionNotes = !empty($general_verification_notes)
            ? $general_verification_notes
            : "Revisions incomplete or deficient. Returned to proponent for further clarification.";

        $completeHist = "UPDATE application_history 
                         SET status = 'Completed'::history_status_enum,
                             date_completed = CURRENT_TIMESTAMP,
                             is_rejected = TRUE,
                             notes = :notes
                         WHERE application_id = :application_id 
                           AND process_point = 'Revisions Verification'::process_point_enum 
                           AND status = 'Pending'::history_status_enum";
        $stmtCompleteHist = $db->prepare($completeHist);
        $stmtCompleteHist->execute([
            ':notes'          => $rejectionNotes,
            ':application_id' => $application_id
        ]);

        // 4C. Insert next pending 'Proponent Revisions' milestone for Attempt N+1
        $nextAttemptNo = $attemptNo + 1;
        $insertNextHist = "INSERT INTO application_history (
                             application_id, process_point, status, proponent_name, date_completed, notes, attempt_no, is_rejected
                           ) VALUES (
                             :application_id, 'Proponent Revisions'::process_point_enum, 'Pending'::history_status_enum,
                             :proponent_name, NULL, :notes, :attempt_no, FALSE
                           )";
        $stmtNextHist = $db->prepare($insertNextHist);
        $stmtNextHist->execute([
            ':application_id' => $application_id,
            ':proponent_name' => $applicant_name,
            ':notes'          => "Further protocol clarifications requested by Ethics Research Board Chair: " . $rejectionNotes,
            ':attempt_no'     => $nextAttemptNo
        ]);

        // 4D. Insert notification for applicant
        $notifSql = "INSERT INTO notifications (
                       application_id, recipient_type, recipient_id, title, message, notification_type, is_read, email_sent
                     ) VALUES (
                       :application_id, 'Applicant'::recipient_type_enum, :recipient_id,
                       'Further Protocol Clarifications Required',
                       :message,
                       'Revision Request'::notification_type_enum, FALSE, FALSE
                     )";
        $stmtNotif = $db->prepare($notifSql);
        $stmtNotif->execute([
            ':application_id' => $application_id,
            ':recipient_id'   => $applicant_id,
            ':message'        => "The Ethics Research Board Chair has reviewed your revised protocol and requested further clarifications. Please review the updated directives."
        ]);

        $responseMessage = "Revisions evaluated as deficient. Returned to proponent for round {$nextAttemptNo} clarification.";
        $responseData = [
            "application_id"        => $application_id,
            "protocol_code"         => $protocol_code,
            "status"                => "Decision Letter Issued",
            "next_attempt_no"       => $nextAttemptNo,
            "clarification_details" => $clarificationRecord
        ];
    }

    // 5. Calculate updated workflow flowchart milestone
    $milestone = calculatorFlowChartMilestone($newAppStatus);
    $responseData['milestone'] = $milestone;

    // Commit atomic transaction
    $db->commit();

    echo json_encode([
        "status"   => "success",
        "success"  => true,
        "action"   => $action,
        "message"  => $responseMessage,
        "data"     => $responseData
    ]);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
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
    http_response_code($e->getCode() >= 400 && $e->getCode() <= 500 ? $e->getCode() : 500);
    echo json_encode([
        "status"  => "error",
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
