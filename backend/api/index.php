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

// Router dispatching sample endpoints
http_response_code(404);
echo json_encode([
    "status" => "error",
    "message" => "Endpoint not found"
]);
