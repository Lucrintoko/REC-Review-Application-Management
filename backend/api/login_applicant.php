<?php 

// Importing of security rules and database connection
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

// Allow POST Requests only
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Only POST requests allowed"]);
    exit;
} 

// Decoding JSON Data from React
$data = json_decode(file_get_contents("php://input"));

// Checking for input boxes
if (!isset($data->email) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email and Password Required"]);
    exit;
}

try {
    // Connection to PostgreSQL
    $database = new Database();
    $db = $database->getConnection();

    // Searching applicant for their e-mail
    $stmt = $db->prepare("SELECT * FROM applicants WHERE email = :email LIMIT 1");
    $stmt->bindParam(':email', $data->email);
    $stmt->execute();
    $applicant = $stmt->fetch();

    // Verification for their password
    if ($applicant && password_verify($data->password, $applicant['password_hash'])) {

        // Sending user details to React but not the password
        http_response_code(200);
        echo json_encode([
            "status" => "success",
            "message" => "Login Successful",
            "user" => [
                "applicant_id" => $applicant['applicant_id'],
                "first_name" => $applicant['first_name'],
                "last_name" => $applicant['last_name'],
                "email"=> $applicant['email'],
                "department" => $applicant['department_agency']
            ]
        ]);
    } else {
        // Email does not exist or password is wrong
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid email or password"]);
    }

} catch (Exception $e) {
    // For database crashes
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server Error: " . $e->getMessage()]);
}
