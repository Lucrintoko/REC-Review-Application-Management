<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../config/database.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();

    $stmt = $db->query("
        SELECT admin_id, first_name, last_name, email, role, specialization
        FROM admins
        WHERE role IN ('Primary Reviewer', 'Non-Primary Reviewer', 'Ethics Chair')
        ORDER BY role, admin_id
    ");
    $reviewers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $primaryReviewers = [];
    $nonPrimaryReviewers = [];
    $chairs = [];

    foreach ($reviewers as $r) {
        if ($r['role'] === 'Primary Reviewer') {
            $primaryReviewers[] = $r;
        } elseif ($r['role'] === 'Non-Primary Reviewer') {
            $nonPrimaryReviewers[] = $r;
        } elseif ($r['role'] === 'Ethics Chair') {
            $chairs[] = $r;
        }
    }

    echo json_encode([
        "success" => true,
        "data" => [
            "all"         => $reviewers,
            "primary"     => $primaryReviewers,
            "non_primary" => $nonPrimaryReviewers,
            "chair"       => $chairs
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to fetch reviewers: " . $e->getMessage()
    ]);
}
