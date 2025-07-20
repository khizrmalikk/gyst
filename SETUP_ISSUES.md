# Setup Issues & Solutions

## 🚨 Critical Issue: Node.js Version

**Problem:** You're running Node.js v16.17.0, but Next.js requires Node.js version "^18.18.0 || ^19.8.0 || >= 20.0.0"

**Solution:** Update Node.js to a supported version.

### Option 1: Update Node.js (Recommended)
```bash
# Using Node Version Manager (nvm) - recommended
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Or using Homebrew on macOS
brew install node@20
brew link node@20 --force

# Or download directly from nodejs.org
# Visit: https://nodejs.org/en/download/
```

### Option 2: Use Docker (Alternative)
```bash
# Create a Dockerfile if you prefer containerization
docker run -it -v $(pwd):/app -w /app -p 3000:3000 node:20 npm run dev
```

### Verify Installation
```bash
node --version  # Should show v20.x.x or v18.18.0+
npm --version   # Should be compatible
```

## 📋 Complete Setup Checklist

### 1. System Requirements
- [x] Node.js 18.18.0+ or 20.x.x ⚠️ **YOU NEED TO UPDATE THIS**
- [x] Chrome browser for extension testing
- [x] Supabase account (for database)

### 2. Database Setup
- [ ] Run the migration script: `database/supabase-migration.sql`
- [ ] Connect your Supabase credentials in environment variables
- [ ] Test database connection

### 3. Environment Variables
Create `.env.local` with:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# OpenAI for AI features
OPENAI_API_KEY=your_openai_api_key
```

### 4. Installation & Start
```bash
# After updating Node.js
npm install
npm run dev
```

### 5. Extension Testing
```bash
# Test the APIs work
curl http://localhost:3000/api/health/public
curl http://localhost:3000/api/extension/profile

# Load extension in Chrome
# Go to chrome://extensions/
# Enable Developer mode
# Click "Load unpacked"
# Select the `extension` folder
```

## 🔧 Schema Compatibility

**Good News:** Your current Supabase schema **can work** with our extension tracking system!

### What Works:
- ✅ `job_applications` table exists
- ✅ `application_data` jsonb field can store extension data
- ✅ `user_profiles` table has all needed user data
- ✅ Basic structure supports the workflow

### What Needs Migration:
- ❌ `workflow_id` is required but not needed for extension apps
- ❌ Missing indexes for performance
- ❌ No helper functions for extension queries

### Migration Steps:
1. **Run the migration script:** Copy and execute `database/supabase-migration.sql` in your Supabase SQL editor
2. **Test the changes:** The migration makes `workflow_id` optional and adds helpful indexes
3. **Verify compatibility:** Extension applications will now work with your existing schema

### Data Structure Mapping:
```json
// Extension data stored in application_data jsonb field:
{
  "applicationMethod": "chrome_extension",
  "cvGenerated": true,
  "coverLetterGenerated": true,
  "formFieldsCount": 12,
  "aiResponsesCount": 3,
  "jobInfo": {
    "location": "San Francisco, CA",
    "description": "...",
    "requirements": ["React", "Node.js"],
    "salary": "$120k-150k"
  },
  "formData": [...],
  "documentsData": {...},
  "metadata": {
    "pageTitle": "Job Title - Company",
    "pageType": "application_form"
  }
}
```

## 🚀 Quick Start Commands

**After updating Node.js and running migration:**

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. In another terminal, test extension APIs
curl -s http://localhost:3000/api/extension/profile | jq
curl -s -X POST http://localhost:3000/api/extension/generate-cv \
  -H "Content-Type: application/json" \
  -d '{"jobInfo":{"title":"Test","company":"Test"},"userProfile":{"name":"Test"}}' \
  --output test.pdf

# 4. Load extension in Chrome
# Go to chrome://extensions/
# Click "Load unpacked" and select the extension folder
```

## ❗ Priority Actions

1. **🔴 URGENT: Update Node.js** (required for server to start)
2. **🟡 Run Database Migration** (required for extension data storage)
3. **🟢 Test Extension** (follow EXTENSION_TESTING_GUIDE.md)

Your schema is compatible - you just need to run the migration and update Node.js! 