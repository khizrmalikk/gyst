-- Diagnostic Script: Check existing columns in job_applications table
-- Run this first to see what columns already exist

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'job_applications'
ORDER BY ordinal_position; 