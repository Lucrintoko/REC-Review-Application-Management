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
        $hasConsolidatedEvaluations = (bool) $db->query(
            "SELECT to_regclass('public.consolidated_evaluations')"
        )->fetchColumn();

        $consolidatedDecisionExistsSql = $hasConsolidatedEvaluations
            ? "CASE
                            WHEN EXISTS (
                                SELECT 1 FROM consolidated_evaluations ce
                                WHERE ce.application_id = r.application_id
                                  AND ce.status = 'Finalized'
                            ) THEN TRUE
                            ELSE FALSE
                        END"
            : "FALSE";
        $latestConsolidationSql = $hasConsolidatedEvaluations
            ? "(
                            SELECT json_build_object(
                                'consolidation_id', ce.consolidation_id,
                                'chair_id', ce.chair_id,
                                'chair_name', COALESCE(adm.first_name || ' ' || adm.last_name, 'Ethics Committee Chair'),
                                'cycle_number', ce.cycle_number,
                                'status', ce.status,
                                'consolidated_recommendation', ce.consolidated_recommendation,
                                'summary_notes', ce.summary_notes,
                                'directives_for_revisions', ce.directives_for_revisions,
                                'meeting_date', ce.meeting_date,
                                'per_question_findings', ce.per_question_findings,
                                'actionable_directives', ce.actionable_directives,
                                'compliance_checklist', ce.compliance_checklist,
                                'pdf_report_path', ce.pdf_report_path,
                                'finalized_at', ce.finalized_at,
                                'created_at', ce.created_at
                            )
                            FROM consolidated_evaluations ce
                            LEFT JOIN admins adm ON adm.admin_id = ce.chair_id
                            WHERE ce.application_id = r.application_id
                              AND ce.status = 'Finalized'
                            ORDER BY ce.cycle_number DESC, ce.consolidation_id DESC
                            LIMIT 1
                        )"
            : "NULL";

        $baseQuery = "SELECT 
                        r.application_id, 
                        r.protocol_code, 
                        r.applicant_id, 
                        r.research_title, 
                        r.research_type, 
                        r.review_type, 
                        r.status, 
                        r.submission_date, 
                        r.decision_date, 
                        r.clearance_date, 
                        r.created_at, 
                        r.updated_at, 
                        r.form_data,
                        p.payment_id,
                        p.payment_status,
                        p.verification_notes AS payment_notes,
                        p.or_number,
                        p.amount AS payment_amount,
                        p.payment_date,
                        p.verified_at AS payment_verified_at,
                        COALESCE(
                            (SELECT MAX(ah.attempt_no) 
                             FROM application_history ah 
                             WHERE ah.application_id = r.application_id 
                               AND ah.process_point = 'Payment Required'),
                            1
                        ) AS payment_attempts,
                        CASE 
                            WHEN EXISTS (
                                SELECT 1 FROM application_history ah 
                                WHERE ah.application_id = r.application_id 
                                  AND ah.process_point::text IN ('Protocol Revision', 'Proponent Revisions') 
                                  AND ah.status = 'Pending'
                            ) THEN TRUE 
                            ELSE FALSE 
                        END AS has_active_revision,
                        (
                            SELECT ah.attempt_no 
                            FROM application_history ah 
                            WHERE ah.application_id = r.application_id 
                              AND ah.process_point::text IN ('Protocol Revision', 'Proponent Revisions') 
                              AND ah.status = 'Pending' 
                            ORDER BY ah.history_id DESC LIMIT 1
                        ) AS revision_attempt_no,
                        (
                            SELECT ah.notes 
                            FROM application_history ah 
                            WHERE ah.application_id = r.application_id 
                              AND ah.process_point = 'Review Type Assessment' 
                              AND ah.is_rejected = TRUE 
                            ORDER BY ah.history_id DESC LIMIT 1
                        ) AS revision_notes,
                        (
                            SELECT ah.date_completed 
                            FROM application_history ah 
                            WHERE ah.application_id = r.application_id 
                              AND ah.process_point = 'Review Type Assessment' 
                              AND ah.is_rejected = TRUE 
                            ORDER BY ah.history_id DESC LIMIT 1
                        ) AS revision_requested_at,
                        (
                            SELECT ah.proponent_name 
                            FROM application_history ah 
                            WHERE ah.application_id = r.application_id 
                              AND ah.process_point = 'Review Type Assessment' 
                              AND ah.is_rejected = TRUE 
                            ORDER BY ah.history_id DESC LIMIT 1
                        ) AS chair_proponent_name,
                        {$consolidatedDecisionExistsSql} AS has_consolidated_decision,
                        {$latestConsolidationSql} AS latest_consolidation,
                        COALESCE(
                            (SELECT json_agg(json_build_object(
                                'review_id', pr.review_id,
                                'reviewer_id', pr.reviewer_id,
                                'reviewer_name', a.first_name || ' ' || a.last_name,
                                'reviewer_role', pr.reviewer_role,
                                'review_status', pr.review_status,
                                'recommendation', pr.recommendation,
                                'comments', pr.comments,
                                'assigned_date', pr.assigned_date,
                                'completed_date', pr.completed_date,
                                'form_data', pr.form_data
                            ) ORDER BY pr.reviewer_role, pr.reviewer_id)
                            FROM protocol_reviews pr
                            JOIN admins a ON a.admin_id = pr.reviewer_id
                            WHERE pr.application_id = r.application_id),
                            '[]'::json
                        ) AS assigned_reviewers,
                        (
                            SELECT COUNT(*)::int 
                            FROM protocol_reviews pr 
                            WHERE pr.application_id = r.application_id
                        ) AS reviews_total,
                        (
                            SELECT COUNT(*)::int 
                            FROM protocol_reviews pr 
                            WHERE pr.application_id = r.application_id 
                              AND pr.review_status = 'Completed'
                        ) AS reviews_completed
                      FROM research_applications r
                      LEFT JOIN payments p ON p.application_id = r.application_id";

        if ($applicantId) {
            $stmt = $db->prepare($baseQuery . " WHERE r.applicant_id = :applicant_id ORDER BY r.submission_date DESC, r.application_id DESC");
            $stmt->bindParam(':applicant_id', $applicantId, PDO::PARAM_INT);
        } else {
            $stmt = $db->prepare($baseQuery . " ORDER BY r.submission_date DESC, r.application_id DESC");
        }

        $stmt->execute();
        $applications = $stmt->fetchAll();
        
        // Decode form_data for easier client-side parsing and format booleans
        foreach ($applications as &$app) {
            if (isset($app['form_data']) && $app['form_data']) {
                $app['form_data'] = json_decode($app['form_data'], true);
            }
            if (isset($app['has_active_revision'])) {
                $app['has_active_revision'] = filter_var($app['has_active_revision'], FILTER_VALIDATE_BOOLEAN);
            }
            if (isset($app['revision_attempt_no']) && $app['revision_attempt_no'] !== null) {
                $app['revision_attempt_no'] = intval($app['revision_attempt_no']);
            }
            if (isset($app['assigned_reviewers'])) {
                if (is_string($app['assigned_reviewers'])) {
                    $app['assigned_reviewers'] = json_decode($app['assigned_reviewers'], true);
                }
            } else {
                $app['assigned_reviewers'] = [];
            }
            if (isset($app['has_consolidated_decision'])) {
                $app['has_consolidated_decision'] = filter_var($app['has_consolidated_decision'], FILTER_VALIDATE_BOOLEAN);
            } else {
                $app['has_consolidated_decision'] = false;
            }
            if (isset($app['latest_consolidation'])) {
                if (is_string($app['latest_consolidation'])) {
                    $app['latest_consolidation'] = json_decode($app['latest_consolidation'], true);
                }
            } else {
                $app['latest_consolidation'] = null;
            }
            $app['reviews_total'] = isset($app['reviews_total']) ? intval($app['reviews_total']) : 0;
            $app['reviews_completed'] = isset($app['reviews_completed']) ? intval($app['reviews_completed']) : 0;
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

if ($request_method === 'DELETE' && $isApplicationsEndpoint) {
    try {
        $database = new Database();
        $db = $database->getConnection();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];

        $applicationId = intval($_GET['application_id'] ?? $input['application_id'] ?? 0);
        $applicantId = intval($_GET['applicant_id'] ?? $input['applicant_id'] ?? 0);

        if ($applicationId <= 0 || $applicantId <= 0) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "message" => "A valid application ID and applicant ID are required."
            ]);
            exit;
        }

        $db->beginTransaction();

        $findStmt = $db->prepare("SELECT form_data FROM research_applications
                                  WHERE application_id = :application_id
                                    AND applicant_id = :applicant_id
                                    AND status = 'Draft'
                                  FOR UPDATE");
        $findStmt->execute([
            ':application_id' => $applicationId,
            ':applicant_id' => $applicantId,
        ]);
        $draft = $findStmt->fetch();

        if (!$draft) {
            $db->rollBack();
            http_response_code(404);
            echo json_encode([
                "status" => "error",
                "message" => "Draft application not found or it is no longer deletable."
            ]);
            exit;
        }

        $documentStmt = $db->prepare("SELECT file_path FROM research_documents WHERE application_id = :application_id");
        $documentStmt->execute([':application_id' => $applicationId]);
        $documentPaths = $documentStmt->fetchAll(PDO::FETCH_COLUMN);

        $deleteStmt = $db->prepare("DELETE FROM research_applications
                                    WHERE application_id = :application_id
                                      AND applicant_id = :applicant_id
                                      AND status = 'Draft'");
        $deleteStmt->execute([
            ':application_id' => $applicationId,
            ':applicant_id' => $applicantId,
        ]);

        $db->commit();

        foreach ($documentPaths as $documentPath) {
            $fullPath = __DIR__ . '/../' . ltrim($documentPath, '/');
            if (is_file($fullPath)) {
                @unlink($fullPath);
            }
        }

        echo json_encode([
            "status" => "success",
            "message" => "Draft application deleted successfully."
        ]);
        exit;
    } catch (Exception $e) {
        if (isset($db) && $db->inTransaction()) {
            $db->rollBack();
        }
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Failed to delete draft application: " . $e->getMessage()
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

            // Synchronize single 'file' property from 'files[0]' for any item with multi-files
            $syncSingleFile = function(&$target) use (&$syncSingleFile) {
                if (!is_array($target)) return;
                if (isset($target['files']) && is_array($target['files']) && count($target['files']) > 0) {
                    if (isset($target['files'][0]['savedPath'])) {
                        if (!isset($target['file']) || !is_array($target['file'])) {
                            $target['file'] = $target['files'][0];
                        } else {
                            $target['file']['savedPath'] = $target['files'][0]['savedPath'];
                        }
                    }
                }
                foreach ($target as &$child) {
                    if (is_array($child)) {
                        $syncSingleFile($child);
                    }
                }
            };
            $syncSingleFile($formDataSnapshot);
        }
        
        $form_data = $formDataSnapshot ? json_encode($formDataSnapshot) : null;
        
        $applicant_id = intval($input['applicant_id'] ?? 0);
        if ($applicant_id <= 0) {
            http_response_code(400);
            echo json_encode([
                "status" => "error",
                "message" => "A valid applicant ID is required."
            ]);
            exit;
        }

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

        // Fetch applicant name
        $applicantStmt = $db->prepare("SELECT first_name, last_name FROM applicants WHERE applicant_id = :applicant_id LIMIT 1");
        $applicantStmt->execute([':applicant_id' => $applicant_id]);
        $applicantRow = $applicantStmt->fetch();
        $applicantName = $applicantRow ? ($applicantRow['first_name'] . ' ' . $applicantRow['last_name']) : 'Applicant';

        $historyStmt = $db->prepare("INSERT INTO application_history 
            (application_id, process_point, status, proponent_name, date_completed)
            VALUES (:app_id, 'Initial Submission', 'Completed', :proponent_name, CURRENT_TIMESTAMP)");
        $historyStmt->execute([
            ':app_id' => $application_id,
            ':proponent_name' => $applicantName
        ]);
        
        // Insert Payment Required as Pending
        $paymentReqStmt = $db->prepare("INSERT INTO application_history 
            (application_id, process_point, status, proponent_name)
            VALUES (:app_id, 'Payment Required', 'Pending', '')");
        $paymentReqStmt->execute([
            ':app_id' => $application_id
        ]);

        // Insert uploaded files into research_documents table
        if ($formDataSnapshot) {
            $insertDocStmt = $db->prepare("INSERT INTO research_documents 
                (application_id, document_type, file_name, file_path, file_size_kb, version_number)
                VALUES (:app_id, :doc_type, :file_name, :file_path, :file_size_kb, 1)");

            $mapCategory = function($key) {
                switch ($key) {
                    case 'fullProtocol': return 'Research Protocol';
                    case 'informedConsent':
                    case 'assentForm': return 'Informed Consent Form';
                    case 'cvResearchers': return 'Curriculum Vitae';
                    case 'endorsementLetter': return 'Endorsement Letter';
                    case 'questionnaire':
                    case 'dataCollectionForms': return 'Data Collection Instrument';
                    default: return 'Other';
                }
            };

            $insertedPaths = [];
            $collectAndInsertDocs = function($obj, $currentKey = '') use (&$collectAndInsertDocs, $insertDocStmt, $application_id, $mapCategory, &$insertedPaths) {
                if (!is_array($obj)) return;
                if (isset($obj['savedPath']) && isset($obj['name'])) {
                    if (!isset($insertedPaths[$obj['savedPath']])) {
                        $insertedPaths[$obj['savedPath']] = true;
                        $docType = $mapCategory($currentKey);
                        $sizeKb = isset($obj['size']) ? round($obj['size'] / 1024) : null;
                        $insertDocStmt->execute([
                            ':app_id' => $application_id,
                            ':doc_type' => $docType,
                            ':file_name' => $obj['name'],
                            ':file_path' => $obj['savedPath'],
                            ':file_size_kb' => $sizeKb
                        ]);
                    }
                    return;
                }
                foreach ($obj as $k => $v) {
                    $nextKey = is_string($k) && !is_numeric($k) && $k !== 'files' && $k !== 'file' ? $k : $currentKey;
                    $collectAndInsertDocs($v, $nextKey);
                }
            };

            $collectAndInsertDocs($formDataSnapshot);
        }

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

