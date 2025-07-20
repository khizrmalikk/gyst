-- ====================================
-- JOB-SPECIFIC CV/COVER LETTER STORAGE ENHANCEMENT
-- ====================================

-- Add job-specific document generation fields to job_applications table
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS job_specific_cv_content TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS job_specific_cover_letter_content TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cv_tailoring_notes TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cover_letter_tailoring_notes TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS documents_generated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS ai_customization_used BOOLEAN DEFAULT false;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS tailoring_keywords JSONB; -- Job-specific keywords used

-- Create dedicated table for generated documents (alternative/additional approach)
CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('cv', 'cover_letter')),
    
    -- Job context for tailoring
    job_title TEXT,
    company_name TEXT, 
    job_requirements TEXT[],
    job_description_excerpt TEXT,
    
    -- Generated content
    content TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'pdf', -- pdf, docx, txt
    filename TEXT,
    
    -- Tailoring metadata
    tailored_for_job BOOLEAN DEFAULT true,
    keywords_used TEXT[],
    sections_emphasized TEXT[],
    customization_level TEXT CHECK (customization_level IN ('general', 'basic', 'moderate', 'heavy')),
    ai_model_used TEXT,
    generation_prompt_version TEXT,
    
    -- File storage
    file_url TEXT, -- S3/storage URL if saved
    file_size INTEGER,
    mime_type TEXT DEFAULT 'application/pdf',
    
    -- Metadata
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_generated_documents_application ON generated_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_user ON generated_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_type ON generated_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_generated_documents_company ON generated_documents(company_name);

-- Create table for job-specific customization rules (future enhancement)
CREATE TABLE IF NOT EXISTS customization_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    
    -- Rule conditions
    job_title_pattern TEXT,
    company_name_pattern TEXT,
    industry TEXT,
    experience_level TEXT,
    
    -- Customization preferences
    skills_to_emphasize TEXT[],
    experience_to_highlight JSONB,
    preferred_keywords TEXT[],
    sections_to_prioritize TEXT[],
    
    -- Rule metadata
    rule_name TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints and indexes for customization rules
CREATE INDEX IF NOT EXISTS idx_customization_rules_user ON customization_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_customization_rules_active ON customization_rules(is_active);

-- Update function for timestamps
CREATE OR REPLACE FUNCTION update_generated_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_update_generated_documents_updated_at ON generated_documents;
CREATE TRIGGER trigger_update_generated_documents_updated_at
    BEFORE UPDATE ON generated_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_generated_documents_updated_at();

-- Sample query examples for job-specific document retrieval
/*
-- Get all CVs generated for a specific company
SELECT * FROM generated_documents 
WHERE user_id = $1 AND document_type = 'cv' AND company_name = $2
ORDER BY generated_at DESC;

-- Get customization statistics
SELECT 
    company_name,
    COUNT(*) as documents_generated,
    AVG(CASE WHEN customization_level = 'heavy' THEN 3 
             WHEN customization_level = 'moderate' THEN 2
             WHEN customization_level = 'basic' THEN 1
             ELSE 0 END) as avg_customization_score
FROM generated_documents 
WHERE user_id = $1 
GROUP BY company_name
ORDER BY documents_generated DESC;

-- Find most effective keywords across applications
SELECT 
    unnest(keywords_used) as keyword,
    COUNT(*) as usage_count,
    array_agg(DISTINCT company_name) as companies_used_for
FROM generated_documents 
WHERE user_id = $1 AND tailored_for_job = true
GROUP BY keyword
ORDER BY usage_count DESC
LIMIT 20;
*/ 