<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/history_helper.php';

// Handle preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Only POST requests allowed"]);
    exit;
} 

// Ingestion: Support multipart/form-data ($_POST) with fallback to raw JSON
$application_id = null;
$or_number = null;
$or_date = null;
$amount = null;
$notes = null;

if (!empty($_POST)) {
    $application_id = isset($_POST['application_id']) ? intval($_POST['application_id']) : null;
    $or_number = isset($_POST['or_number']) ? trim((string)$_POST['or_number']) : null;
    $or_date = isset($_POST['or_date']) ? trim((string)$_POST['or_date']) : null;
    $amount = isset($_POST['amount']) ? trim((string)$_POST['amount']) : null;
    $notes = isset($_POST['notes']) ? trim((string)$_POST['notes']) : null;
} else {
    $rawInput = file_get_contents("php://input");
    $jsonData = json_decode($rawInput);
    if ($jsonData) {
        $application_id = isset($jsonData->application_id) ? intval($jsonData->application_id) : null;
        $or_number = isset($jsonData->or_number) ? trim((string)$jsonData->or_number) : null;
        $or_date = isset($jsonData->or_date) ? trim((string)$jsonData->or_date) : null;
        $amount = isset($jsonData->amount) ? trim((string)$jsonData->amount) : null;
        $notes = isset($jsonData->notes) ? trim((string)$jsonData->notes) : null;
    }
}

// Validate required metadata fields
if (!$application_id || empty($or_number) || empty($or_date) || empty($amount)) {
    http_response_code(400);
    echo json_encode([
        "status" => "error", 
        "message" => "Missing required fields: application_id, or_number, or_date, and amount are required."
    ]);
    exit;
}

$uploadedFile = null;
if (isset($_FILES['proof_of_payment']) && $_FILES['proof_of_payment']['error'] !== UPLOAD_ERR_NO_FILE) {
    $uploadedFile = $_FILES['proof_of_payment'];
} elseif (isset($_FILES['receipt_file']) && $_FILES['receipt_file']['error'] !== UPLOAD_ERR_NO_FILE) {
    $uploadedFile = $_FILES['receipt_file'];
}

$targetDestination = null;
$savedRelativePath = null;

try {
    $database = new Database();
    $db = $database->getConnection();

    // Check if an existing payment record exists
    $stmt_check = $db->prepare("SELECT payment_id, proof_of_payment FROM payments WHERE application_id = :app_id");
    $stmt_check->bindParam(':app_id', $application_id, PDO::PARAM_INT);
    $stmt_check->execute();
    $existingPayment = $stmt_check->fetch(PDO::FETCH_ASSOC);

    // Validate Picture Attachment
    if ($uploadedFile) {
        if ($uploadedFile['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "File upload error code: " . $uploadedFile['error']]);
            exit;
        }

        // 10MB limit guard
        $maxSizeBytes = 10 * 1024 * 1024;
        if ($uploadedFile['size'] > $maxSizeBytes) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "File size exceeds the 10 MB maximum limit."]);
            exit;
        }

        // Strict Image MIME magic-byte verification (JPG, PNG, WEBP only)
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($uploadedFile['tmp_name']);
        $allowedMimes = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp'
        ];

        if (!isset($allowedMimes[$mime])) {
            http_response_code(400);
            echo json_encode([
                "status" => "error", 
                "message" => "Invalid file type. Only image files (JPG, PNG, WEBP) are accepted for Official Receipts."
            ]);
            exit;
        }

        $ext = $allowedMimes[$mime];
        $uploadDir = __DIR__ . '/../uploads/payments/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $uniqueName = sprintf('or_%d_%d_%s.%s', $application_id, time(), bin2hex(random_bytes(4)), $ext);
        $targetDestination = $uploadDir . $uniqueName;
        $savedRelativePath = 'uploads/payments/' . $uniqueName;

        if (!move_uploaded_file($uploadedFile['tmp_name'], $targetDestination)) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to save uploaded receipt image to server disk."]);
            exit;
        }
    } else {
        // No file in this request: require a file if none exists in database
        if (!$existingPayment || empty($existingPayment['proof_of_payment'])) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "message" => "An Official Receipt image (JPG, PNG, WEBP) is required."
            ]);
            exit;
        }
        // Retain existing file if updating text only
        $savedRelativePath = $existingPayment['proof_of_payment'];
    }

    // Begin ACID transaction
    $db->beginTransaction();
    
    // 1. Update research_applications status to 'Payment Verified'
    $stmt1 = $db->prepare("UPDATE research_applications SET status = 'Payment Verified', updated_at = CURRENT_TIMESTAMP WHERE application_id = :app_id");
    $stmt1->bindParam(':app_id', $application_id, PDO::PARAM_INT);
    $stmt1->execute();
    
    // 2. Insert or update payments table
    if ($existingPayment) {
        $stmt2 = $db->prepare("UPDATE payments 
                               SET or_number = :or_no, 
                                   payment_date = :or_date, 
                                   amount = :amount, 
                                   verification_notes = :notes, 
                                   proof_of_payment = :proof, 
                                   payment_status = 'Pending' 
                               WHERE application_id = :app_id");
    } else {
        $stmt2 = $db->prepare("INSERT INTO payments 
                               (application_id, amount, or_number, payment_date, verification_notes, proof_of_payment, payment_status) 
                               VALUES (:app_id, :amount, :or_no, :or_date, :notes, :proof, 'Pending')");
    }
    
    $stmt2->bindParam(':app_id', $application_id, PDO::PARAM_INT);
    $stmt2->bindParam(':amount', $amount);
    $stmt2->bindParam(':or_no', $or_number);
    $stmt2->bindParam(':or_date', $or_date);
    $stmt2->bindParam(':notes', $notes);
    $stmt2->bindParam(':proof', $savedRelativePath);
    $stmt2->execute();
    
    // 3. Get applicant name for history
    $stmt3 = $db->prepare("SELECT a.first_name, a.last_name 
                           FROM applicants a 
                           JOIN research_applications r ON a.applicant_id = r.applicant_id 
                           WHERE r.application_id = :app_id 
                           LIMIT 1");
    $stmt3->bindParam(':app_id', $application_id, PDO::PARAM_INT);
    $stmt3->execute();
    $applicant = $stmt3->fetch(PDO::FETCH_ASSOC);
    $proponent_name = $applicant ? ($applicant['first_name'] . ' ' . $applicant['last_name']) : 'Unknown';
    
    // 4. Update previous process point (Payment Required) to Completed and set the Applicant as the proponent
    $stmtUpdateHist = $db->prepare("UPDATE application_history 
                                    SET status = 'Completed', 
                                        date_completed = CURRENT_TIMESTAMP, 
                                        proponent_name = :proponent_name 
                                    WHERE application_id = :app_id 
                                      AND process_point = 'Payment Required' 
                                      AND status = 'Pending'");
    $stmtUpdateHist->bindParam(':app_id', $application_id, PDO::PARAM_INT);
    $stmtUpdateHist->bindParam(':proponent_name', $proponent_name);
    $stmtUpdateHist->execute();
    
    // 5. Insert new process point (Payment Verification) with a pending secretariat placeholder using history_helper
    recordHistory($db, $application_id, 'Payment Verification', 'Pending', '', null, false);
    
    $db->commit();
    
    http_response_code(200);
    echo json_encode([
        "status" => "success", 
        "message" => "OR Details and Receipt Image submitted successfully",
        "data" => [
            "application_id" => $application_id,
            "or_number" => $or_number,
            "receipt_file_path" => $savedRelativePath
        ]
    ]);
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    // Transactional cleanup: delete uploaded file if DB transaction failed
    if ($targetDestination && file_exists($targetDestination)) {
        @unlink($targetDestination);
    }
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server Error: " . $e->getMessage()]);
}
?>