<?php
require 'db.php';

try {
    $data = [];

    // Students
    $stmt = $pdo->query("SELECT * FROM students");
    $rawStudents = $stmt->fetchAll();
    $data['students'] = array_map(function($s) {
        return [
            'id' => $s['id'],
            'fullName' => $s['full_name'],
            'dob' => $s['dob'],
            'gender' => $s['gender'],
            'phone' => $s['phone'],
            'email' => $s['email'],
            'address' => $s['address'],
            'parentName' => $s['parent_name'],
            'parentPhone' => $s['parent_phone'],
            'parentEmail' => $s['parent_email'],
            'admissionDate' => $s['admission_date'],
            'courseId' => $s['course_id'],
            'class' => $s['class_level'],
            'status' => $s['status'],
            'feeStructure' => [
                'totalFee' => (float)$s['monthly_fee'],
                'isInstallment' => false,
                'installmentsCount' => 1,
                'discount' => (float)$s['discount_percent']
            ],
            'photoUrl' => $s['photo_url'],
            'remarks' => $s['remarks'],
            'assignedTeacherIds' => [] // Populated in frontend logic
        ];
    }, $rawStudents);

    // Teachers
    $stmt = $pdo->query("SELECT * FROM teachers");
    $rawTeachers = $stmt->fetchAll();
    $data['teachers'] = array_map(function($t) {
        return [
            'id' => $t['id'],
            'fullName' => $t['full_name'],
            'phone' => $t['phone'],
            'email' => $t['email'],
            'qualification' => $t['qualification'],
            'subjects' => $t['subjects'] ? explode(',', $t['subjects']) : [],
            'experience' => (int)$t['experience'],
            'joiningDate' => $t['joining_date'],
            'salaryType' => $t['salary_type'],
            'salaryAmount' => (float)$t['salary_amount'],
            'bankDetails' => [
                'accountNo' => $t['bank_account_no'],
                'ifsc' => $t['bank_ifsc']
            ],
            'status' => $t['status'],
            'assignedCourseIds' => [],
            'loginId' => $t['login_id'],
            // Password excluded for security
        ];
    }, $rawTeachers);

    // Courses
    $stmt = $pdo->query("SELECT * FROM courses");
    $rawCourses = $stmt->fetchAll();
    $data['courses'] = array_map(function($c) {
        return [
            'id' => $c['id'],
            'name' => $c['name'],
            'duration' => $c['duration'],
            'subjects' => $c['subjects'] ? explode(',', $c['subjects']) : [],
            'baseFee' => (float)$c['base_fee'],
            'teacherId' => $c['teacher_id'],
            'timings' => $c['timings']
        ];
    }, $rawCourses);

    // Attendance
    $stmt = $pdo->query("SELECT * FROM attendance ORDER BY attendance_date DESC LIMIT 2000");
    $rawAtt = $stmt->fetchAll();
    $data['attendance'] = array_map(function($a) {
        return [
            'id' => (string)$a['id'],
            'studentId' => $a['student_id'],
            'teacherId' => $a['teacher_id'],
            'courseId' => $a['course_id'],
            'date' => $a['attendance_date'],
            'status' => $a['status'],
            'remarks' => $a['remarks']
        ];
    }, $rawAtt);

    // Fees
    $stmt = $pdo->query("SELECT * FROM fee_records");
    $rawFees = $stmt->fetchAll();
    $data['feeRecords'] = array_map(function($f) {
        return [
            'id' => $f['id'],
            'studentId' => $f['student_id'],
            'amountPaid' => (float)$f['amount_paid'],
            'date' => $f['payment_date'],
            'month' => $f['for_month'],
            'mode' => $f['payment_mode'],
            'reference' => $f['reference'],
            'status' => $f['payment_status'],
            'receiptNo' => $f['receipt_no']
        ];
    }, $rawFees);

    // Salaries
    $stmt = $pdo->query("SELECT * FROM salary_records");
    $rawSal = $stmt->fetchAll();
    $data['salaryRecords'] = array_map(function($s) {
        return [
            'id' => $s['id'],
            'teacherId' => $s['teacher_id'],
            'amount' => (float)$s['amount'],
            'month' => $s['salary_month'],
            'status' => $s['status'],
            'date' => $s['payment_date'],
            'mode' => $s['payment_mode']
        ];
    }, $rawSal);

    echo json_encode($data);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
