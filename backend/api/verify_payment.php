<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
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
if (!isset($data->application_id) || !isset($data->status) || !isset($data->admin_id)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Utilize transaction to abide by Atomicity Principle in ACID Principle
    $db->beginTransaction();

    $newPaymentStatus = $data->status; // 'Verified' or 'Rejected'
    $notes = isset($data->notes) ? $data->notes : null;
    $admin_id = intval($data->admin_id);
    $application_id = intval($data->application_id);

    // Update Payments Table
    $updatePayment = "UPDATE payments 
                      SET payment_status = :status, 
                          verified_by_admin_id = :admin_id, 
                          verification_notes = :notes, 
                          verified_at = CURRENT_TIMESTAMP 
                      WHERE application_id = :application_id";
    $stmt1 = $db->prepare($updatePayment);
    $stmt1->execute([
        ':status' => $newPaymentStatus,
        ':admin_id' => $admin_id,
        ':notes' => $notes,
        ':application_id' => $application_id
    ]);

    // Update Research Applications Status
    // If verified proceeds to Determining Review Type. If rejected proceed to Payment Pending.
    $newAppStatus = ($newPaymentStatus === 'Verified') ? 'Determining Review Type' : 'Payment Pending';
    
    $updateApp = "UPDATE research_applications 
                  SET status = :app_status 
                  WHERE application_id = :application_id";
    $stmt2 = $db->prepare($updateApp);
    $stmt2->execute([
        ':app_status' => $newAppStatus,
        ':application_id' => $application_id
    ]);

    // Get the Admin Name for proponent_name
    $getAdmin = "SELECT first_name, last_name FROM admins WHERE admin_id = :admin_id LIMIT 1";
    $stmtAdmin = $db->prepare($getAdmin);
    $stmtAdmin->execute([':admin_id' => $admin_id]);
    $adminRow = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
    $proponent_name = $adminRow ? $adminRow['first_name'] . ' ' . $adminRow['last_name'] : 'Unknown Admin';

    // Update Application History (Mark 'Payment Verification' as Completed and set admin name)
    if ($newPaymentStatus === 'Verified') {
        $updateHistory = "UPDATE application_history 
                          SET status = 'Completed', date_completed = CURRENT_TIMESTAMP, proponent_name = :proponent_name
                          WHERE application_id = :application_id AND process_point = 'Payment Verification' AND status = 'Pending'";
        $stmt3 = $db->prepare($updateHistory);
        $stmt3->execute([
            ':application_id' => $application_id,
            ':proponent_name' => $proponent_name
        ]);

        // Insert new history step for Review Type Assessment
        $chairPlaceholder = '';
        $insertHistory = "INSERT INTO application_history (application_id, process_point, status, proponent_name, created_at)
                          VALUES (:application_id, 'Review Type Assessment', 'Pending', :chair_placeholder, CURRENT_TIMESTAMP)";
        $stmt4 = $db->prepare($insertHistory);
        $stmt4->execute([
            ':application_id' => $application_id,
            ':chair_placeholder' => $chairPlaceholder
        ]);
    }

    // Commit all changes to the database safely
    $db->commit();
    echo json_encode(["success" => true, "message" => "Payment successfully " . strtolower($newPaymentStatus)]);

} catch (PDOException $e) {
    // If anything fails rollback all changes
    if (isset($db)) $db->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>
