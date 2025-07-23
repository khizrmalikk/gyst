-- Tailored Profiles Schema
-- Stores job-specific versions of user profiles, tailored by AI for specific positions

-- Create tailored_profiles table
CREATE TABLE IF NOT EXISTS tailored_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  
  -- Profile identification
  label VARCHAR(255) NOT NULL, -- Format: "CompanyName-JobTitle"
  company_name VARCHAR(255) NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  
  -- Original job information used for tailoring
  job_description TEXT,
  job_requirements TEXT[],
  job_url VARCHAR(500),
  
  -- Tailored profile data (JSON format matching main profile structure)
  tailored_data JSONB NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Performance optimization
  CONSTRAINT unique_user_label UNIQUE(user_id, label)
);

-- Create indexes for performance
CREATE INDEX idx_tailored_profiles_user_id ON tailored_profiles(user_id);
CREATE INDEX idx_tailored_profiles_label ON tailored_profiles(user_id, label);
CREATE INDEX idx_tailored_profiles_company ON tailored_profiles(company_name);
CREATE INDEX idx_tailored_profiles_created_at ON tailored_profiles(created_at DESC);
CREATE INDEX idx_tailored_profiles_last_used ON tailored_profiles(last_used_at DESC NULLS LAST);

-- Add GIN index for JSONB tailored_data for fast searches
CREATE INDEX idx_tailored_profiles_data_gin ON tailored_profiles USING GIN (tailored_data);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tailored_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_tailored_profiles_updated_at
  BEFORE UPDATE ON tailored_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_tailored_profiles_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE tailored_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own tailored profiles
CREATE POLICY tailored_profiles_user_policy ON tailored_profiles
  FOR ALL USING (
    auth.uid()::text = user_id::text
  );

-- Create function to enforce max 10 profiles per user
CREATE OR REPLACE FUNCTION check_max_tailored_profiles()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM tailored_profiles WHERE user_id = NEW.user_id) >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 tailored profiles allowed per user. Please delete an existing profile first.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce max profiles limit
CREATE TRIGGER trigger_max_tailored_profiles
  BEFORE INSERT ON tailored_profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_max_tailored_profiles();

-- Create function to generate unique labels
CREATE OR REPLACE FUNCTION generate_tailored_profile_label(
  p_user_id UUID,
  p_company_name VARCHAR,
  p_job_title VARCHAR
)
RETURNS VARCHAR AS $$
DECLARE
  base_label VARCHAR;
  final_label VARCHAR;
  counter INTEGER := 1;
BEGIN
  -- Clean and format the base label
  base_label := TRIM(
    REGEXP_REPLACE(
      CONCAT(
        REGEXP_REPLACE(p_company_name, '[^a-zA-Z0-9\s]', '', 'g'),
        '-',
        REGEXP_REPLACE(p_job_title, '[^a-zA-Z0-9\s]', '', 'g')
      ),
      '\s+', '', 'g'
    )
  );
  
  -- Ensure label isn't too long
  IF LENGTH(base_label) > 200 THEN
    base_label := LEFT(base_label, 200);
  END IF;
  
  final_label := base_label;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (
    SELECT 1 FROM tailored_profiles 
    WHERE user_id = p_user_id AND label = final_label
  ) LOOP
    counter := counter + 1;
    final_label := base_label || '-' || counter;
  END LOOP;
  
  RETURN final_label;
END;
$$ LANGUAGE plpgsql;

-- Create view for easy querying with profile details
CREATE OR REPLACE VIEW tailored_profiles_summary AS
SELECT 
  tp.id,
  tp.user_id,
  tp.label,
  tp.company_name,
  tp.job_title,
  tp.created_at,
  tp.updated_at,
  tp.last_used_at,
  p.name as user_name,
  p.email as user_email,
  -- Extract key fields from tailored_data for quick access
  tp.tailored_data->>'summary' as tailored_summary,
  ARRAY_LENGTH(ARRAY(SELECT jsonb_array_elements_text(tp.tailored_data->'skills')), 1) as skills_count,
  ARRAY_LENGTH(ARRAY(SELECT jsonb_array_elements(tp.tailored_data->'workHistory')), 1) as work_history_count
FROM tailored_profiles tp
JOIN profiles p ON tp.user_id = p.user_id;

-- Sample data structure for tailored_data JSONB field:
/*
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "location": "San Francisco, CA",
  "summary": "Tailored summary emphasizing relevant experience for this specific role...",
  "skills": ["React", "Node.js", "Python", "AWS"],
  "workHistory": [
    {
      "title": "Senior Software Engineer",
      "company": "TechCorp",
      "duration": "2021-2023",
      "location": "San Francisco, CA", 
      "description": "Tailored description highlighting achievements relevant to target role...",
      "skills": ["React", "Node.js"]
    }
  ],
  "education": {
    "degree": "BS Computer Science",
    "school": "University of California",
    "year": "2020",
    "field": "Computer Science",
    "gpa": "3.8"
  },
  "certifications": [
    {
      "name": "AWS Certified Developer",
      "issuer": "Amazon",
      "issue_date": "2022-01-01"
    }
  ],
  "languages": [
    {
      "language": "English",
      "proficiency": "Native"
    }
  ],
  "linkedIn": "https://linkedin.com/in/johndoe",
  "portfolio": "https://johndoe.dev",
  "website": "https://johndoe.com"
}
*/

-- Add helpful comments
COMMENT ON TABLE tailored_profiles IS 'Stores job-specific tailored versions of user profiles, optimized for specific positions and companies';
COMMENT ON COLUMN tailored_profiles.label IS 'Unique identifier in format CompanyName-JobTitle, generated automatically';
COMMENT ON COLUMN tailored_profiles.tailored_data IS 'Complete profile data tailored by AI for the specific job, stored in JSON format matching the main profile structure';
COMMENT ON COLUMN tailored_profiles.job_description IS 'Original job description used to create this tailored profile';
COMMENT ON COLUMN tailored_profiles.job_requirements IS 'Array of key job requirements extracted from the job posting';
COMMENT ON COLUMN tailored_profiles.last_used_at IS 'Timestamp of when this tailored profile was last used for form filling or document generation'; 