-- Create User Script for MadrasaStream CRM
-- This script creates users in the teachers table
-- Users can be: Admin or Teacher roles

USE madrasa_crm;

-- Example 1: Creating an Admin User
-- Admin users have full access to the system
INSERT INTO teachers (
    id,
    full_name,
    phone,
    email,
    qualification,
    subjects,
    experience,
    joining_date,
    salary_type,
    salary_amount,
    bank_account_no,
    bank_ifsc,
    status,
    login_id,
    password,
    photo_url,
    created_at,
    updated_at
) VALUES (
    'TECH-ADMIN-001',                           -- id
    'Admin User',                               -- full_name
    '+91-9876543210',                          -- phone
    'admin@madrasastream.com',                 -- email
    'System Administrator',                     -- qualification
    'All Subjects',                            -- subjects
    5,                                         -- experience
    '2024-01-01',                             -- joining_date
    'Monthly',                                 -- salary_type
    50000.00,                                  -- salary_amount
    '1234567890',                             -- bank_account_no
    'SBIN0001234',                            -- bank_ifsc
    'Active',                                  -- status
    'admin',                                   -- login_id
    'e10adc3949ba59abbe56e057f20f883e',       -- password (hashed - example: MD5 of '123456')
    NULL,                                      -- photo_url
    CURRENT_TIMESTAMP,                         -- created_at
    CURRENT_TIMESTAMP                          -- updated_at
);

-- Example 2: Creating a Teacher User
-- Teachers have access based on their assigned courses
INSERT INTO teachers (
    id,
    full_name,
    phone,
    email,
    qualification,
    subjects,
    experience,
    joining_date,
    salary_type,
    salary_amount,
    bank_account_no,
    bank_ifsc,
    status,
    login_id,
    password,
    photo_url,
    created_at,
    updated_at
) VALUES (
    'TECH-001',                                -- id
    'Muhammad Ahmed',                          -- full_name
    '+91-9123456789',                         -- phone
    'ahmed@madrasastream.com',                -- email
    'MA in Islamic Studies',                   -- qualification
    'Quran, Arabic, Fiqh',                    -- subjects
    3,                                         -- experience
    '2024-02-01',                             -- joining_date
    'Monthly',                                 -- salary_type
    25000.00,                                  -- salary_amount
    '9876543210',                             -- bank_account_no
    'HDFC0001234',                            -- bank_ifsc
    'Active',                                  -- status
    'ahmed.teacher',                           -- login_id
    'e10adc3949ba59abbe56e057f20f883e',       -- password (hashed - example: MD5 of '123456')
    NULL,                                      -- photo_url
    CURRENT_TIMESTAMP,                         -- created_at
    CURRENT_TIMESTAMP                          -- updated_at
);

-- Example 3: Creating another Teacher User
INSERT INTO teachers (
    id,
    full_name,
    phone,
    email,
    qualification,
    subjects,
    experience,
    joining_date,
    salary_type,
    salary_amount,
    bank_account_no,
    bank_ifsc,
    status,
    login_id,
    password,
    photo_url,
    created_at,
    updated_at
) VALUES (
    'TECH-002',                                -- id
    'Fatima Khan',                             -- full_name
    '+91-9234567890',                         -- phone
    'fatima@madrasastream.com',               -- email
    'BA in Arabic Language',                   -- qualification
    'Arabic, Tajweed, Hifz',                  -- subjects
    2,                                         -- experience
    '2024-03-01',                             -- joining_date
    'Monthly',                                 -- salary_type
    20000.00,                                  -- salary_amount
    '5678901234',                             -- bank_account_no
    'ICIC0001234',                            -- bank_ifsc
    'Active',                                  -- status
    'fatima.teacher',                          -- login_id
    'e10adc3949ba59abbe56e057f20f883e',       -- password (hashed - example: MD5 of '123456')
    NULL,                                      -- photo_url
    CURRENT_TIMESTAMP,                         -- created_at
    CURRENT_TIMESTAMP                          -- updated_at
);

-- IMPORTANT NOTES:
-- 1. The passwords shown above are hashed using MD5 for demonstration
--    In production, use stronger hashing like bcrypt or Argon2
-- 2. Default password '123456' (MD5: e10adc3949ba59abbe56e057f20f883e)
-- 3. You should change passwords after first login
-- 4. Adjust the id format (TECH-XXX) to match your organization's convention
-- 5. Update all personal information, contact details, and salary information
-- 6. Ensure login_id and email are unique across all users

-- To verify users were created:
-- SELECT id, full_name, login_id, email, status FROM teachers;
