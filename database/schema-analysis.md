# Database Schema Analysis for Extension Application Tracking

## ✅ What Currently Works

### **job_applications** table
- ✅ `id`, `user_id`, `job_url`, `job_title`, `company_name` - Basic job info
- ✅ `application_status` - Status tracking  
- ✅ `application_data` (jsonb) - Can store custom data
- ✅ `applied_at`, `created_at`, `updated_at` - Timestamps

### **user_profiles** table  
- ✅ Has all user profile fields we need for the extension
- ✅ `skills` array, `full_name`, `email`, `phone`, `location`, etc.

## ❌ What's Missing/Needs Changes

### **1. Extension-Specific Fields**
Current `job_applications` table lacks explicit fields for:
- `application_method` (chrome_extension, manual, etc.)
- `cv_generated` (boolean)
- `cover_letter_generated` (boolean) 
- `form_fields_count` (integer)
- `ai_responses_count` (integer)
- `job_description` (text)
- `job_requirements` (text array)
- `job_salary` (text)
- `page_title` (text)
- `page_type` (text)

### **2. Document Tracking**
No dedicated table/fields for:
- CV file references
- Cover Letter file references  
- Document metadata (filenames, URLs, etc.)

### **3. Form Data Storage**
No structure for:
- Form field mappings
- AI-generated responses
- Form submission data

### **4. Session/Action Tracking**
No way to track:
- User actions during application process
- Session timeline
- Step-by-step workflow progress

## 🔧 Recommended Schema Updates

### **Option 1: Extend Existing Table (Recommended)**
```sql
-- Add new columns to job_applications table
ALTER TABLE public.job_applications 
ADD COLUMN application_method text DEFAULT 'manual',
ADD COLUMN cv_generated boolean DEFAULT false,
ADD COLUMN cover_letter_generated boolean DEFAULT false,
ADD COLUMN form_fields_count integer DEFAULT 0,
ADD COLUMN ai_responses_count integer DEFAULT 0,
ADD COLUMN job_description text,
ADD COLUMN job_requirements text[],
ADD COLUMN job_salary text,
ADD COLUMN job_location text,
ADD COLUMN page_title text,
ADD COLUMN page_type text,
ADD COLUMN form_data jsonb,
ADD COLUMN documents_data jsonb,
ADD COLUMN session_data jsonb;

-- Update application_data to store less critical metadata
-- Keep workflow_id but make it optional for extension apps
ALTER TABLE public.job_applications 
ALTER COLUMN workflow_id DROP NOT NULL;
```

### **Option 2: Create Extension-Specific Table**
```sql
-- New table specifically for extension applications
CREATE TABLE public.extension_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  
  -- Job Information
  job_title text NOT NULL,
  company_name text NOT NULL,
  job_url text NOT NULL,
  job_location text,
  job_description text,
  job_requirements text[],
  job_salary text,
  
  -- Application Data
  application_status text NOT NULL DEFAULT 'submitted',
  application_method text NOT NULL DEFAULT 'chrome_extension',
  applied_at timestamp with time zone DEFAULT now(),
  
  -- Extension-Specific Tracking
  cv_generated boolean DEFAULT false,
  cover_letter_generated boolean DEFAULT false,
  form_fields_count integer DEFAULT 0,
  ai_responses_count integer DEFAULT 0,
  
  -- Form & Document Data
  form_data jsonb,
  documents_data jsonb,
  
  -- Page Metadata
  page_title text,
  page_type text,
  
  -- Session Tracking
  session_data jsonb,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT extension_applications_pkey PRIMARY KEY (id),
  CONSTRAINT extension_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id)
);
```

### **Option 3: Document Storage Table**
```sql
-- Separate table for generated documents
CREATE TABLE public.application_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('cv', 'cover_letter')),
  file_name text NOT NULL,
  file_path text,
  file_url text,
  generated_at timestamp with time zone DEFAULT now(),
  content_preview text,
  
  CONSTRAINT application_documents_pkey PRIMARY KEY (id),
  CONSTRAINT application_documents_application_id_fkey 
    FOREIGN KEY (application_id) REFERENCES public.job_applications(id)
);
```

## 🔧 Immediate Fix for Current Implementation

### **Quick Solution: Use Existing Structure**
You can make the current system work by:

1. **Store extension data in `application_data` jsonb field:**
```json
{
  "applicationMethod": "chrome_extension",
  "cvGenerated": true,
  "coverLetterGenerated": true,
  "formFieldsCount": 12,
  "aiResponsesCount": 3,
  "jobInfo": {
    "description": "...",
    "requirements": ["React", "Node.js"],
    "salary": "$120k-150k"
  },
  "formData": [...],
  "documentsData": {...},
  "sessionData": {...},
  "metadata": {
    "pageTitle": "...",
    "pageType": "application_form"
  }
}
```

2. **Handle `workflow_id` requirement:**
   - Create a default workflow for extension applications
   - Or modify the constraint to allow NULL

3. **Map extension fields to existing fields:**
   - Use existing `job_title`, `company_name`, `job_url`
   - Store everything else in `application_data`

## 🚀 Implementation Priority

### **Phase 1: Quick Fix (Now)**
- Modify API to work with existing `job_applications` table
- Store extension-specific data in `application_data` jsonb
- Handle `workflow_id` requirement

### **Phase 2: Schema Enhancement (Later)**  
- Add explicit columns for common extension fields
- Create document tracking table
- Add indexes for better performance

### **Phase 3: Advanced Features (Future)**
- Session tracking table
- Email integration tables
- Analytics and reporting tables

## 💡 Recommended Next Steps

1. **Update API to use existing table structure**
2. **Add schema migration for missing fields**
3. **Test with extension data**
4. **Plan future schema enhancements**

The current schema can work with modifications, but adding explicit fields will improve performance and querying capabilities. 