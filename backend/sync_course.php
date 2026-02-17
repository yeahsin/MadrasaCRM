<?php
require 'db.php';
$data = json_decode(file_get_contents("php://input"), true);

$sql = "INSERT INTO courses (
    id, name, duration, base_fee, teacher_id, timings, subjects
) VALUES (
    :id, :name, :duration, :baseFee, :teacherId, :timings, :subjects
) ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    duration = VALUES(duration),
    base_fee = VALUES(base_fee),
    teacher_id = VALUES(teacher_id),
    timings = VALUES(timings),
    subjects = VALUES(subjects)";

try {
    $stmt = $pdo->prepare($sql);
    $params = [
        ':id' => $data['id'],
        ':name' => $data['name'],
        ':duration' => $data['duration'],
        ':baseFee' => $data['baseFee'],
        ':teacherId' => $data['teacherId'],
        ':timings' => $data['timings'],
        ':subjects' => implode(',', $data['subjects'])
    ];
    
    $stmt->execute($params);
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>