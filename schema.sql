
-- MadrasaStream CRM: Production Database Schema (MySQL)
-- Normalized relational structure for Students, Teachers, Batches, and Finance

CREATE DATABASE IF NOT EXISTS madrasa_crm;
USE madrasa_crm;

-- 1. TEACHERS MODULE
-- Stores teacher master data and login credentials created by Admin
CREATE TABLE teachers (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255) UNIQUE,
    qualification TEXT,
    subjects TEXT, -- Stored as comma-separated or JSON if using newer MySQL
    experience INT DEFAULT 0,
    joining_date DATE,
    salary_type ENUM('Monthly', 'Hourly', 'Per Class') DEFAULT 'Monthly',
    salary_amount DECIMAL(10, 2),
    bank_account_no VARCHAR(50),
    bank_ifsc VARCHAR(20),
    status ENUM('Active', 'On Leave', 'Resigned') DEFAULT 'Active',
    login_id VARCHAR(50) UNIQUE,
    password VARCHAR(255), -- Should be stored as a hash in production
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. COURSES / BATCHES (HALQAT) MODULE
-- Relates teachers to specific batches
CREATE TABLE courses (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    duration VARCHAR(100), -- e.g., '4 Months', 'Indefinite'
    base_fee DECIMAL(10, 2) NOT NULL,
    teacher_id VARCHAR(50),
    timings VARCHAR(100), -- e.g., '8:00 AM - 10:00 AM'
    subjects TEXT,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

-- 3. STUDENTS MODULE
-- Stores student master records linked to a primary Course
CREATE TABLE students (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    dob DATE,
    gender ENUM('Male', 'Female', 'Other'),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    parent_name VARCHAR(255),
    parent_phone VARCHAR(20),
    parent_email VARCHAR(255),
    admission_date DATE,
    course_id VARCHAR(50),
    class_level VARCHAR(100), -- e.g., 'Grade 5', 'Hifz Level 1'
    status ENUM('Active', 'Inactive', 'Dropped', 'Completed') DEFAULT 'Active',
    monthly_fee DECIMAL(10, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    photo_url TEXT,
    id_proof_url TEXT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

-- 4. ATTENDANCE MODULE
-- Tracks daily attendance for students and teachers
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50),
    teacher_id VARCHAR(50),
    course_id VARCHAR(50),
    attendance_date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Late') DEFAULT 'Present',
    remarks TEXT,
    marked_by_role ENUM('ADMIN', 'TEACHER', 'SUBSTITUTE') DEFAULT 'ADMIN',
    UNIQUE KEY unique_student_attendance (student_id, attendance_date),
    UNIQUE KEY unique_teacher_attendance (teacher_id, student_id, attendance_date),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 5. STUDENT FEES MODULE
-- Records financial transactions for student fees
CREATE TABLE fee_records (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    for_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    payment_mode ENUM('Cash', 'UPI', 'Bank', 'Card') DEFAULT 'Cash',
    reference VARCHAR(255), -- e.g., Transaction ID
    payment_status ENUM('Paid', 'Partial', 'Due') DEFAULT 'Paid',
    receipt_no VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 6. TEACHER SALARY MODULE
-- Manages staff payroll history
CREATE TABLE salary_records (
    id VARCHAR(50) PRIMARY KEY,
    teacher_id VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    salary_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    status ENUM('Paid', 'Pending') DEFAULT 'Pending',
    payment_date DATE,
    payment_mode ENUM('Cash', 'Bank Transfer', 'UPI', 'Cheque'),
    payslip_no VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- 7. PERFORMANCE & ASSESSMENTS
-- Academic tracking for tests and hifz logs
CREATE TABLE test_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    marks_obtained DECIMAL(5, 2),
    total_marks DECIMAL(5, 2),
    grade VARCHAR(5),
    test_date DATE,
    teacher_remarks TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 8. NOTIFICATIONS & ANNOUNCEMENTS
-- System-wide or batch-specific notices
CREATE TABLE notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_role ENUM('ALL', 'TEACHERS', 'STUDENTS') DEFAULT 'ALL',
    course_id VARCHAR(50), -- Optional: for batch-specific notices
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);
