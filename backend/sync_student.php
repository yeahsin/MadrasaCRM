<?php
require 'db.php';
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['id'])) die(json_encode(['error' => 'No ID']));

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

try {
    $stmt = $pdo->prepare($sql);
    $params = [
        ':id' => $data['id'],
        ':fullName' => $data['fullName'],
        ':dob' => $data['dob'],
        ':gender' => $data['gender'],
        ':phone' => $data['phone'],
        ':email' => $data['email'],
        ':address' => $data['address'],
        ':parentName' => $data['parentName'],
        ':parentPhone' => $data['parentPhone'],
        ':parentEmail' => $data['parentEmail'],
        ':admissionDate' => $data['admissionDate'],
        ':courseId' => $data['courseId'],
        ':class' => $data['class'],
        ':status' => $data['status'],
        ':totalFee' => $data['feeStructure']['totalFee'],
        ':discount' => $data['feeStructure']['discount'],
        ':remarks' => $data['remarks'] ?? ''
    ];
    
    $stmt->execute($params);
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>