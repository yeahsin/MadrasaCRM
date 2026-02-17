<?php
require 'db.php';
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Accept either a single student object or an array of students
$students = array_values(is_array($data) && isset($data[0]) ? $data : [$data]);

$sql = "INSERT INTO students (
    id, full_name, dob, gender, phone, email, address,
    parent_name, parent_phone, parent_email, admission_date,
    course_id, class_level, status, monthly_fee, discount_percent, remarks
) VALUES (
    :id, :fullName, :dob, :gender, :phone, :email, :address,
    :parentName, :parentPhone, :parentEmail, :admissionDate,
    :courseId, :class, :status, :totalFee, :discount, :remarks
) ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    dob = VALUES(dob),
    gender = VALUES(gender),
    phone = VALUES(phone),
    email = VALUES(email),
    address = VALUES(address),
    parent_name = VALUES(parent_name),
    parent_phone = VALUES(parent_phone),
    parent_email = VALUES(parent_email),
    admission_date = VALUES(admission_date),
    course_id = VALUES(course_id),
    class_level = VALUES(class_level),
    status = VALUES(status),
    monthly_fee = VALUES(monthly_fee),
    discount_percent = VALUES(discount_percent),
    remarks = VALUES(remarks)";

$results = ['processed' => 0, 'errors' => []];

try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare($sql);

    foreach ($students as $idx => $s) {
        // Basic normalization and defaults
        $id = $s['id'] ?? ('S-' . rand(1000, 9999));
        $feeStructure = isset($s['feeStructure']) ? $s['feeStructure'] : [];
        $totalFee = isset($feeStructure['totalFee']) ? $feeStructure['totalFee'] : (isset($s['monthly_fee']) ? $s['monthly_fee'] : 0);
        $discount = isset($feeStructure['discount']) ? $feeStructure['discount'] : (isset($s['discount']) ? $s['discount'] : 0);

        $params = [
            ':id' => $id,
            ':fullName' => $s['fullName'] ?? ($s['full_name'] ?? ''),
            ':dob' => $s['dob'] ?? null,
            ':gender' => $s['gender'] ?? null,
            ':phone' => $s['phone'] ?? null,
            ':email' => $s['email'] ?? null,
            ':address' => $s['address'] ?? null,
            ':parentName' => $s['parentName'] ?? ($s['parent_name'] ?? null),
            ':parentPhone' => $s['parentPhone'] ?? ($s['parent_phone'] ?? null),
            ':parentEmail' => $s['parentEmail'] ?? ($s['parent_email'] ?? null),
            ':admissionDate' => $s['admissionDate'] ?? ($s['admission_date'] ?? date('Y-m-d')),
            ':courseId' => $s['courseId'] ?? ($s['course_id'] ?? null),
            ':class' => $s['class'] ?? ($s['class_level'] ?? null),
            ':status' => $s['status'] ?? 'Active',
            ':totalFee' => $totalFee,
            ':discount' => $discount,
            ':remarks' => $s['remarks'] ?? null
        ];

        try {
            $stmt->execute($params);
            $results['processed']++;
        } catch (Exception $e) {
            $results['errors'][] = ['index' => $idx, 'id' => $id, 'error' => $e->getMessage()];
        }
    }

    if (count($results['errors']) === 0) {
        $pdo->commit();
    } else {
        // If any row failed, roll back for consistency
        $pdo->rollBack();
    }

    echo json_encode($results);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

?>
