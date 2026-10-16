<?php
// For incrementing the previous attempt number
function getNextAttemptNumber($pdo, $applicationId, $processPoint) {
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM application_history
        WHERE application_id = :app_id
        AND process_point = :process_point
    ");
    $stmt->execute([
        ':app_id' => $applicationId,
        ':process_point' => $processPoint
    ]);

    $existingCount = (int)$stmt->fetchColumn();
    return $existingCount + 1;
}

function recordHistory($pdo, $applicationId, $processPoint, $status, $proponentName, $notes = null, $isRejected = false) {
    // Determine which attempt
    $attemptNo = getNextAttemptNumber($pdo, $applicationId, $processPoint);

    // If status is Completed then paste current timestamp if not send null
    $dateCompleted = ($status === 'Completed') ? date('Y-m-d H:i:s') : null;

    $stmt = $pdo->prepare("
        INSERT INTO application_history (
            application_id,
            process_point,
            status,
            proponent_name,
            notes,
            attempt_no,
            is_rejected,
            date_completed
        ) VALUES (
            :application_id,
            :process_point,
            :status,
            :proponent_name,
            :notes,
            :attempt_no,
            :is_rejected::boolean,
            :date_completed
        )
    ");

    $stmt->execute([
        ':application_id'   => $applicationId,
        ':process_point'    => $processPoint,
        ':status'           => $status,
        ':proponent_name'   => $proponentName,
        ':notes'            => $notes,
        ':attempt_no'       => $attemptNo,
        ':is_rejected'      => $isRejected ? 'true' : 'false',
        ':date_completed'   => $dateCompleted
    ]);

    // Formatting Label for spacing
    $formattedLabel = sprintf("%s - %02d", $processPoint, $attemptNo);

    return [
        'attempt_no'        => $attemptNo,
        'formatted_label'   => $formattedLabel
    ];
}

function calculatorFlowChartMilestone($status) {
    // Mapping Flowchart Steps for percentage bar value
    $milestoneMap = [
        'Draft'                         => 0,
        'Protocols Submitted'           => 1,
        'Payment Pending'               => 2,
        'Payment Verified'              => 2,
        'Type of Review'                => 3,
        'Ongoing Review'                => 4,
        'Consolidation of Evaluation'   => 5,
        'Decision Letter Issued'        => 6,
        'Revisions Submitted'           => 7,
        'Clearance Granted'             => 9,
        'Rejected'                      => 9,
        'Withdrawn'                     => 9,
        'Amendments'                    => 9
    ];

    $totalExpectedSteps = 9;
    // Evaluate Current Step
    $currentStep = $milestoneMap[$status] ?? 1;

    if (in_array($status, ['Clearance Granted', 'Rejected', 'Withdrawn', 'Amendments'])) {
        $percentage = 100;
    } else {
        $percentage = min(99, (int)round(($currentStep / $totalExpectedSteps) * 100));
    }

    return [
        'currentStep'           => $currentStep,
        'totalSteps'            => $totalExpectedSteps,
        'progressPercentage'    => $percentage
    ];
}