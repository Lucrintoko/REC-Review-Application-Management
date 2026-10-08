<?php
/**
 * Main API Entry Point / Router
 * Research Ethics Review Application and Management System
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$request_method = $_SERVER['REQUEST_METHOD'];

// Health check / welcome endpoint
if ($request_method === 'GET' && (str_ends_with($request_uri, '/api') || str_ends_with($request_uri, '/api/'))) {
    echo json_encode([
        "status" => "success",
        "message" => "Research Ethics Review Application API is running",
        "version" => "1.0.0",
        "timestamp" => date("c")
    ]);
    exit;
}

// Applications endpoint - fetch all applications (optionally filtered by applicant_id)
$isApplicationsEndpoint = (
    str_ends_with($request_uri, '/applications') ||
    str_ends_with($request_uri, '/applications/') ||
    str_contains($request_uri, '/applications') ||
    (isset($_GET['action']) && $_GET['action'] === 'applications') ||
    (isset($_GET['endpoint']) && $_GET['endpoint'] === 'applications')
);

if ($request_method === 'GET' && $isApplicationsEndpoint) {
    try {
        $database = new Database();
        $db = $database->getConnection();

        $applicantId = isset($_GET['applicant_id']) ? intval($_GET['applicant_id']) : null;

        if ($applicantId) {
            $stmt = $db->prepare("SELECT application_id, protocol_code, applicant_id, research_title, 
                                         research_type, review_type, status, submission_date, 
                                         decision_date, clearance_date, created_at, updated_at, form_data
                                  FROM research_applications 
                                  WHERE applicant_id = :applicant_id 
                                  ORDER BY submission_date DESC, application_id DESC");
            $stmt->bindParam(':applicant_id', $applicantId, PDO::PARAM_INT);
        } else {
            $stmt = $db->prepare("SELECT application_id, protocol_code, applicant_id, research_title, 
                                         research_type, review_type, status, submission_date, 
                                         decision_date, clearance_date, created_at, updated_at, form_data
                                  FROM research_applications 
                                  ORDER BY submission_date DESC, application_id DESC");
        }

        $stmt->execute();
        $applications = $stmt->fetchAll();
        
        // Decode form_data for easier client-side parsing
        foreach ($applications as &$app) {
            if (isset($app['form_data']) && $app['form_data']) {
                $app['form_data'] = json_decode($app['form_data'], true);
            }
        }

        echo json_encode([
            "status" => "success",
            "count" => count($applications),
            "data" => $applications
        ]);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Failed to fetch applications: " . $e->getMessage()
        ]);
        exit;
    }
}

if ($request_method === 'POST' && $isApplicationsEndpoint) {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        $isMultipart = isset($_POST['payload']);
        if ($isMultipart) {
            $input = json_decode($_POST['payload'], true);
        } else {
            $input = json_decode(file_get_contents('php://input'), true);
        }
        
        $protocol_code = $input['protocol_code'] ?? 'REC-2026-XXXX';
        $research_title = $input['research_title'] ?? 'Untitled';
        $research_type = $input['research_type'] ?? 'Undergraduate';
        $review_type = $input['review_type'] ?? 'Undetermined';
        $status = $input['status'] ?? 'Draft';
        $submission_date = $input['submission_date'] ?? date('Y-m-d');
        
        $formDataSnapshot = $input['formDataSnapshot'] ?? null;

        // Process uploaded files if any
        if ($isMultipart && isset($_FILES['files'])) {
            $uploadDir = __DIR__ . '/../uploads/documents/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            
            $processFiles = function($nameArray, $tmpNameArray, $errorArray, &$targetSnapshot) use (&$processFiles, $uploadDir) {
                foreach ($nameArray as $key => $value) {
                    if (is_array($value)) {
                        if (!isset($targetSnapshot[$key])) $targetSnapshot[$key] = [];
                        $processFiles($value, $tmpNameArray[$key], $errorArray[$key], $targetSnapshot[$key]);
                    } else {
                        if ($errorArray[$key] === UPLOAD_ERR_OK) {
                            $tmpName = $tmpNameArray[$key];
                            $safeFileName = preg_replace('/[^a-zA-Z0-9.\-_]/', '', basename($value));
                            $uniqueFileName = time() . '_' . $safeFileName;
                            $destination = $uploadDir . $uniqueFileName;
                            if (move_uploaded_file($tmpName, $destination)) {
                                $targetSnapshot[$key]['savedPath'] = 'uploads/documents/' . $uniqueFileName;
                            }
                        }
                    }
                }
            };

            $processFiles($_FILES['files']['name'], $_FILES['files']['tmp_name'], $_FILES['files']['error'], $formDataSnapshot);
        }
        
        $form_data = $formDataSnapshot ? json_encode($formDataSnapshot) : null;
        
        $applicant_id = 1;

        $db->beginTransaction();

        $currentYear = date('Y');
        $prefix = $currentYear . "-";
        
        $codeStmt = $db->prepare("SELECT protocol_code FROM research_applications WHERE protocol_code LIKE :prefix ORDER BY protocol_code DESC LIMIT 1 FOR UPDATE");
        $codeStmt->execute([':prefix' => $prefix . '%']);
        $latestCode = $codeStmt->fetchColumn();

        if ($latestCode) {
            $parts = explode('-', $latestCode);
            $number = intval(end($parts));
            $nextNumber = str_pad($number + 1, 4, '0', STR_PAD_LEFT);
            $protocol_code = $prefix . $nextNumber;
        } else {
            $protocol_code = $prefix . "0001";
        }

        $stmt = $db->prepare("INSERT INTO research_applications 
            (protocol_code, applicant_id, research_title, research_type, review_type, status, submission_date, form_data)
            VALUES (:protocol_code, :applicant_id, :research_title, :research_type, :review_type, :status, :submission_date, :form_data)
            RETURNING application_id");
            
        $stmt->execute([
            ':protocol_code' => $protocol_code,
            ':applicant_id' => $applicant_id,
            ':research_title' => $research_title,
            ':research_type' => $research_type,
            ':review_type' => $review_type,
            ':status' => $status,
            ':submission_date' => $submission_date,
            ':form_data' => $form_data
        ]);
        
        $result = $stmt->fetch();
        $application_id = $result['application_id'];

        $historyStmt = $db->prepare("INSERT INTO application_history 
            (application_id, process_point, status, proponent_name)
            VALUES (:app_id, 'Initial Submission', 'Completed', 'Applicant')");
        $historyStmt->execute([
            ':app_id' => $application_id
        ]);

        $db->commit();

        echo json_encode([
            "status" => "success",
            "message" => "Application saved successfully",
            "application_id" => $application_id
        ]);
        exit;
    } catch (Exception $e) {
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
        }
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Failed to save application: " . $e->getMessage()
        ]);
        exit;
    }
}

// Router dispatching sample endpoints
http_response_code(404);
echo json_encode([
    "status" => "error",
    "message" => "Endpoint not found"
]);

