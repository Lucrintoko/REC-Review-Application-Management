<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';

// Create connection to database
$database = new Database();
$db = $database->getConnection();

// Only take GET Requests
if (isset($_GET['application_id'])) {
    // Forces data to be integer due to PHP defaulting data to String
    $application_id = intval($_GET['application_id']);

    // Turning the whole query to aliases for easier calling
    $query = "SELECT or_number as \"orNumber\", 
                     amount, 
                     TO_CHAR(payment_date, 'FMMonth DD, YYYY') as \"paymentDate\",
                     payment_status as \"paymentStatus\",
                     verification_notes as \"applicantNotes\"
              FROM payments 
              WHERE application_id = :application_id 
              LIMIT 1";

    $stmt = $db->prepare($query);
    $stmt->bindParam(':application_id', $application_id, PDO::PARAM_INT);
    
    // Checking if the payment was done
    try {
        $stmt->execute();
        $payment = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($payment) {
            echo json_encode(['success' => true, 'data' => $payment]);
        } else {
            // No payment found for this application yet
            echo json_encode(['success' => false, 'message' => 'No payment record found']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'application_id is required']);
}
?>
