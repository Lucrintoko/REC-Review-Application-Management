<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/history_helper.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(["status" => "error", "success" => false, "message" => "Method not allowed. Only POST is accepted."]);
        exit;
    }

    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput);

    if (!$data) {
        http_response_code(400);
        echo json_encode(["status" => "error", "success" => false, "message" => "Invalid or empty JSON payload."]);
        exit;
    }

    $application_id = isset($data->application_id) ? intval($data->application_id) : 0;
    $reviewer_id    = isset($data->reviewer_id) ? intval($data->reviewer_id) : 0;
    $recommendation = isset($data->recommendation) ? trim($data->recommendation) : '';
    $comments       = isset($data->comments) ? trim($data->comments) : '';
    $formData       = isset($data->form_data) ? $data->form_data : null;

    if ($application_id <= 0 || $reviewer_id <= 0) {
        http_response_code(400);
        echo json_encode(["status" => "error", "success" => false, "message" => "Valid application_id and reviewer_id are required."]);
        exit;
    }

    // Map recommendation variants to valid recommendation_enum values
    $validRecommendations = [
        'Approved'                 => 'Approved',
        'Minor Revisions'          => 'Minor Revisions',
        'Minor Revisions Required' => 'Minor Revisions',
        'Major Revisions'          => 'Major Revisions',
        'Major Revision Required'  => 'Major Revisions',
        'Disapproved'              => 'Disapproved'
    ];

    if (!isset($validRecommendations[$recommendation])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "success" => false, "message" => "Invalid recommendation decision: " . htmlspecialchars($recommendation)]);
        exit;
    }

    $mappedRecommendation = $validRecommendations[$recommendation];

    $db = (new Database())->getConnection();
    $db->beginTransaction();

    // 0. Fetch application details to check current cycle & appeal status
    $appStmt = $db->prepare("SELECT current_cycle, is_appealed, status FROM research_applications WHERE application_id = :app_id");
    $appStmt->execute([':app_id' => $application_id]);
    $appRow = $appStmt->fetch(PDO::FETCH_ASSOC);

    if (!$appRow) {
        $db->rollBack();
        http_response_code(404);
        echo json_encode(["status" => "error", "success" => false, "message" => "Research application not found."]);
        exit;
    }

    $current_cycle = isset($data->cycle_number) && intval($data->cycle_number) > 0 
        ? intval($data->cycle_number) 
        : (int)($appRow['current_cycle'] ?? 1);

    // 1. Verify that the reviewer is assigned to this protocol for the active cycle
    $checkReviewerStmt = $db->prepare("
        SELECT review_id, reviewer_role, review_status 
        FROM protocol_reviews 
        WHERE application_id = :app_id AND reviewer_id = :rev_id AND cycle_number = :cycle_number
    ");
    $checkReviewerStmt->execute([
        ':app_id'       => $application_id,
        ':rev_id'       => $reviewer_id,
        ':cycle_number' => $current_cycle
    ]);
    $existingReview = $checkReviewerStmt->fetch(PDO::FETCH_ASSOC);

    if (!$existingReview) {
        $db->rollBack();
        http_response_code(403);
        echo json_encode(["status" => "error", "success" => false, "message" => "Reviewer is not assigned to evaluate this research protocol for Cycle " . $current_cycle . "."]);
        exit;
    }

    // 2. Update protocol_reviews table for active cycle
    $updateReviewStmt = $db->prepare("
        UPDATE protocol_reviews
        SET review_status = 'Completed',
            completed_date = CURRENT_DATE,
            recommendation = :recommendation::recommendation_enum,
            comments = :comments,
            form_data = :form_data
        WHERE application_id = :app_id AND reviewer_id = :rev_id AND cycle_number = :cycle_number
    ");

    $updateReviewStmt->execute([
        ':recommendation' => $mappedRecommendation,
        ':comments'       => $comments,
        ':form_data'      => json_encode($formData),
        ':app_id'         => $application_id,
        ':rev_id'         => $reviewer_id,
        ':cycle_number'   => $current_cycle
    ]);

    // 3. Check committee completion condition for active cycle
    $countStmt = $db->prepare("
        SELECT 
            COUNT(*)::int AS total_assigned,
            COUNT(CASE WHEN review_status = 'Completed' THEN 1 END)::int AS total_completed
        FROM protocol_reviews
        WHERE application_id = :app_id AND cycle_number = :cycle_number
    ");
    $countStmt->execute([
        ':app_id'       => $application_id,
        ':cycle_number' => $current_cycle
    ]);
    $reviewCounts = $countStmt->fetch(PDO::FETCH_ASSOC);

    $totalAssigned  = (int)($reviewCounts['total_assigned'] ?? 0);
    $totalCompleted = (int)($reviewCounts['total_completed'] ?? 0);
    $allCompleted   = ($totalAssigned > 0 && $totalAssigned === $totalCompleted);

    $newAppStatus = 'Ongoing Review';

    // 4. If all assigned reviewers have submitted, transition protocol to 'Consolidation of Evaluation'
    if ($allCompleted) {
        $newAppStatus = 'Consolidation of Evaluation';

        // Update application status
        $updateAppStmt = $db->prepare("
            UPDATE research_applications
            SET status = :status,
                updated_at = CURRENT_TIMESTAMP
            WHERE application_id = :app_id
        ");
        $updateAppStmt->execute([
            ':status' => $newAppStatus,
            ':app_id' => $application_id
        ]);

        // Complete active 'Ethical Review' or 'Appeal Re-deliberation' step in application_history
        $completeHistoryStmt = $db->prepare("
            UPDATE application_history
            SET status = 'Completed',
                date_completed = CURRENT_TIMESTAMP,
                notes = CASE 
                    WHEN process_point = 'Appeal Re-deliberation' THEN 'All assigned committee reviews for Cycle 2 appeal completed.'
                    ELSE 'All assigned committee reviews completed.'
                END
            WHERE application_id = :app_id 
              AND process_point IN ('Ethical Review', 'Appeal Re-deliberation') 
              AND status = 'Pending'
        ");
        $completeHistoryStmt->execute([':app_id' => $application_id]);

        // Spawn next process point: 'Consolidation of Review'
        recordHistory(
            $db,
            $application_id,
            'Consolidation of Review',
            'Pending',
            'Ethics Committee Chair',
            ($current_cycle > 1 ? "Cycle {$current_cycle} " : "") . 'All committee reviews completed. Awaiting Chair consolidation synthesis.',
            false
        );
    }

    $db->commit();

    $milestone = calculatorFlowChartMilestone($newAppStatus);

    echo json_encode([
        "status"          => "success",
        "success"         => true,
        "message"         => $allCompleted
            ? "Evaluation recorded. All assigned committee reviews are now complete! Protocol transitioned to Consolidation of Evaluation."
            : "Evaluation worksheet successfully recorded.",
        "all_completed"   => $allCompleted,
        "completed_count" => $totalCompleted,
        "total_count"     => $totalAssigned,
        "new_status"      => $newAppStatus,
        "milestone"       => $milestone
    ]);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "success" => false, "message" => "Database error: " . $e->getMessage()]);
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "success" => false, "message" => "Server error: " . $e->getMessage()]);
}
?>
