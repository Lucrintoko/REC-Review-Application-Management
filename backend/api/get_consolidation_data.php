<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../controllers/history_helper.php';

try {
    $application_id = isset($_GET['application_id']) ? intval($_GET['application_id']) : 0;
    if ($application_id <= 0) {
        // Also check POST body if requested via POST
        $raw = file_get_contents('php://input');
        $json = json_decode($raw, true);
        if ($json && isset($json['application_id'])) {
            $application_id = intval($json['application_id']);
        }
    }

    if ($application_id <= 0) {
        http_response_code(400);
        echo json_encode([
            "status"  => "error",
            "success" => false,
            "message" => "Valid application_id is required."
        ]);
        exit;
    }

    $db = (new Database())->getConnection();

    // 1. Fetch Protocol Details
    $appStmt = $db->prepare("
        SELECT 
            ra.application_id,
            ra.protocol_code,
            ra.research_title,
            ra.research_type,
            ra.review_type,
            ra.status,
            ra.submission_date,
            ra.form_data,
            TRIM(CONCAT(u.first_name, ' ', u.last_name)) as applicant_name,
            u.email as applicant_email
        FROM research_applications ra
        LEFT JOIN applicants u ON ra.applicant_id = u.applicant_id
        WHERE ra.application_id = :id
    ");
    $appStmt->execute([':id' => $application_id]);
    $protocolRow = $appStmt->fetch(PDO::FETCH_ASSOC);

    if (!$protocolRow) {
        http_response_code(404);
        echo json_encode([
            "status"  => "error",
            "success" => false,
            "message" => "Protocol not found for application_id: " . $application_id
        ]);
        exit;
    }

    $formData = json_decode($protocolRow['form_data'] ?? '{}', true) ?: [];
    $proponents = [];
    if (!empty($protocolRow['applicant_name'])) {
        $proponents[] = $protocolRow['applicant_name'];
    }
    if (isset($formData['co_researchers']) && is_array($formData['co_researchers'])) {
        foreach ($formData['co_researchers'] as $co) {
            if (!empty($co['name']) && !in_array($co['name'], $proponents)) {
                $proponents[] = $co['name'];
            }
        }
    }

    $protocolData = [
        "application_id" => (int)$protocolRow['application_id'],
        "protocol_code"  => $protocolRow['protocol_code'],
        "research_title" => $protocolRow['research_title'],
        "research_type"  => $protocolRow['research_type'],
        "review_type"    => $protocolRow['review_type'],
        "status"         => $protocolRow['status'],
        "submission_date"=> $protocolRow['submission_date'],
        "proponents"     => $proponents,
        "institution"    => $formData['institution'] ?? "Ateneo de Zamboanga University"
    ];

    // 2. Fetch Existing Consolidated Evaluation Record (Draft or Finalized)
    $consolStmt = $db->prepare("
        SELECT 
            ce.consolidation_id,
            ce.application_id,
            ce.chair_id,
            ce.cycle_number,
            ce.status,
            ce.consolidated_recommendation,
            ce.summary_notes,
            ce.directives_for_revisions,
            ce.meeting_date,
            ce.per_question_findings,
            ce.actionable_directives,
            ce.compliance_checklist,
            ce.pdf_report_path,
            ce.created_at,
            ce.updated_at,
            ce.finalized_at,
            adm.first_name as chair_first_name,
            adm.last_name as chair_last_name
        FROM consolidated_evaluations ce
        LEFT JOIN admins adm ON ce.chair_id = adm.admin_id
        WHERE ce.application_id = :id
        ORDER BY ce.cycle_number DESC
        LIMIT 1
    ");
    $consolStmt->execute([':id' => $application_id]);
    $existingConsol = $consolStmt->fetch(PDO::FETCH_ASSOC);

    $savedFindings   = $existingConsol ? json_decode($existingConsol['per_question_findings'] ?? '{}', true) : [];
    $savedDirectives = $existingConsol ? json_decode($existingConsol['actionable_directives'] ?? '[]', true) : [];
    $savedChecklist  = $existingConsol ? json_decode($existingConsol['compliance_checklist'] ?? '{}', true) : [];

    $consolidationMeta = [
        "consolidation_id"  => $existingConsol ? (int)$existingConsol['consolidation_id'] : null,
        "status"            => $existingConsol['status'] ?? "Draft",
        "is_draft"          => ($existingConsol['status'] ?? "Draft") === "Draft",
        "cycle_number"      => $existingConsol ? (int)$existingConsol['cycle_number'] : 1,
        "chair_id"          => $existingConsol ? (int)$existingConsol['chair_id'] : null,
        "chair_name"        => $existingConsol && !empty($existingConsol['chair_first_name'])
            ? trim($existingConsol['chair_first_name'] . ' ' . $existingConsol['chair_last_name'])
            : "Ethics Committee Chair",
        "meeting_date"      => $existingConsol['meeting_date'] ?? null,
        "summary_notes"     => $existingConsol['summary_notes'] ?? "",
        "directives_for_revisions" => $existingConsol['directives_for_revisions'] ?? "",
        "created_at"        => $existingConsol['created_at'] ?? null,
        "updated_at"        => $existingConsol['updated_at'] ?? null,
        "finalized_at"      => $existingConsol['finalized_at'] ?? null,
        "pdf_report_path"   => $existingConsol['pdf_report_path'] ?? null
    ];

    // 3. Fetch Assigned Peer Reviewers and their Evaluation Forms
    $revStmt = $db->prepare("
        SELECT 
            pr.review_id,
            pr.reviewer_id,
            pr.reviewer_role,
            pr.review_status,
            pr.recommendation,
            pr.comments as general_comments,
            pr.form_data,
            pr.assigned_date,
            pr.completed_date,
            adm.first_name,
            adm.last_name,
            adm.email,
            adm.specialization
        FROM protocol_reviews pr
        JOIN admins adm ON pr.reviewer_id = adm.admin_id
        WHERE pr.application_id = :id
        ORDER BY 
            CASE WHEN pr.reviewer_role = 'Primary Reviewer' THEN 1 ELSE 2 END,
            pr.review_id ASC
    ");
    $revStmt->execute([':id' => $application_id]);
    $reviewerRows = $revStmt->fetchAll(PDO::FETCH_ASSOC);

    $reviewerRoster = [];
    $reviewerEvaluations = [];

    // Map recommendation hierarchy: Disapproved > Major Revisions > Minor Revisions > Approved
    $recWeights = [
        'Disapproved'     => 4,
        'Major Revisions' => 3,
        'Minor Revisions' => 2,
        'Approved'        => 1
    ];
    $highestWeight = 1;
    $smartDefaultRec = 'Approved';
    $recReasons = [];

    foreach ($reviewerRows as $r) {
        $name = trim($r['first_name'] . ' ' . $r['last_name']);
        $rawFormData = json_decode($r['form_data'] ?? '{}', true) ?: [];
        $rec = $r['recommendation'] ?: 'Pending Review';

        $evaluatedForms = [];
        if (!empty($rawFormData['form11'])) $evaluatedForms[] = 'Form 11';
        if (!empty($rawFormData['form12'])) $evaluatedForms[] = 'Form 12';

        $reviewerRoster[] = [
            "reviewer_id"       => (int)$r['reviewer_id'],
            "reviewer_name"     => $name,
            "reviewer_role"     => $r['reviewer_role'],
            "review_status"     => $r['review_status'],
            "recommendation"    => $r['recommendation'] ?? null,
            "assigned_date"     => $r['assigned_date'],
            "completed_date"    => $r['completed_date'],
            "general_comments"  => $r['general_comments'] ?? "",
            "evaluated_forms"   => $evaluatedForms
        ];

        $reviewerEvaluations[] = [
            "reviewer_id"   => (int)$r['reviewer_id'],
            "reviewer_name" => $name,
            "reviewer_role" => $r['reviewer_role'],
            "status"        => $r['review_status'],
            "recommendation"=> $r['recommendation'],
            "form11"        => $rawFormData['form11'] ?? null,
            "form12"        => $rawFormData['form12'] ?? null,
            "comments"      => $r['general_comments'] ?? ""
        ];

        if (isset($recWeights[$rec])) {
            if ($recWeights[$rec] > $highestWeight) {
                $highestWeight = $recWeights[$rec];
                $smartDefaultRec = $rec;
            }
            if ($rec !== 'Approved' && !empty($r['general_comments'])) {
                $recReasons[] = "{$name} ({$rec}): {$r['general_comments']}";
            }
        }
    }

    // 4. Canonical Definitions of Form 11 and Form 12 Criteria
    $form11Definitions = [
        [
            "key"         => "socialValue",
            "section"     => "Social & Scientific Value",
            "label"       => "Does the study have social value?",
            "helper_text" => "(e.g. scientific value, relevance to national / community needs)"
        ],
        [
            "key"         => "studyBackgroundAdequate",
            "section"     => "Background & Literature",
            "label"       => "Is the study background adequate?",
            "helper_text" => "Clear theoretical rationale and contextual background"
        ],
        [
            "key"         => "researchQuestionsSupportedByLiterature",
            "section"     => "Background & Literature",
            "label"       => "Are the research questions supported by the Review of Literature?",
            "helper_text" => "Literature review is directly aligned with stated questions"
        ],
        [
            "key"         => "studyObjectivesSmart",
            "section"     => "Study Objectives",
            "label"       => "Are the study objectives Specific, Measurable, Attainable, Realistic, and Time-bound?",
            "helper_text" => "SMART framework compliance"
        ],
        [
            "key"         => "researchDesignAppropriate",
            "section"     => "Methodology & Design",
            "label"       => "Is the research design appropriate?",
            "helper_text" => "Population definition, participant selection, sample size justification, and data analysis plan"
        ],
        [
            "key"         => "humanParticipantsRequired",
            "section"     => "Human Subject Necessity",
            "label"       => "Does the research need to be carried out with human participants?",
            "helper_text" => "Justification for involving human subjects instead of non-human models"
        ],
        [
            "key"         => "vulnerabilityIssue",
            "section"     => "Vulnerability & Protection",
            "label"       => "Does the study involve vulnerable groups?",
            "helper_text" => "Minors, pregnant women, indigenous persons, prisoners, or economically disadvantaged"
        ],
        [
            "key"         => "vulnerabilityMechanismsInPlace",
            "section"     => "Vulnerability & Protection",
            "label"       => "Are appropriate mechanisms/interventions in place to address the vulnerability issue/s?",
            "helper_text" => "Safeguards against undue coercion and exploitation"
        ],
        [
            "key"         => "risksToParticipants",
            "section"     => "Risk Assessment & Mitigation",
            "label"       => "Are there risks / probable harms to the human participants in the study?",
            "helper_text" => "Physical, psychological, social, legal, or economic risks"
        ],
        [
            "key"         => "riskMitigationMeasures",
            "section"     => "Risk Assessment & Mitigation",
            "label"       => "Are there measures to mitigate the risks?",
            "helper_text" => "Safety protocols, referral mechanisms, and confidentiality measures"
        ],
        [
            "key"         => "informedConsentAdequate",
            "section"     => "Informed Consent Adequacy",
            "label"       => "Is the informed consent procedure / form adequate and culturally appropriate?",
            "helper_text" => "Comprehensible translation and voluntary participation safeguards"
        ],
        [
            "key"         => "investigatorsAdequatelyTrained",
            "section"     => "Investigator Qualifications",
            "label"       => "Is/are the investigator/s adequately trained and do they have sufficient experience?",
            "helper_text" => "GCP certifications, ethics training, and technical expertise"
        ],
        [
            "key"         => "conflictOfInterestDisclosure",
            "section"     => "Conflict of Interest",
            "label"       => "Is there a disclosure of conflict of interest?",
            "helper_text" => "Financial, institutional, or personal COI statements"
        ],
        [
            "key"         => "researchFacilitiesAdequate",
            "section"     => "Research Facilities",
            "label"       => "Are the research facilities adequate?",
            "helper_text" => "Laboratories, interview venues, secure data storage systems"
        ],
        [
            "key"         => "otherConcernsComment",
            "section"     => "General Protocol Concerns",
            "label"       => "Other Ethical Concerns / General Protocol Remarks",
            "helper_text" => "Additional considerations not captured in specific items above"
        ]
    ];

    $form12Definitions = [
        [
            "key"         => "informedConsentNecessity",
            "section"     => "General Necessity",
            "label"       => "Is it necessary to seek the informed consent of the participants?",
            "helper_text" => "Voluntary participation and justification if waived"
        ],
        [
            "key"         => "purposeOfStudy",
            "section"     => "Sufficient Information Checklist",
            "label"       => "Purpose of the study clearly explained?",
            "helper_text" => "Clarity of research objectives presented to participants"
        ],
        [
            "key"         => "expectedDurationOfParticipation",
            "section"     => "Sufficient Information Checklist",
            "label"       => "Expected duration of the subject's participation stated?",
            "helper_text" => "Timeline and time commitment communicated"
        ],
        [
            "key"         => "proceduresToBeCarriedOut",
            "section"     => "Sufficient Information Checklist",
            "label"       => "Procedures to be carried out clearly described?",
            "helper_text" => "Step-by-step description of participant activities"
        ],
        [
            "key"         => "discomfortsAndInconveniences",
            "section"     => "Sufficient Information Checklist",
            "label"       => "Discomforts and inconveniences reasonably expected specified?",
            "helper_text" => "Fatigue, travel, time loss, or procedural distress"
        ],
        [
            "key"         => "risksIncludingDiscrimination",
            "section"     => "Sufficient Information Checklist",
            "label"       => "Risks / probable harms reasonably expected specified (including discrimination / stigmatization)?",
            "helper_text" => "Potential psychological, social, or physical risks"
        ],
        [
            "key"         => "randomAssignmentToTrialTreatments",
            "section"     => "Sufficient Information Checklist",
            "label"       => "Random assignment to trial treatments disclosed?",
            "helper_text" => "Applicable for randomized clinical or behavioral trials"
        ],
        [
            "key"         => "benefitsToParticipants",
            "section"     => "Sufficient Information Checklist",
            "label"       => "Benefits to the subject or to others which may reasonably be expected?",
            "helper_text" => "Direct benefits to participants or general scientific contribution"
        ],
        [
            "key"         => "alternativeTreatmentsOrProcedures",
            "section"     => "Sufficient Information Checklist",
            "label"       => "Alternative procedures or treatments advantageous to subject disclosed?",
            "helper_text" => "Options available if participant declines or withdraws"
        ],
        [
            "key"         => "compensationOrMedicalTreatmentsForInjury",
            "section"     => "Sufficient Information Checklist",
            "label"       => "Compensation / medical treatment in case of disability or injury?",
            "helper_text" => "Institutional responsibility and medical care coverage"
        ],
        [
            "key"         => "contactPersonForQuestionsAndInjuryAssistance",
            "section"     => "Sufficient Information Checklist",
            "label"       => "Contact persons for study-related questions or research-related injury specified?",
            "helper_text" => "Principal investigator and REC secretariat contact numbers/emails"
        ],
        [
            "key"         => "refusalOrDiscontinuanceWithoutPenalty",
            "section"     => "Sufficient Information Checklist",
            "label"       => "Statement that participation is voluntary and refusal/discontinuance entails no penalty?",
            "helper_text" => "Explicit right to withdraw at any stage without consequence"
        ],
        [
            "key"         => "extentOfConfidentiality",
            "section"     => "Sufficient Information Checklist",
            "label"       => "Extent of confidentiality of records maintained?",
            "helper_text" => "Data security, encryption, and anonymization safeguards"
        ],
        [
            "key"         => "writtenInSimpleUnderstandableLanguage",
            "section"     => "Sufficient Information Checklist",
            "label"       => "Written in simple and understandable language?",
            "helper_text" => "Lay language, readability at 6th-8th grade level, vernacular translations available"
        ],
        [
            "key"         => "adequateProcessForVoluntaryConsent",
            "section"     => "Sufficient Information Checklist",
            "label"       => "Adequate process for obtaining voluntary consent described?",
            "helper_text" => "Sufficient time for decision, comprehension checks, and signature/thumbmark process"
        ],
        [
            "key"         => "otherConcernsComments",
            "section"     => "General Consent Concerns",
            "label"       => "Other Informed Consent Concerns / General Remarks",
            "helper_text" => "Additional observations on the consent document"
        ]
    ];

    // 5. Smart-Default Synthesis Processing Function
    $processCriteria = function($definitions, $formType) use ($reviewerEvaluations, $savedFindings) {
        $matrix = [];

        foreach ($definitions as $def) {
            $criterionKey = $def['key'];
            $questionId   = ($formType === 'form11' ? 'f11_' : 'f12_') . $criterionKey;
            $reviewerResponses = [];
            $commentsList      = [];
            $affirmativeCount  = 0;
            $critiqueCount     = 0;
            $totalEvaluated    = 0;

            foreach ($reviewerEvaluations as $rev) {
                $formData = $rev[$formType];
                if (!$formData) continue; // Reviewer did not evaluate this form (e.g. Non-Primary on Form 11)

                $respVal = "N/A";
                $comment = "";

                if ($formType === 'form11') {
                    $gq = $formData['guideQuestions'] ?? [];
                    if ($criterionKey === 'otherConcernsComment') {
                        $comment = trim($gq['otherConcernsComment'] ?? '');
                        $respVal = !empty($comment) ? "Comment" : "Satisfactory";
                    } elseif ($criterionKey === 'researchDesignAppropriate') {
                        $rda = $gq['researchDesignAppropriate'] ?? [];
                        $comment = trim($rda['comment'] ?? '');
                        // If subitems are answered
                        $subNegative = false;
                        foreach (['populationIdentifiedAndDefined', 'selectionOfParticipantsDescribed', 'sampleSizeJustified', 'dataAnalysisPlanAndDummyTables'] as $sub) {
                            $subVal = $rda[$sub]['response'] ?? 'Satisfactory';
                            if (in_array(strtolower($subVal), ['no', 'unable to assess', 'unable'])) {
                                $subNegative = true;
                            }
                        }
                        $respVal = $subNegative ? "Unable to Assess" : ($comment ? "Requires Note" : "Satisfactory");
                    } else {
                        $item = $gq[$criterionKey] ?? [];
                        $respVal = $item['response'] ?? 'Satisfactory';
                        $comment = trim($item['comment'] ?? '');
                    }
                } else {
                    // form12
                    $gq = $formData['guideQuestions'] ?? [];
                    if ($criterionKey === 'informedConsentNecessity') {
                        $icn = $gq['informedConsentNecessity'] ?? [];
                        $respVal = $icn['necessaryToSeekConsent'] ?? 'Yes';
                        $comment = trim($icn['ifNoExplanation'] ?? '');
                    } elseif ($criterionKey === 'otherConcernsComments') {
                        $sic = $gq['sufficientInformationChecklist'] ?? [];
                        $comment = trim($sic['otherConcernsComments'] ?? '');
                        $respVal = !empty($comment) ? "Comment" : "Satisfactory";
                    } else {
                        $sic = $gq['sufficientInformationChecklist'] ?? [];
                        $respVal = $sic[$criterionKey] ?? 'Yes';
                        // check if there are notes
                        $comment = "";
                    }
                }

                $totalEvaluated++;
                $isAffirmative = false;
                $lowResp = strtolower($respVal);

                if (!empty($comment)) {
                    $commentsList[] = [
                        "reviewer_name" => $rev['reviewer_name'],
                        "comment"       => $comment
                    ];
                }

                if (in_array($lowResp, ['yes', 'satisfactory', 'not applicable', 'na', 'n/a'])) {
                    $isAffirmative = true;
                    $affirmativeCount++;
                } else {
                    $critiqueCount++;
                }

                $reviewerResponses[] = [
                    "reviewer_id"   => $rev['reviewer_id'],
                    "reviewer_name" => $rev['reviewer_name'],
                    "reviewer_role" => $rev['reviewer_role'],
                    "response"      => $respVal,
                    "comment"       => $comment
                ];
            }

            // Consensus computation
            $consensusType = 'unanimous';
            $isFlagged = false;
            $smartDefaultFinding = 'Satisfactory';
            $smartDefaultRemarks = 'Satisfactory; criteria met without revisions.';

            if ($totalEvaluated > 0) {
                if ($critiqueCount === 0) {
                    $consensusType = 'unanimous';
                    $isFlagged = false;
                    $smartDefaultFinding = 'Satisfactory';
                    $smartDefaultRemarks = 'Satisfactory; criteria met without revisions.';
                } elseif ($affirmativeCount === 0) {
                    $consensusType = 'flagged';
                    $isFlagged = true;
                    $smartDefaultFinding = 'Requires Modification';
                    $smartDefaultRemarks = !empty($commentsList)
                        ? implode("; ", array_map(function($c) { return $c['comment']; }, $commentsList))
                        : 'Reviewers flagged criteria as requiring modification.';
                } else {
                    $consensusType = 'split';
                    $isFlagged = true;
                    $smartDefaultFinding = 'Requires Modification';
                    $smartDefaultRemarks = !empty($commentsList)
                        ? "Reviewers divided. Revisions required: " . implode("; ", array_map(function($c) { return "{$c['reviewer_name']}: {$c['comment']}"; }, $commentsList))
                        : 'Reviewers split on criteria. Committee clarification required.';
                }
            }

            // Accelerators computation
            $useRev1 = isset($commentsList[0]['comment']) ? $commentsList[0]['comment'] : "";
            $useRev2 = isset($commentsList[1]['comment']) ? $commentsList[1]['comment'] : "";
            $mergeComments = "";
            if (!empty($commentsList)) {
                $mergeParts = [];
                foreach ($commentsList as $cl) {
                    $mergeParts[] = "[{$cl['reviewer_name']}]: {$cl['comment']}";
                }
                $mergeComments = implode("\n", $mergeParts);
            }

            // Chair State (Saved Draft vs Smart Default)
            $chairSaved = $savedFindings[$questionId] ?? null;
            $chairState = [
                "finding"     => $chairSaved['finding'] ?? $smartDefaultFinding,
                "remarks"     => $chairSaved['remarks'] ?? $smartDefaultRemarks,
                "is_modified" => $chairSaved['is_modified'] ?? false
            ];

            $matrix[] = [
                "question_id"           => $questionId,
                "form_type"             => $formType,
                "section_title"         => $def['section'],
                "criterion_key"         => $criterionKey,
                "label"                 => $def['label'],
                "helper_text"           => $def['helper_text'],
                "consensus_type"        => $consensusType,
                "is_flagged"            => $isFlagged,
                "smart_default_finding" => $smartDefaultFinding,
                "smart_default_remarks" => $smartDefaultRemarks,
                "reviewer_responses"    => $reviewerResponses,
                "accelerators"          => [
                    "use_rev_1"      => $useRev1,
                    "use_rev_2"      => $useRev2,
                    "merge_comments" => $mergeComments
                ],
                "chair_state"           => $chairState
            ];
        }

        return $matrix;
    };

    $form11Matrix = $processCriteria($form11Definitions, 'form11');
    $form12Matrix = $processCriteria($form12Definitions, 'form12');

    // 6. Actionable Directives Extraction (flagged questions prefill actionable directives)
    $actionableDirectives = !empty($savedDirectives) ? $savedDirectives : [];
    if (empty($actionableDirectives)) {
        $dirIndex = 1;
        foreach (array_merge($form11Matrix, $form12Matrix) as $item) {
            if ($item['is_flagged']) {
                $actionableDirectives[] = [
                    "directive_id"    => "dir-" . $item['question_id'],
                    "source_form"     => $item['form_type'] === 'form11' ? 'Form 11' : 'Form 12',
                    "criterion_key"   => $item['criterion_key'],
                    "criterion_label" => $item['label'],
                    "issue"           => $item['accelerators']['merge_comments'] ?: "Criteria flagged by peer reviewers.",
                    "required_action" => $item['smart_default_remarks'],
                    "is_mandatory"    => true,
                    "status"          => "Pending"
                ];
                $dirIndex++;
            }
        }
    }

    // 7. Compliance Checklist
    $complianceChecklist = !empty($savedChecklist) ? $savedChecklist : [
        "social_and_scientific_value"   => true,
        "fair_subject_selection"        => true,
        "favorable_risk_benefit_ratio"  => true,
        "vulnerability_safeguards"      => true,
        "informed_consent_clarity"      => true,
        "all_flagged_criteria_resolved" => empty($actionableDirectives)
    ];

    $response = [
        "status"    => "success",
        "success"   => true,
        "timestamp" => date('c'),
        "data"      => [
            "protocol"                  => $protocolData,
            "consolidation_meta"        => $consolidationMeta,
            "reviewer_roster"           => $reviewerRoster,
            "synthesized_recommendation"=> [
                "smart_default" => $smartDefaultRec,
                "current_value" => $existingConsol['consolidated_recommendation'] ?? $smartDefaultRec,
                "reasons"       => !empty($recReasons) ? implode(" | ", $recReasons) : "All peer reviewers recommended approval without major concerns."
            ],
            "criteria_matrix"           => [
                "form11" => $form11Matrix,
                "form12" => $form12Matrix
            ],
            "actionable_directives"     => $actionableDirectives,
            "compliance_checklist"      => $complianceChecklist
        ]
    ];

    echo json_encode($response);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
