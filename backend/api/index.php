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
                                         decision_date, clearance_date, created_at, updated_at
                                  FROM research_applications 
                                  WHERE applicant_id = :applicant_id 
                                  ORDER BY submission_date DESC, application_id DESC");
            $stmt->bindParam(':applicant_id', $applicantId, PDO::PARAM_INT);
        } else {
            $stmt = $db->prepare("SELECT application_id, protocol_code, applicant_id, research_title, 
                                         research_type, review_type, status, submission_date, 
                                         decision_date, clearance_date, created_at, updated_at
                                  FROM research_applications 
                                  ORDER BY submission_date DESC, application_id DESC");
        }

        $stmt->execute();
        $applications = $stmt->fetchAll();

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

// Router dispatching sample endpoints
http_response_code(404);
echo json_encode([
    "status" => "error",
    "message" => "Endpoint not found"
]);
