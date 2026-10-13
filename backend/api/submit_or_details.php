<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Only POST requests allowed"]);
    exit;
} 

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->application_id) || !isset($data->or_number) || !isset($data->or_date) || !isset($data->amount)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Begin transaction
    $db->beginTransaction();
    
    // Update research_applications status
    $stmt1 = $db->prepare("UPDATE research_applications SET status = 'Payment Verified', updated_at = CURRENT_TIMESTAMP WHERE application_id = :app_id");
    $stmt1->bindParam(':app_id', $data->application_id);
    $stmt1->execute();
    
    // Insert or update payments table
    $stmt_check = $db->prepare("SELECT payment_id FROM payments WHERE application_id = :app_id");
    $stmt_check->bindParam(':app_id', $data->application_id);
    $stmt_check->execute();
    
    if ($stmt_check->rowCount() > 0) {
        $stmt2 = $db->prepare("UPDATE payments SET or_number = :or_no, payment_date = :or_date, amount = :amount, verification_notes = :notes, payment_status = 'Pending' WHERE application_id = :app_id");
    } else {
        $stmt2 = $db->prepare("INSERT INTO payments (application_id, amount, or_number, payment_date, verification_notes, payment_status) VALUES (:app_id, :amount, :or_no, :or_date, :notes, 'Pending')");
    }
    
    $notes = isset($data->notes) ? $data->notes : null;
    $stmt2->bindParam(':app_id', $data->application_id);
    $stmt2->bindParam(':amount', $data->amount);
    $stmt2->bindParam(':or_no', $data->or_number);
    $stmt2->bindParam(':or_date', $data->or_date);
    $stmt2->bindParam(':notes', $notes);
    $stmt2->execute();
    
    // Get applicant name for history
    $stmt3 = $db->prepare("SELECT a.first_name, a.last_name FROM applicants a JOIN research_applications r ON a.applicant_id = r.applicant_id WHERE r.application_id = :app_id LIMIT 1");
    $stmt3->bindParam(':app_id', $data->application_id);
    $stmt3->execute();
    $applicant = $stmt3->fetch(PDO::FETCH_ASSOC);
    $proponent_name = $applicant ? ($applicant['first_name'] . ' ' . $applicant['last_name']) : 'Unknown';
    
    // Update previous process point (Payment Required) to Completed and set the Applicant as the proponent
    $stmtUpdateHist = $db->prepare("UPDATE application_history SET status = 'Completed', date_completed = CURRENT_TIMESTAMP, proponent_name = :proponent_name WHERE application_id = :app_id AND process_point = 'Payment Required' AND status = 'Pending'");
    $stmtUpdateHist->bindParam(':app_id', $data->application_id);
    $stmtUpdateHist->bindParam(':proponent_name', $proponent_name);
    $stmtUpdateHist->execute();
    
    // Insert new process point (Payment Verification) with a pending secretariat placeholder
    $secretariat = '';
    $stmt4 = $db->prepare("INSERT INTO application_history (application_id, process_point, status, proponent_name, created_at) VALUES (:app_id, 'Payment Verification', 'Pending', :secretariat, CURRENT_TIMESTAMP)");
    $stmt4->bindParam(':app_id', $data->application_id);
    $stmt4->bindParam(':secretariat', $secretariat);
    $stmt4->execute();
    
    $db->commit();
    
    http_response_code(200);
    echo json_encode(["status" => "success", "message" => "OR Details submitted successfully"]);
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server Error: " . $e->getMessage()]);
}
?>
