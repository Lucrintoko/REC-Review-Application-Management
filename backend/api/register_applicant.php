<?php

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Only POST requests allowed"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$requiredFields = [
    'first_name',
    'last_name',
    'email',
    'password',
    'contact_number',
    'affiliation_type',
    'department_agency',
];

foreach ($requiredFields as $field) {
    if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "All required fields must be provided."]);
        exit;
    }
}

$email = strtolower(trim($data['email']));
$affiliationType = trim($data['affiliation_type']);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Please provide a valid email address."]);
    exit;
}

if (!in_array($affiliationType, ['Internal', 'External'], true)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Please select a valid affiliation type."]);
    exit;
}

if (strlen($data['password']) < 8) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Password must be at least 8 characters long."]);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();

    $existingStmt = $db->prepare("SELECT applicant_id FROM applicants WHERE LOWER(email) = :email LIMIT 1");
    $existingStmt->execute([':email' => $email]);
    if ($existingStmt->fetch()) {
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "An account with this email already exists."]);
        exit;
    }

    $stmt = $db->prepare(
        "INSERT INTO applicants
            (first_name, last_name, email, password_hash, contact_number, affiliation_type, department_agency)
         VALUES
            (:first_name, :last_name, :email, :password_hash, :contact_number, :affiliation_type, :department_agency)
         RETURNING applicant_id"
    );
    $stmt->execute([
        ':first_name' => trim($data['first_name']),
        ':last_name' => trim($data['last_name']),
        ':email' => $email,
        ':password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
        ':contact_number' => trim($data['contact_number']),
        ':affiliation_type' => $affiliationType,
        ':department_agency' => trim($data['department_agency']),
    ]);

    http_response_code(201);
    echo json_encode([
        "status" => "success",
        "message" => "Applicant account created successfully.",
        "applicant_id" => $stmt->fetchColumn(),
    ]);
} catch (PDOException $e) {
    if ($e->getCode() === '23505') {
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "An account with this email already exists."]);
        exit;
    }

    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Unable to create the account. Please try again."]);
}
