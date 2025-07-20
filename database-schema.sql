-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE user_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE, -- From Clerk authentication
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    location TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    website_url TEXT,
    ethnicity TEXT,
    gender TEXT,
    additional_information TEXT,
    skills TEXT[] DEFAULT '{}',
    profile_complete BOOLEAN DEFAULT FALSE,
    cv_uploaded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Education table
CREATE TABLE education (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    field_of_study TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    gpa TEXT,
    description TEXT,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Experience table
CREATE TABLE experience (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    location TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    description TEXT NOT NULL,
    skills_used TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Certifications table
CREATE TABLE certifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    issuer TEXT NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    credential_id TEXT,
    credential_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Languages table
CREATE TABLE languages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    proficiency TEXT NOT NULL CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'native')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CV upload history table
CREATE TABLE cv_uploads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    extracted_data JSONB,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_education_user_id ON education(user_id);
CREATE INDEX idx_experience_user_id ON experience(user_id);
CREATE INDEX idx_certifications_user_id ON certifications(user_id);
CREATE INDEX idx_languages_user_id ON languages(user_id);
CREATE INDEX idx_cv_uploads_user_id ON cv_uploads(user_id);

-- Create update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_education_updated_at
    BEFORE UPDATE ON education
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experience_updated_at
    BEFORE UPDATE ON experience
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certifications_updated_at
    BEFORE UPDATE ON certifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_languages_updated_at
    BEFORE UPDATE ON languages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cv_uploads_updated_at
    BEFORE UPDATE ON cv_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_uploads ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Similar policies for related tables
CREATE POLICY "Users can view their own education" ON education
    FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can modify their own education" ON education
    FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view their own experience" ON experience
    FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can modify their own experience" ON experience
    FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view their own certifications" ON certifications
    FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can modify their own certifications" ON certifications
    FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view their own languages" ON languages
    FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can modify their own languages" ON languages
    FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view their own cv uploads" ON cv_uploads
    FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can modify their own cv uploads" ON cv_uploads
    FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()::text)); 