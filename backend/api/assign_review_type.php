<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
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
if (!isset($data->application_id) || !isset($data->admin_id)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$action = isset($data->action) ? $data->action : (isset($data->review_type) && in_array($data->review_type, ['Exempted', 'Expedited', 'Full Board']) ? 'Assign' : null);
$isRejection = ($action === 'Reject' || (isset($data->status) && $data->status === 'Rejected') || (isset($data->review_type) && $data->review_type === 'Rejected'));

if (!$isRejection) {
    if (!isset($data->review_type)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing review_type"]);
        exit;
    }
    $validReviewTypes = ['Exempted', 'Expedited', 'Full Board'];
    if (!in_array($data->review_type, $validReviewTypes)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid review type selected"]);
        exit;
    }
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Utilize transaction to abide by Atomicity Principle
    $db->beginTransaction();

    $notes = isset($data->notes) ? $data->notes : null;
    $admin_id = intval($data->admin_id);
    $application_id = intval($data->application_id);

    // Get Admin Name for proponent_name
    $getAdmin = "SELECT first_name, last_name FROM admins WHERE admin_id = :admin_id LIMIT 1";
    $stmtAdmin = $db->prepare($getAdmin);
    $stmtAdmin->execute([':admin_id' => $admin_id]);
    $adminRow = $stmtAdmin->fetch(PDO::FETCH_ASSOC);
    $proponent_name = $adminRow ? $adminRow['first_name'] . ' ' . $adminRow['last_name'] : 'Ethics Chair';

    // Get Applicant Name for proponent tracking on resubmission step
    $getApplicant = "SELECT a.first_name, a.last_name 
                     FROM applicants a 
                     JOIN research_applications r ON r.applicant_id = a.applicant_id 
                     WHERE r.application_id = :application_id LIMIT 1";
    $stmtApp = $db->prepare($getApplicant);
    $stmtApp->execute([':application_id' => $application_id]);
    $applicantRow = $stmtApp->fetch(PDO::FETCH_ASSOC);
    $applicant_name = $applicantRow ? $applicantRow['first_name'] . ' ' . $applicantRow['last_name'] : 'Applicant';

    // 1. Find the active/pending 'Review Type Assessment' history row
    $findPending = "SELECT history_id FROM application_history 
                    WHERE application_id = :application_id 
                      AND process_point = 'Review Type Assessment' 
                      AND status = 'Pending' 
                    ORDER BY history_id DESC LIMIT 1";
    $stmtFind = $db->prepare($findPending);
    $stmtFind->execute([':application_id' => $application_id]);
    $pendingHistoryId = $stmtFind->fetchColumn();

    if ($isRejection) {
        // Rejection / Return for Revision Branch:
        // Payment is ALREADY VERIFIED and remains completely untouched.
        $newAppStatus = 'Type of Review';

        $updateApp = "UPDATE research_applications 
                      SET updated_at = CURRENT_TIMESTAMP
                      WHERE application_id = :application_id";
        $stmtAppUpdate = $db->prepare($updateApp);
        $stmtAppUpdate->execute([':application_id' => $application_id]);

        // Complete the Review Type Assessment row as rejected
        if ($pendingHistoryId) {
            $updateHistory = "UPDATE application_history 
                              SET status = 'Completed', 
                                  date_completed = CURRENT_TIMESTAMP, 
                                  proponent_name = :proponent_name,
                                  notes = :notes,
                                  is_rejected = TRUE
                              WHERE history_id = :history_id";
            $stmtUpdate = $db->prepare($updateHistory);
            $stmtUpdate->execute([
                ':proponent_name' => $proponent_name,
                ':notes'          => $notes,
                ':history_id'     => $pendingHistoryId
            ]);
        } else {
            recordHistory($db, $application_id, 'Review Type Assessment', 'Completed', $proponent_name, $notes, true);
        }

        // Spawn next step for Applicant Protocol Revision using history_helper
        recordHistory(
            $db,
            $application_id,
            'Protocol Revision',
            'Pending',
            $applicant_name,
            $notes ?: 'Review type assessment rejected. Awaiting applicant revisions.',
            false
        );

        $message = "Application returned for revision/modification.";
    } else {
        // Assignment / Acceptance Branch:
        $review_type = $data->review_type;
        $newAppStatus = 'Ongoing Review';

        // Update Research Applications: Set review_type and status to 'Ongoing Review'
        $updateApp = "UPDATE research_applications 
                      SET review_type = :review_type, 
                          status = :status,
                          updated_at = CURRENT_TIMESTAMP
                      WHERE application_id = :application_id";
        $stmt1 = $db->prepare($updateApp);
        $stmt1->execute([
            ':review_type'    => $review_type,
            ':status'         => $newAppStatus,
            ':application_id' => $application_id
        ]);

        // Complete the Review Type Assessment row as completed (not rejected)
        if ($pendingHistoryId) {
            $updateHistory = "UPDATE application_history 
                              SET status = 'Completed', 
                                  date_completed = CURRENT_TIMESTAMP, 
                                  proponent_name = :proponent_name,
                                  notes = :notes,
                                  is_rejected = FALSE
                              WHERE history_id = :history_id";
            $stmtUpdate = $db->prepare($updateHistory);
            $stmtUpdate->execute([
                ':proponent_name' => $proponent_name,
                ':notes'          => $notes,
                ':history_id'     => $pendingHistoryId
            ]);
        } else {
            recordHistory($db, $application_id, 'Review Type Assessment', 'Completed', $proponent_name, $notes, false);
        }

        // Spawn next history step for 'Ethical Review' using history_helper
        recordHistory($db, $application_id, 'Ethical Review', 'Pending', '', null, false);

        // ---------------------------------------------------------------------
        // Reviewer Assignment Logic for protocol_reviews
        // ---------------------------------------------------------------------
        $assignReviewerStmt = $db->prepare("
            INSERT INTO protocol_reviews (application_id, reviewer_id, reviewer_role, review_status, assigned_date)
            VALUES (:app_id, :reviewer_id, :reviewer_role, 'In Progress', CURRENT_DATE)
            ON CONFLICT (application_id, reviewer_id) 
            DO UPDATE SET 
                reviewer_role = EXCLUDED.reviewer_role,
                review_status = 'In Progress',
                assigned_date = CURRENT_DATE,
                completed_date = NULL,
                recommendation = NULL,
                comments = NULL
        ");

        if ($review_type === 'Exempted') {
            // Autonomous Fast-Track: Ethics Chair is sole reviewer
            $assignReviewerStmt->execute([
                ':app_id'        => $application_id,
                ':reviewer_id'   => $admin_id,
                ':reviewer_role' => 'Ethics Chair'
            ]);
        } elseif ($review_type === 'Expedited') {
            // 2 Primary Reviewers and 1 Non-Primary Reviewer
            $expeditedReviewers = [];
            if (isset($data->reviewer_assignments)) {
                $ra = $data->reviewer_assignments;
                $p1 = isset($ra->primary_reviewer_1) ? intval($ra->primary_reviewer_1) : null;
                $p2 = isset($ra->primary_reviewer_2) ? intval($ra->primary_reviewer_2) : null;
                $np = isset($ra->non_primary_reviewer) ? intval($ra->non_primary_reviewer) : null;
                if ($p1 && $p2 && $np) {
                    $expeditedReviewers = [
                        ['id' => $p1, 'role' => 'Primary Reviewer'],
                        ['id' => $p2, 'role' => 'Primary Reviewer'],
                        ['id' => $np, 'role' => 'Non-Primary Reviewer']
                    ];
                }
            } elseif (isset($data->reviewers) && is_array($data->reviewers)) {
                foreach ($data->reviewers as $r) {
                    if (is_object($r) && isset($r->id) && isset($r->role)) {
                        $expeditedReviewers[] = ['id' => intval($r->id), 'role' => $r->role];
                    } elseif (is_numeric($r)) {
                        $stmtR = $db->prepare("SELECT role FROM admins WHERE admin_id = :aid");
                        $stmtR->execute([':aid' => intval($r)]);
                        $rRole = $stmtR->fetchColumn();
                        if ($rRole) $expeditedReviewers[] = ['id' => intval($r), 'role' => $rRole];
                    }
                }
            }

            // Validation: Exactly 3 reviewers, 2 Primary and 1 Non-Primary
            if (count($expeditedReviewers) !== 3) {
                throw new Exception("Expedited review requires exactly 2 Primary Reviewers and 1 Non-Primary Reviewer.");
            }
            $primaryCount = 0;
            $nonPrimaryCount = 0;
            $distinctIds = [];
            foreach ($expeditedReviewers as $er) {
                $distinctIds[$er['id']] = true;
                if ($er['role'] === 'Primary Reviewer') $primaryCount++;
                if ($er['role'] === 'Non-Primary Reviewer') $nonPrimaryCount++;
            }
            if (count($distinctIds) !== 3 || $primaryCount !== 2 || $nonPrimaryCount !== 1) {
                throw new Exception("Invalid reviewer selection: Expedited review requires 2 distinct Primary Reviewers and 1 Non-Primary Reviewer.");
            }

            foreach ($expeditedReviewers as $er) {
                $assignReviewerStmt->execute([
                    ':app_id'        => $application_id,
                    ':reviewer_id'   => $er['id'],
                    ':reviewer_role' => $er['role']
                ]);
            }
        } elseif ($review_type === 'Full Board') {
            // Involves ALL active reviewers (Primary, Non-Primary, and Ethics Chair)
            $stmtAll = $db->query("
                SELECT admin_id, role 
                FROM admins 
                WHERE role IN ('Primary Reviewer', 'Non-Primary Reviewer', 'Ethics Chair')
            ");
            $allReviewers = $stmtAll->fetchAll(PDO::FETCH_ASSOC);
            if (empty($allReviewers)) {
                throw new Exception("No eligible reviewers found in committee for Full Board convening.");
            }
            foreach ($allReviewers as $ar) {
                $assignReviewerStmt->execute([
                    ':app_id'        => $application_id,
                    ':reviewer_id'   => $ar['admin_id'],
                    ':reviewer_role' => $ar['role']
                ]);
            }
        }

        $message = "Review type successfully assigned as " . $review_type;
    }

    // Commit all changes to the database safely
    $db->commit();

    // Calculate milestone progress percentage for response
    $milestone = calculatorFlowChartMilestone($newAppStatus);

    echo json_encode([
        "success"   => true, 
        "message"   => $message,
        "status"    => $newAppStatus,
        "milestone" => $milestone
    ]);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
}
?>
