<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/history_helper.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            "status"  => "error",
            "success" => false,
            "message" => "Method not allowed. Only POST is accepted."
        ]);
        exit;
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!$data) {
        http_response_code(400);
        echo json_encode([
            "status"  => "error",
            "success" => false,
            "message" => "Invalid or empty JSON payload."
        ]);
        exit;
    }

    $application_id = isset($data['application_id']) ? intval($data['application_id']) : 0;
    if ($application_id <= 0) {
        http_response_code(400);
        echo json_encode([
            "status"  => "error",
            "success" => false,
            "message" => "Valid application_id is required."
        ]);
        exit;
    }

    $db = (new Database())->getConnection();
    $db->beginTransaction();

    // 1. Verify application existence
    $appStmt = $db->prepare("SELECT application_id, protocol_code, status, review_type, current_cycle, applicant_id, form_data FROM research_applications WHERE application_id = :id");
    $appStmt->execute([':id' => $application_id]);
    $app = $appStmt->fetch(PDO::FETCH_ASSOC);

    if (!$app) {
        $db->rollBack();
        http_response_code(404);
        echo json_encode([
            "status"  => "error",
            "success" => false,
            "message" => "Research application not found."
        ]);
        exit;
    }

    // 2. Resolve Chair ID & Name
    $chair_id = isset($data['chair_id']) ? intval($data['chair_id']) : 0;
    if ($chair_id <= 0) {
        $chairLookup = $db->query("SELECT admin_id FROM admins WHERE role IN ('Ethics Chair', 'Ethics Committee Chair', 'Ethics Research Board Chair') ORDER BY admin_id ASC LIMIT 1");
        $chairRow = $chairLookup->fetch(PDO::FETCH_ASSOC);
        $chair_id = $chairRow ? (int)$chairRow['admin_id'] : 1;
    }
    $stmtChairName = $db->prepare("SELECT first_name, last_name FROM admins WHERE admin_id = :aid");
    $stmtChairName->execute([':aid' => $chair_id]);
    $chairRowData = $stmtChairName->fetch(PDO::FETCH_ASSOC);
    $chairName = $chairRowData ? ($chairRowData['first_name'] . ' ' . $chairRowData['last_name']) : 'Ethics Research Board Chair';

    // 3. Extract and normalize payload fields
    $status = (isset($data['status']) && strtolower($data['status']) === 'finalized') ? 'Finalized' : 'Draft';
    
    $validRecommendations = [
        'Approved'                 => 'Approved',
        'Minor Revisions'          => 'Minor Revisions',
        'Minor Revisions Required' => 'Minor Revisions',
        'Major Revisions'          => 'Major Revisions',
        'Major Revision Required'  => 'Major Revisions',
        'Disapproved'              => 'Disapproved'
    ];
    $rawRec = $data['consolidated_recommendation'] ?? 'Minor Revisions';
    $recommendation = $validRecommendations[$rawRec] ?? 'Minor Revisions';

    $summary_notes           = isset($data['summary_notes']) ? trim($data['summary_notes']) : null;
    $directives_for_revisions = isset($data['directives_for_revisions']) ? trim($data['directives_for_revisions']) : null;
    $meeting_date             = !empty($data['meeting_date']) ? $data['meeting_date'] : null;

    $per_question_findings = isset($data['per_question_findings']) ? json_encode($data['per_question_findings']) : '{}';
    $actionable_directives = isset($data['actionable_directives']) ? json_encode($data['actionable_directives']) : '[]';
    $compliance_checklist  = isset($data['compliance_checklist']) ? json_encode($data['compliance_checklist']) : '{}';
    $reviewer_snapshots    = isset($data['reviewer_snapshots']) ? json_encode($data['reviewer_snapshots']) : '[]';
    $pdf_report_path       = !empty($data['pdf_report_path']) ? $data['pdf_report_path'] : null;
    $cycle_number          = isset($data['cycle_number']) && intval($data['cycle_number']) > 0 
        ? intval($data['cycle_number']) 
        : (int)($app['current_cycle'] ?? 1);

    // 4. Upsert into consolidated_evaluations
    $checkConsol = $db->prepare("
        SELECT consolidation_id, status 
        FROM consolidated_evaluations 
        WHERE application_id = :app_id AND cycle_number = :cycle
    ");
    $checkConsol->execute([
        ':app_id' => $application_id,
        ':cycle'  => $cycle_number
    ]);
    $existing = $checkConsol->fetch(PDO::FETCH_ASSOC);

    $finalizedTimestamp = ($status === 'Finalized') ? date('Y-m-d H:i:s') : null;

    if ($existing) {
        $consolidation_id = (int)$existing['consolidation_id'];
        $updateStmt = $db->prepare("
            UPDATE consolidated_evaluations
            SET chair_id = :chair_id,
                status = :status::consolidation_status_enum,
                consolidated_recommendation = :rec::recommendation_enum,
                summary_notes = :summary_notes,
                directives_for_revisions = :directives,
                meeting_date = :meeting_date,
                per_question_findings = :findings::jsonb,
                actionable_directives = :directives_json::jsonb,
                compliance_checklist = :checklist::jsonb,
                reviewer_snapshots = :snapshots::jsonb,
                pdf_report_path = COALESCE(:pdf_path, pdf_report_path),
                updated_at = CURRENT_TIMESTAMP,
                finalized_at = CASE WHEN :is_finalized THEN CURRENT_TIMESTAMP ELSE finalized_at END
            WHERE consolidation_id = :cid
        ");
        $updateStmt->execute([
            ':chair_id'        => $chair_id,
            ':status'          => $status,
            ':rec'             => $recommendation,
            ':summary_notes'   => $summary_notes,
            ':directives'      => $directives_for_revisions,
            ':meeting_date'    => $meeting_date,
            ':findings'        => $per_question_findings,
            ':directives_json' => $actionable_directives,
            ':checklist'       => $compliance_checklist,
            ':snapshots'       => $reviewer_snapshots,
            ':pdf_path'        => $pdf_report_path,
            ':is_finalized'    => ($status === 'Finalized'),
            ':cid'             => $consolidation_id
        ]);
    } else {
        $insertStmt = $db->prepare("
            INSERT INTO consolidated_evaluations (
                application_id,
                chair_id,
                cycle_number,
                status,
                consolidated_recommendation,
                summary_notes,
                directives_for_revisions,
                meeting_date,
                per_question_findings,
                actionable_directives,
                compliance_checklist,
                reviewer_snapshots,
                pdf_report_path,
                created_at,
                updated_at,
                finalized_at
            ) VALUES (
                :app_id,
                :chair_id,
                :cycle,
                :status::consolidation_status_enum,
                :rec::recommendation_enum,
                :summary_notes,
                :directives,
                :meeting_date,
                :findings::jsonb,
                :directives_json::jsonb,
                :checklist::jsonb,
                :snapshots::jsonb,
                :pdf_path,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP,
                :finalized_at
            ) RETURNING consolidation_id
        ");
        $insertStmt->execute([
            ':app_id'          => $application_id,
            ':chair_id'        => $chair_id,
            ':cycle'           => $cycle_number,
            ':status'          => $status,
            ':rec'             => $recommendation,
            ':summary_notes'   => $summary_notes,
            ':directives'      => $directives_for_revisions,
            ':meeting_date'    => $meeting_date,
            ':findings'        => $per_question_findings,
            ':directives_json' => $actionable_directives,
            ':checklist'       => $compliance_checklist,
            ':snapshots'       => $reviewer_snapshots,
            ':pdf_path'        => $pdf_report_path,
            ':finalized_at'    => $finalizedTimestamp
        ]);
        $consolidation_id = (int)$insertStmt->fetchColumn();
    }

    $newAppStatus = $app['status'];

    // 5. If Finalized, execute workflow transition (Clearance Granted if Approved, Decision Letter Issued if Revisions/Disapproved)
    if ($status === 'Finalized') {
        $protocol_code = $app['protocol_code'];
        // Strict Invariant: Only automatically grant clearance if recommendation is 'Approved' AND has NO revisions needed at all
        $hasRevisions = in_array($recommendation, ['Minor Revisions', 'Major Revisions']) || (!empty($directives_for_revisions) && trim($directives_for_revisions) !== '');
        $isApproved = ($recommendation === 'Approved' && !$hasRevisions);

        if ($isApproved) {
            $newAppStatus = 'Clearance Granted';
            $certNumber   = 'AdZU-REC-' . $protocol_code;
            $validityStart = date('Y-m-d');
            $validityEnd   = date('Y-m-d', strtotime('+1 year -1 day'));

            $clearanceDetails = [
                'certificate_number'         => $certNumber,
                'validity_start'             => $validityStart,
                'validity_end'               => $validityEnd,
                'validity_period_years'      => 1,
                'issued_by_admin_id'         => $chair_id,
                'chair_name'                 => $chairName,
                'granted_at'                 => date('c'),
                'general_verification_notes' => 'Ethical clearance automatically granted upon consolidated approval with zero revisions required.',
                'verification_checklist'     => []
            ];

            $formData = [];
            if (!empty($app['form_data'])) {
                $formData = is_string($app['form_data']) ? json_decode($app['form_data'], true) : $app['form_data'];
                if (!is_array($formData)) $formData = [];
            }
            $formData['clearance_details'] = $clearanceDetails;
            if (!isset($formData['clearance_history']) || !is_array($formData['clearance_history'])) {
                $formData['clearance_history'] = [];
            }
            $formData['clearance_history'][] = $clearanceDetails;

            $updateAppStmt = $db->prepare("
                UPDATE research_applications
                SET status = 'Clearance Granted'::status_enum,
                    decision_date = CURRENT_DATE,
                    clearance_date = CURRENT_DATE,
                    form_data = :form_data::jsonb,
                    updated_at = CURRENT_TIMESTAMP
                WHERE application_id = :app_id
            ");
            $updateAppStmt->execute([
                ':form_data' => json_encode($formData),
                ':app_id'    => $application_id
            ]);

            // Complete active 'Consolidation of Review' or 'Ethical Review' step in application_history
            $completeHistory = $db->prepare("
                UPDATE application_history
                SET status = 'Completed',
                    date_completed = CURRENT_TIMESTAMP,
                    notes = 'Consolidated evaluation approved without revisions by Ethics Research Board Chair.'
                WHERE application_id = :app_id 
                  AND process_point::text IN ('Consolidation of Review', 'Ethical Review')
                  AND status = 'Pending'
            ");
            $completeHistory->execute([':app_id' => $application_id]);

            // Insert 'Decision Issued' as Completed
            recordHistory(
                $db,
                $application_id,
                'Decision Issued',
                'Completed',
                $chairName,
                "Consolidated decision: Approved. Formal decision letter issued.",
                false
            );

            // Insert 'Clearance Granted' terminal milestone
            $insertClearanceHist = "INSERT INTO application_history (
                                      application_id, process_point, status, proponent_name, date_completed, notes, attempt_no, is_rejected
                                    ) VALUES (
                                      :application_id, 'Clearance Granted'::process_point_enum, 'Completed'::history_status_enum,
                                      :proponent_name, CURRENT_TIMESTAMP, :notes, :attempt_no, FALSE
                                    )";
            $stmtClearanceHist = $db->prepare($insertClearanceHist);
            $stmtClearanceHist->execute([
                ':application_id' => $application_id,
                ':proponent_name' => $chairName,
                ':notes'          => "Certificate of Ethical Clearance issued for Protocol {$protocol_code} (Certificate No: {$certNumber}). Valid until " . date('F d, Y', strtotime($validityEnd)) . ".",
                ':attempt_no'     => $cycle_number
            ]);

            // Notification for Applicant
            $applicant_id = $app['applicant_id'] ?? null;
            if ($applicant_id) {
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
                    ':message'        => "Congratulations! Your research protocol {$protocol_code} has been approved with no revisions required and granted official Ethical Clearance (Certificate No: {$certNumber})."
                ]);
            }
        } else {
            $newAppStatus = 'Decision Letter Issued';

            $updateAppStmt = $db->prepare("
                UPDATE research_applications
                SET status = :status::status_enum,
                    decision_date = CURRENT_DATE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE application_id = :app_id
            ");
            $updateAppStmt->execute([
                ':status' => $newAppStatus,
                ':app_id' => $application_id
            ]);

            // Mark active 'Consolidation of Review' or 'Ethical Review' step in application_history as Completed
            $completeHistory = $db->prepare("
                UPDATE application_history
                SET status = 'Completed',
                    date_completed = CURRENT_TIMESTAMP,
                    notes = 'Consolidation evaluation synthesized and finalized by Ethics Research Board Chair.'
                WHERE application_id = :app_id 
                  AND process_point::text IN ('Consolidation of Review', 'Ethical Review')
                  AND status = 'Pending'
            ");
            $completeHistory->execute([':app_id' => $application_id]);

            // Spawn next process point: 'Decision Issued'
            recordHistory(
                $db,
                $application_id,
                'Decision Issued',
                'Pending',
                $chairName,
                "Consolidated decision: {$recommendation}. Formal decision letter generated.",
                false
            );
        }
    }

    $db->commit();

    $milestone = calculatorFlowChartMilestone($newAppStatus);

    echo json_encode([
        "status"           => "success",
        "success"          => true,
        "message"          => ($status === 'Finalized')
            ? ($recommendation === 'Approved'
                ? "Consolidation evaluation finalized and official Ethical Clearance successfully granted."
                : "Consolidation evaluation finalized and decision letter workflow initiated.")
            : "Consolidation synthesis draft saved successfully.",
        "consolidation_id" => $consolidation_id,
        "status_saved"     => $status,
        "recommendation"   => $recommendation,
        "new_app_status"   => $newAppStatus,
        "milestone"        => $milestone
    ]);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
