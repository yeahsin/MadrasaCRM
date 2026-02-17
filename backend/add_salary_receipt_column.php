<?php
require 'db.php';

try {
    echo "Adding receipt_no column to salary_records table...\n";
    $pdo->exec("ALTER TABLE salary_records ADD COLUMN receipt_no VARCHAR(20) AFTER payment_mode");
    echo "Column added successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
