<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';

// Handle Preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Checks if its on POST Method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Only POST requests allowed"]);
    exit;
}

// Taking user input
$data = json_decode(file_get_contents("php://input"));

// Double check for missing fields
if (!isset($data->application_id) || !isset($data->review_type) || !isset($data->admin_id)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$validReviewTypes = ['Exempted', 'Expedited', 'Full Board'];
if (!in_array($data->review_type, $validReviewTypes)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid review type selected"]);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Utilize transaction to abide by Atomicity Principle
    $db->beginTransaction();

    $review_type = $data->review_type;
    $notes = isset($data->notes) ? $data->notes : null;
    $admin_id = intval($data->admin_id);
    $application_id = intval($data->application_id);

    // Get the Admin Name for proponent_name
    $getAdmin = "SELECT first_name, last_name FROM admins WHERE admin_id = :admin_id LIMIT 1";
    $stmtAdmin = $db->prepare($getAdmin);
    $stmtAdmin->execute([':admin_id' => $admin_id]);
    $adminRow = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
    $proponent_name = $adminRow ? $adminRow['first_name'] . ' ' . $adminRow['last_name'] : 'Unknown Admin';

    // Update Research Applications: Set review_type and change status to 'Under Review'
    $updateApp = "UPDATE research_applications 
                  SET review_type = :review_type, 
                      status = 'Under Review',
                      updated_at = CURRENT_TIMESTAMP
                  WHERE application_id = :application_id";
    $stmt1 = $db->prepare($updateApp);
    $stmt1->execute([
        ':review_type' => $review_type,
        ':application_id' => $application_id
    ]);

    // Update Application History (Mark 'Review Type Assessment' as Completed and attach notes)
    $updateHistory = "UPDATE application_history 
                      SET status = 'Completed', date_completed = CURRENT_TIMESTAMP, notes = :notes 
                      WHERE application_id = :application_id AND process_point = 'Review Type Assessment'";
    $stmt2 = $db->prepare($updateHistory);
    $stmt2->execute([
        ':notes' => $notes,
        ':application_id' => $application_id
    ]);

    // Insert new history step for 'Ethical Review'
    $insertHistory = "INSERT INTO application_history (application_id, process_point, status, proponent_name, created_at)
                      VALUES (:application_id, 'Ethical Review', 'Pending', :proponent_name, CURRENT_TIMESTAMP)";
    $stmt3 = $db->prepare($insertHistory);
    $stmt3->execute([
        ':application_id' => $application_id,
        ':proponent_name' => $proponent_name
    ]);

    // Commit all changes to the database safely
    $db->commit();
    echo json_encode(["success" => true, "message" => "Review type successfully assigned as " . $review_type]);

} catch (PDOException $e) {
    // If anything fails rollback all changes
    if (isset($db)) $db->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>
