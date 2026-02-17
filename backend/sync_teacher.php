<?php
require 'db.php';
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['id'])) die(json_encode(['error' => 'No ID']));

$sql = "INSERT INTO teachers (
    id, full_name, phone, email, qualification, subjects, experience,
    joining_date, salary_type, salary_amount, bank_account_no, bank_ifsc,
    status, login_id, password
) VALUES (
    :id, :fullName, :phone, :email, :qualification, :subjects, :experience,
    :joiningDate, :salaryType, :salaryAmount, :accountNo, :ifsc,
    :status, :loginId, :password
) ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    phone = VALUES(phone),
    email = VALUES(email),
    qualification = VALUES(qualification),
    subjects = VALUES(subjects),
    experience = VALUES(experience),
    joining_date = VALUES(joining_date),
    salary_type = VALUES(salary_type),
    salary_amount = VALUES(salary_amount),
    bank_account_no = VALUES(bank_account_no),
    bank_ifsc = VALUES(bank_ifsc),
    status = VALUES(status),
    login_id = VALUES(login_id),
    password = IF(VALUES(password) = '', password, VALUES(password))";

try {
    $stmt = $pdo->prepare($sql);
    $params = [
        ':id' => $data['id'],
        ':fullName' => $data['fullName'],
        ':phone' => $data['phone'],
        ':email' => $data['email'],
        ':qualification' => $data['qualification'],
        ':subjects' => implode(',', $data['subjects']),
        ':experience' => $data['experience'],
        ':joiningDate' => $data['joiningDate'],
        ':salaryType' => $data['salaryType'],
        ':salaryAmount' => $data['salaryAmount'],
        ':accountNo' => $data['bankDetails']['accountNo'],
        ':ifsc' => $data['bankDetails']['ifsc'],
        ':status' => $data['status'],
        ':loginId' => $data['loginId'] ?? null,
        ':password' => $data['password'] ?? ''
    ];
    
    $stmt->execute($params);
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>