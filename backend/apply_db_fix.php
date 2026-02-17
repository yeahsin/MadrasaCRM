<?php
require 'db.php';

try {
    echo "Starting database update...\n";

    // 1. Add Unique Constraints if they don't exist
    // Note: We use a try-catch for the ALTER because if it already exists it might throw
    try {
        $pdo->exec("ALTER TABLE attendance ADD UNIQUE KEY unique_student_attendance (student_id, attendance_date)");
        echo "Added unique_student_attendance constraint.\n";
    } catch (Exception $e) {
        echo "Constraint unique_student_attendance might already exist or failed: " . $e->getMessage() . "\n";
    }

    try {
        $pdo->exec("ALTER TABLE attendance ADD UNIQUE KEY unique_teacher_attendance (teacher_id, student_id, attendance_date)");
        echo "Added unique_teacher_attendance constraint.\n";
    } catch (Exception $e) {
        echo "Constraint unique_teacher_attendance might already exist or failed: " . $e->getMessage() . "\n";
    }

    echo "Database update completed.\n";

} catch (Exception $e) {
    echo "Fatal Error: " . $e->getMessage() . "\n";
}
?>