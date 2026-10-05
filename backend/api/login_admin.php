<?php 

// Importing of security rules and database connection
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

// Allow POST Requests only
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status:" => "erorr", "message" => "Only POST requests allowed"]);
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
    // Connection to MariaDB
    $database = new Database();
    $db = $database->getConnection();

    // Searching admin for their e-mail
    $stmt = $db->prepare("SELECT * FROM admins WHERE email = :email LIMIT 1");
    $stmt->bindParam(':email', $data->email);
    $stmt->execute();
    $admin = $stmt->fetch();

    // Verification for their password
    if ($admin && password_verify($data->password, $admin['password_hash'])) {

        // Sending user details to React but not the password
        http_response_code(200);
        echo json_encode([
            "status" => "success",
            "message" => "Login Successful",
            "user" => [
                "admin_id" => $admin['admin_id'],
                "first_name" => $admin['first_name'],
                "last_name" => $admin['last_name'],
                "email"=> $admin['email'],
                "role" => $admin['role']
            ]
        ]);
    } else {
        // Email does not exist or password is wrong
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid email or password"]);
    }

} catch (Exception $e) {
    // For database crashes
    http_response_code(508);
    echo json_encode(["status" => "error", "message" => "Server Error: " . $e->getMessage()]);
}