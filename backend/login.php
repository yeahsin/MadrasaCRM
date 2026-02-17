<?php
require 'db.php';
$data = json_decode(file_get_contents("php://input"), true);

$loginId = $data['loginId'] ?? '';
$password = $data['password'] ?? '';

if ($loginId === 'admin' && $password === 'admin') {
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => 'admin-1',
            'name' => 'Mudir (Director)',
            'email' => 'admin@madrasa.com',
            'role' => 'ADMIN',
            'avatar' => 'https://ui-avatars.com/api/?name=Mudir&background=064e3b&color=fff'
        ]
    ]);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT * FROM teachers WHERE login_id = :loginId AND password = :password");
    $stmt->execute([':loginId' => $loginId, ':password' => $password]);
    $teacher = $stmt->fetch();

    if ($teacher) {
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $teacher['id'],
                'name' => $teacher['full_name'],
                'email' => $teacher['email'],
                'role' => 'TEACHER',
                'teacherId' => $teacher['id'],
                'avatar' => 'https://ui-avatars.com/api/?name=' . urlencode($teacher['full_name']) . '&background=d97706&color=fff'
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>