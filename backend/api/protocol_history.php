<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

if (isset($_GET['application_id'])) {
    $application_id = $_GET['application_id'];

    $query = "SELECT process_point as \"processPoint\", status, proponent_name as \"proponentName\", 
                     TO_CHAR(date_completed, 'FMMonth DD, YYYY') as \"dateCompleted\" 
              FROM application_history 
              WHERE application_id = :application_id 
              ORDER BY created_at ASC";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':application_id', $application_id);
    $stmt->execute();

    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $history]);
} else {
    echo json_encode(['success' => false, 'message' => 'application_id is required']);
}
?>
