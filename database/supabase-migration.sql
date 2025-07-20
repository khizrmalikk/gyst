-- Migration script to prepare existing Supabase schema for extension application tracking
-- Run this in your Supabase SQL editor

-- 1. Make workflow_id optional for extension applications
ALTER TABLE public.job_applications 
ALTER COLUMN workflow_id DROP NOT NULL;

-- 2. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON public.job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_job_applications_applied_at ON public.job_applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_company ON public.job_applications(company_name);

-- 3. Add index for extension applications specifically
CREATE INDEX IF NOT EXISTS idx_job_applications_extension 
ON public.job_applications((application_data->>'applicationMethod')) 
WHERE application_data->>'applicationMethod' = 'chrome_extension';

-- 4. Create a view for easier extension application queries
CREATE OR REPLACE VIEW public.extension_applications_view AS
SELECT 
  ja.id,
  ja.user_id,
  ja.job_url,
  ja.job_title,
  ja.company_name,
  ja.application_status,
  ja.applied_at,
  ja.created_at,
  ja.updated_at,
  -- Extract extension-specific fields from jsonb
  (ja.application_data->>'applicationMethod') as application_method,
  (ja.application_data->>'cvGenerated')::boolean as cv_generated,
  (ja.application_data->>'coverLetterGenerated')::boolean as cover_letter_generated,
  (ja.application_data->>'formFieldsCount')::integer as form_fields_count,
  (ja.application_data->>'aiResponsesCount')::integer as ai_responses_count,
  (ja.application_data->'jobInfo'->>'location') as job_location,
  (ja.application_data->'jobInfo'->>'salary') as job_salary,
  (ja.application_data->'metadata'->>'pageType') as page_type,
  (ja.application_data->'metadata'->>'pageTitle') as page_title,
  ja.application_data->'jobInfo' as job_info,
  ja.application_data->'formData' as form_data,
  ja.application_data->'metadata' as metadata
FROM public.job_applications ja
WHERE ja.application_data->>'applicationMethod' = 'chrome_extension';

-- 5. Create helper function to get extension applications for a user
CREATE OR REPLACE FUNCTION public.get_user_extension_applications(p_user_id text)
RETURNS TABLE (
  id uuid,
  job_title text,
  company_name text,
  job_location text,
  job_salary text,
  application_status text,
  cv_generated boolean,
  cover_letter_generated boolean,
  form_fields_count integer,
  ai_responses_count integer,
  applied_at timestamptz,
  job_url text,
  page_type text,
  application_data jsonb
) 
LANGUAGE sql
STABLE
AS $$
  SELECT 
    ja.id,
    ja.job_title,
    ja.company_name,
    (ja.application_data->'jobInfo'->>'location') as job_location,
    (ja.application_data->'jobInfo'->>'salary') as job_salary,
    ja.application_status,
    (ja.application_data->>'cvGenerated')::boolean as cv_generated,
    (ja.application_data->>'coverLetterGenerated')::boolean as cover_letter_generated,
    (ja.application_data->>'formFieldsCount')::integer as form_fields_count,
    (ja.application_data->>'aiResponsesCount')::integer as ai_responses_count,
    ja.applied_at,
    ja.job_url,
    (ja.application_data->'metadata'->>'pageType') as page_type,
    ja.application_data
  FROM public.job_applications ja
  WHERE ja.user_id = p_user_id
    AND ja.application_data->>'applicationMethod' = 'chrome_extension'
  ORDER BY ja.applied_at DESC;
$$;

-- 6. Create function to create extension applications
CREATE OR REPLACE FUNCTION public.create_extension_application(
  p_user_id text,
  p_job_title text,
  p_company_name text,
  p_job_url text,
  p_application_status text DEFAULT 'submitted',
  p_application_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_application_id uuid;
  v_workflow_id uuid;
BEGIN
  -- Create or get default workflow for extension applications
  SELECT id INTO v_workflow_id 
  FROM public.workflows 
  WHERE user_id = p_user_id 
    AND search_query = 'Extension Applications'
  LIMIT 1;
  
  IF v_workflow_id IS NULL THEN
    INSERT INTO public.workflows (user_id, search_query, status)
    VALUES (p_user_id, 'Extension Applications', 'active')
    RETURNING id INTO v_workflow_id;
  END IF;
  
  -- Insert the application
  INSERT INTO public.job_applications (
    workflow_id,
    user_id,
    job_id,
    job_url,
    job_title,
    company_name,
    application_status,
    application_data
  ) VALUES (
    v_workflow_id,
    p_user_id,
    'ext_' || gen_random_uuid()::text, -- Generate unique job_id for extension apps
    p_job_url,
    p_job_title,
    p_company_name,
    p_application_status,
    p_application_data
  )
  RETURNING id INTO v_application_id;
  
  RETURN v_application_id;
END;
$$;

-- 7. Add RLS policies if they don't exist (uncomment if you're using Row Level Security)
/*
-- Enable RLS
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own applications
CREATE POLICY "Users can view their own applications" ON public.job_applications
FOR SELECT USING (auth.uid()::text = user_id);

-- Policy for users to create their own applications
CREATE POLICY "Users can create their own applications" ON public.job_applications
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy for users to update their own applications
CREATE POLICY "Users can update their own applications" ON public.job_applications
FOR UPDATE USING (auth.uid()::text = user_id);
*/

-- 8. Add comments for documentation
COMMENT ON COLUMN public.job_applications.application_data IS 'Extension-specific data stored as JSON including CV generation, form data, AI responses, etc.';
COMMENT ON VIEW public.extension_applications_view IS 'Simplified view of applications created through the Chrome extension';
COMMENT ON FUNCTION public.get_user_extension_applications IS 'Helper function to retrieve extension applications for a specific user';
COMMENT ON FUNCTION public.create_extension_application IS 'Helper function to create new extension applications with proper workflow assignment';

-- Migration complete!
-- You can now use the existing job_applications table with extension data stored in the application_data jsonb field 