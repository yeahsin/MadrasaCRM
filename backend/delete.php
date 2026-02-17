<?php
require 'db.php';
$type = $_GET['type'] ?? '';
$id = $_GET['id'] ?? '';

if (!$type || !$id) die(json_encode(['error' => 'Missing parameters']));

$table = '';
if ($type === 'student') $table = 'students';
if ($type === 'teacher') $table = 'teachers';
if ($type === 'course') $table = 'courses';

if (!$table) die(json_encode(['error' => 'Invalid type']));

try {
    $stmt = $pdo->prepare("DELETE FROM $table WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>