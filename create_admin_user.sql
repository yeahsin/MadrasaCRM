-- Create Admin User Script for MadrasaStream CRM
-- This script creates an admin user in the teachers table
-- Admin has full access to the system

USE madrasa_crm;

-- Creating Admin User
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
    'ADMIN-001',                               -- id
    'System Administrator',                    -- full_name
    '+91-0000000000',                         -- phone (update this)
    'admin@madrasastream.com',                -- email (update this)
    'System Admin',                           -- qualification
    'All Subjects',                           -- subjects
    0,                                        -- experience
    CURDATE(),                                -- joining_date (current date)
    'Monthly',                                -- salary_type
    0.00,                                     -- salary_amount
    NULL,                                     -- bank_account_no
    NULL,                                     -- bank_ifsc
    'Active',                                 -- status
    'admin',                                  -- login_id
    'e10adc3949ba59abbe56e057f20f883e',      -- password (MD5 hash of '123456')
    NULL,                                     -- photo_url
    CURRENT_TIMESTAMP,                        -- created_at
    CURRENT_TIMESTAMP                         -- updated_at
);

-- IMPORTANT SECURITY NOTES:
-- 1. Default login credentials:
--    Username: admin
--    Password: 123456 (MD5 hash: e10adc3949ba59abbe56e057f20f883e)
--
-- 2. CHANGE THE PASSWORD immediately after first login
--
-- 3. Update the phone and email with actual admin contact details
--
-- 4. In production, use stronger password hashing algorithms like:
--    - bcrypt
--    - Argon2
--    - PBKDF2
--    Instead of MD5 which is shown here for demonstration only
--
-- 5. This admin user is stored in the 'teachers' table as per the current schema

-- Verify the admin user was created:
SELECT id, full_name, login_id, email, status 
FROM teachers 
WHERE login_id = 'admin';
