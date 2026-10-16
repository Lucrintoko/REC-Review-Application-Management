<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/history_helper.php';

$database = new Database();
$db = $database->getConnection();

if (isset($_GET['application_id'])) {
    $application_id = (int)$_GET['application_id'];

    // 1. Fetch current application status for milestone progress calculation
    $appStmt = $db->prepare("SELECT status FROM research_applications WHERE application_id = :id");
    $appStmt->execute([':id' => $application_id]);
    $appStatus = $appStmt->fetchColumn() ?: 'Protocols Submitted';

    // Calculate official Flowchart Milestone (1-9) and percentage
    $milestone = calculatorFlowChartMilestone($appStatus);

    // 2. Fetch all protocol history entries
    $query = "SELECT process_point as \"processPoint\", 
                     status, 
                     proponent_name as \"proponentName\", 
                     TO_CHAR(date_completed, 'FMMonth DD, YYYY') as \"dateCompleted\",
                     notes,
                     attempt_no as \"attemptNo\",
                     is_rejected as \"isRejected\"
              FROM application_history 
              WHERE application_id = :application_id 
              ORDER BY history_id ASC";

    $stmt = $db->prepare($query);
    $stmt->execute([':application_id' => $application_id]);
    $historyRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format the process point labels with zero padding (e.g. "Payment Verification - 01")
    $formattedHistory = array_map(function($row) {
        $attempt = (int)($row['attemptNo'] ?? 1);
        $row['processPointFormatted'] = sprintf("%s - %02d", $row['processPoint'], $attempt);
        $row['isRejected'] = (bool)($row['isRejected'] ?? false);
        return $row;
    }, $historyRows);

    echo json_encode([
        'success'   => true, 
        'milestone' => $milestone,
        'data'      => $formattedHistory
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'application_id is required']);
}
?>
