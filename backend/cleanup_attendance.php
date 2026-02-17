<?php
require 'db.php';

try {
    // Keep only the latest (highest ID) record for each student per day
    $sql = "DELETE a1 FROM attendance a1
            INNER JOIN attendance a2 
            WHERE a1.id < a2.id 
            AND a1.student_id = a2.student_id 
            AND a1.attendance_date = a2.attendance_date
            AND a1.student_id IS NOT NULL";
            
    $count = $pdo->exec($sql);
    echo "Cleaned up $count duplicate student attendance records.\n";

    // Also handle teachers just in case
    $sqlTeachers = "DELETE a1 FROM attendance a1
            INNER JOIN attendance a2 
            WHERE a1.id < a2.id 
            AND a1.teacher_id = a2.teacher_id 
            AND a1.attendance_date = a2.attendance_date
            AND a1.student_id IS NULL";
            
    $countT = $pdo->exec($sqlTeachers);
    echo "Cleaned up $countT duplicate teacher attendance records.\n";

} catch (Exception $e) {
    echo "Error during cleanup: " . $e->getMessage() . "\n";
}
?>