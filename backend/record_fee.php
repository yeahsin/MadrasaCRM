<?php
require 'db.php';
$data = json_decode(file_get_contents("php://input"), true);

$sql = "INSERT INTO fee_records (
    id, student_id, amount_paid, payment_date, for_month, 
    payment_mode, reference, payment_status, receipt_no
) VALUES (
    :id, :studentId, :amountPaid, :date, :month,
    :mode, :reference, :status, :receiptNo
)";

try {
    $stmt = $pdo->prepare($sql);
    $params = [
        ':id' => $data['id'],
        ':studentId' => $data['studentId'],
        ':amountPaid' => $data['amountPaid'],
        ':date' => $data['date'],
        ':month' => $data['month'],
        ':mode' => $data['mode'],
        ':reference' => $data['reference'],
        ':status' => $data['status'],
        ':receiptNo' => $data['receiptNo']
    ];
    $stmt->execute($params);
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>