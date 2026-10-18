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
    $appStmt = $db->prepare("SELECT application_id, protocol_code, status, review_type, current_cycle FROM research_applications WHERE application_id = :id");
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

    // 2. Resolve Chair ID
    $chair_id = isset($data['chair_id']) ? intval($data['chair_id']) : 0;
    if ($chair_id <= 0) {
        $chairLookup = $db->query("SELECT admin_id FROM admins WHERE role IN ('Ethics Chair', 'Ethics Committee Chair') ORDER BY admin_id ASC LIMIT 1");
        $chairRow = $chairLookup->fetch(PDO::FETCH_ASSOC);
        $chair_id = $chairRow ? (int)$chairRow['admin_id'] : 1;
    }

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

    // 5. If Finalized, execute workflow transition to 'Decision Letter Issued'
    if ($status === 'Finalized') {
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
                notes = 'Consolidation evaluation synthesized and finalized by Ethics Committee Chair.'
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
            'Ethics Committee Chair',
            "Consolidated decision: {$recommendation}. Formal decision letter generated.",
            false
        );
    }

    $db->commit();

    $milestone = calculatorFlowChartMilestone($newAppStatus);

    echo json_encode([
        "status"           => "success",
        "success"          => true,
        "message"          => ($status === 'Finalized')
            ? "Consolidation evaluation finalized and decision letter workflow initiated."
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
