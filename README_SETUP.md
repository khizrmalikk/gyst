# Job Application Bot - Setup & Troubleshooting Guide

## 🚨 Current Issues & Solutions

### Issue 1: OpenAI Quota Exceeded (429 Error)

**Error Message:** `429 You exceeded your current quota, please check your plan and billing details`

**Solution Options:**

#### Option A: Set up OpenAI Billing (Recommended)
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to **Settings** → **Billing**
3. Add a payment method
4. Add credits to your account (minimum $5)
5. Wait 5-10 minutes for the quota to update

#### Option B: Use Fallback Mode (Works Immediately)
The system now automatically falls back to template-based responses when OpenAI is unavailable.

**Fallback Features:**
- ✅ Keyword-based job search parsing
- ✅ Template-based cover letter generation  
- ✅ Basic job scoring
- ✅ Simple conversational responses
- ✅ Resume bullet point enhancement

## 🧪 Testing Your Setup

### 1. Health Check (No Authentication Required)
```bash
curl http://localhost:3000/api/health/public
```

**Expected Output:**
```json
{
  "status": "healthy",
  "services": {
    "llm": {
      "openai_configured": true/false,
      "fallback_available": true,
      "provider": "openai" or "fallback"
    },
    "auth": { "configured": true }
  }
}
```

### 2. Test LLM Functionality (No Authentication Required)
```bash
curl http://localhost:3000/api/test/llm/public
```

### 3. Test SerpAPI Job Search (No Authentication Required)
```bash
# Test SerpAPI configuration
curl http://localhost:3000/api/test/serpapi

# Test custom job search
curl -X POST http://localhost:3000/api/test/serpapi \
  -H "Content-Type: application/json" \
  -d '{"query": "react developer", "location": "New York", "limit": 5}'
```

### 4. Test Specific Features
```bash
# Test query parsing
curl -X POST http://localhost:3000/api/test/llm/public \
  -H "Content-Type: application/json" \
  -d '{"testType": "parse_query", "data": {"query": "remote software engineer in San Francisco"}}'

# Test cover letter generation
curl -X POST http://localhost:3000/api/test/llm/public \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "generate_cover_letter",
    "data": {
      "jobDescription": {
        "title": "Software Engineer",
        "company": "TechCorp",
        "location": "San Francisco",
        "description": "Looking for a talented engineer",
        "requirements": ["JavaScript", "React"]
      },
      "userProfile": {
        "name": "John Doe",
        "experience": "5 years",
        "skills": ["JavaScript", "React", "Node.js"],
        "achievements": ["Led team of 3 developers"]
      }
    }
  }'
```

## 📱 Frontend Testing

### 1. Login and Chat
1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000`
3. Sign up/Login with Clerk
4. Navigate to the search page
5. Try chatting: "I'm looking for a remote software engineering job"

### 2. Expected Behavior

**With OpenAI (Full AI):**
- Natural language understanding
- Personalized responses
- Advanced job matching

**With Fallback Mode:**
- Basic keyword recognition
- Template responses
- Simple job parsing

## 🔧 Environment Variables

Create `.env.local` in your project root:

```bash
# Required - Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_here

# Optional - OpenAI (for full AI features)
OPENAI_API_KEY=sk-your_openai_key_here

# Optional - SerpAPI (for real job search)
SERPAPI_API_KEY=your_serpapi_key_here

# Future - Database
DATABASE_URL=your_database_url_here
```

### 🔍 SerpAPI Setup (Optional but Recommended)

To get real job search results instead of mock data:

1. Go to [SerpAPI](https://serpapi.com/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add it to your `.env.local` file

**Free tier includes:**
- 100 searches per month
- Google Jobs integration
- Real-time job data

**Without SerpAPI:**
- System uses mock job data
- All other features work normally

## 🎯 What Works Right Now

### ✅ Working Features
- **Authentication**: Clerk login/signup
- **Chat Interface**: Basic conversation
- **Query Parsing**: Extract job criteria from text
- **Job Search**: Real jobs via SerpAPI (Google Jobs)
- **Cover Letters**: Generate application letters
- **Resume Optimization**: Customize bullet points
- **Fallback Mode**: Works without OpenAI or SerpAPI
- **Real Job Data**: Live job postings from Google Jobs

### 🚧 Coming Soon
- Additional job board integration (LinkedIn, Indeed)
- Database for persistent data
- User profile management
- Application tracking
- Automated form filling

## 🐛 Troubleshooting

### Error: "Unauthorized" on API calls
- **Cause**: Not logged in
- **Solution**: Login through the UI first, then test

### Error: OpenAI quota exceeded
- **Immediate Fix**: System uses fallback mode automatically
- **Permanent Fix**: Add billing to OpenAI account

### Error: Chat not responding
- **Check**: Health endpoint for service status
- **Check**: Browser console for JavaScript errors
- **Fix**: Restart dev server

## 🚀 Next Steps

1. **Test fallback mode**: Verify basic functionality works
2. **Set up OpenAI billing**: For full AI capabilities  
3. **Try the chat interface**: Test conversational search
4. **Add job board APIs**: Real job data integration
5. **Build user profiles**: Store preferences and history

## 📞 Support

If you encounter issues:
1. Check the health endpoint
2. Verify environment variables
3. Check browser console for errors
4. Restart the development server

The system is designed to be resilient - if OpenAI fails, fallback mode ensures core functionality continues to work! 