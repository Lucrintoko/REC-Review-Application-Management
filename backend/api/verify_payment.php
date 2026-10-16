<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/history_helper.php';

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

    // 1. Update Payments Table
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

    // 2. Update Research Applications Status
    // If verified proceeds to Type of Review. If rejected returns to Payment Pending.
    $newAppStatus = ($newPaymentStatus === 'Verified') ? 'Type of Review' : 'Payment Pending';
    
    $updateApp = "UPDATE research_applications 
                  SET status = :app_status 
                  WHERE application_id = :application_id";
    $stmt2 = $db->prepare($updateApp);
    $stmt2->execute([
        ':app_status' => $newAppStatus,
        ':application_id' => $application_id
    ]);

    // 3. Get the Admin Name for proponent_name
    $getAdmin = "SELECT first_name, last_name FROM admins WHERE admin_id = :admin_id LIMIT 1";
    $stmtAdmin = $db->prepare($getAdmin);
    $stmtAdmin->execute([':admin_id' => $admin_id]);
    $adminRow = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
    $proponent_name = $adminRow ? $adminRow['first_name'] . ' ' . $adminRow['last_name'] : 'Unknown Admin';

    // 4. Update the active 'Payment Verification' history record
    $checkPending = "SELECT history_id FROM application_history 
                     WHERE application_id = :application_id 
                       AND process_point = 'Payment Verification' 
                       AND status = 'Pending' 
                     ORDER BY history_id DESC LIMIT 1";
    $stmtCheck = $db->prepare($checkPending);
    $stmtCheck->execute([':application_id' => $application_id]);
    $pendingHistoryId = $stmtCheck->fetchColumn();

    $isRejected = ($newPaymentStatus === 'Rejected');

    if ($pendingHistoryId) {
        $updateHistory = "UPDATE application_history 
                          SET status = 'Completed', 
                              date_completed = CURRENT_TIMESTAMP, 
                              proponent_name = :proponent_name,
                              notes = :notes,
                              is_rejected = :is_rejected::boolean
                          WHERE history_id = :history_id";
        $stmtUpdate = $db->prepare($updateHistory);
        $stmtUpdate->execute([
            ':proponent_name' => $proponent_name,
            ':notes'          => $notes,
            ':is_rejected'    => $isRejected ? 'true' : 'false',
            ':history_id'     => $pendingHistoryId
        ]);
    } else {
        // Fallback: If no pending row was found, record it directly using helper
        recordHistory(
            $db, 
            $application_id, 
            'Payment Verification', 
            'Completed', 
            $proponent_name, 
            $notes, 
            $isRejected
        );
    }

    // 5. Spawn the next workflow milestone step using history_helper
    if ($newPaymentStatus === 'Verified') {
        // Forward progression: spawn next step for Review Type Assessment
        recordHistory($db, $application_id, 'Review Type Assessment', 'Pending', '', null, false);
    } else {
        // Rejection loop: get applicant name and spawn attempt 02 of Payment Required
        $getApplicant = "SELECT a.first_name, a.last_name 
                         FROM applicants a 
                         JOIN research_applications r ON r.applicant_id = a.applicant_id 
                         WHERE r.application_id = :application_id LIMIT 1";
        $stmtApp = $db->prepare($getApplicant);
        $stmtApp->execute([':application_id' => $application_id]);
        $applicantRow = $stmtApp->fetch(PDO::FETCH_ASSOC);
        $applicant_name = $applicantRow ? $applicantRow['first_name'] . ' ' . $applicantRow['last_name'] : 'Applicant';

        recordHistory(
            $db, 
            $application_id, 
            'Payment Required', 
            'Pending', 
            $applicant_name, 
            $notes ?: 'Payment rejected. Awaiting new official receipt details.', 
            false
        );
    }

    // Commit all changes to the database safely
    $db->commit();

    // Calculate milestone progress percentage for response
    $milestone = calculatorFlowChartMilestone($newAppStatus);

    echo json_encode([
        "success"   => true, 
        "message"   => "Payment successfully " . strtolower($newPaymentStatus),
        "status"    => $newAppStatus,
        "milestone" => $milestone
    ]);

} catch (PDOException $e) {
    // If anything fails rollback all changes
    if (isset($db)) $db->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>
