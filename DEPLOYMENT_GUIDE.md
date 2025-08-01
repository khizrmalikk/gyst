# 🚀 Deployment Guide: Job Application Bot

This guide covers deploying both the Next.js web application to Vercel and distributing the Chrome extension.

## 📋 Prerequisites

- [Vercel account](https://vercel.com)
- Node.js 18+ installed locally
- All environment variables configured
- Chrome browser for testing

## 🌐 Part 1: Deploy Web App to Vercel

### Step 1: Prepare Environment Variables

1. **Create environment file** (copy from `.env.example`):
```bash
# Copy example file
cp .env.example .env.local

# Fill in your actual values:
# - CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY  
# - OPENAI_API_KEY
# - SERPAPI_KEY
# - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (for Gmail integration)
```

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy**:
```bash
# First deployment
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (choose your account)
# - Link to existing project? No
# - Project name: job-application-bot
# - Directory: ./
# - Override settings? No
```

4. **Add environment variables**:
```bash
# Add each environment variable
vercel env add CLERK_SECRET_KEY
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add OPENAI_API_KEY
vercel env add SERPAPI_KEY
# ... add all others from .env.example
```

5. **Deploy with environment variables**:
```bash
vercel --prod
```

#### Option B: Deploy via GitHub (Alternative)

1. **Push to GitHub**:
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables in the Vercel dashboard
   - Deploy

### Step 3: Configure Domain

1. **Note your Vercel URL** (e.g., `https://job-application-bot-xyz.vercel.app`)
2. **Optional**: Add custom domain in Vercel dashboard → Settings → Domains

## 🧩 Part 2: Deploy Chrome Extension

### Step 1: Build Extension for Production

1. **Update the build script** with your Vercel URL:
```bash
# Edit package.json script, replace with your actual domain:
"build:extension:prod": "NEXT_PUBLIC_API_BASE_URL=https://your-app.vercel.app node scripts/build-extension.js"
```

2. **Build the extension**:
```bash
# For production (replace with your Vercel URL)
NEXT_PUBLIC_API_BASE_URL=https://your-actual-vercel-url.vercel.app npm run build:extension

# Or use the script after updating it:
npm run build:extension:prod
```

This will create an `extension-build/` directory with your production-ready extension.

### Step 2: Test Extension Locally

1. **Open Chrome Extensions**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top right)

2. **Load Extension**:
   - Click "Load unpacked"
   - Select the `extension-build/` directory
   - Extension should load with your production API URL

3. **Test Core Features**:
   - Click extension icon → should open side panel
   - Navigate to a job site (LinkedIn, Lever, etc.)
   - Test authentication with your Vercel deployment
   - Try CV generation, form filling, etc.

### Step 3: Package for Distribution

#### Option A: Chrome Web Store (Public Distribution)

1. **Create ZIP package**:
```bash
cd extension-build
zip -r ../job-application-bot-extension.zip .
cd ..
```

2. **Chrome Web Store Submission**:
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Pay one-time $5 developer fee
   - Upload `job-application-bot-extension.zip`
   - Fill in store listing details:
     - Name: "Job Application Bot"
     - Description: "Automate job applications with AI-powered form filling and document generation"
     - Screenshots: Take screenshots of the extension in action
     - Category: Productivity
   - Submit for review (takes 1-3 days)

#### Option B: Private Distribution

1. **Create downloadable ZIP**:
```bash
# Create a ZIP file for manual distribution
cd extension-build
zip -r ../job-application-bot-extension-v1.0.0.zip .
cd ..
```

2. **Distribute via your website**:
   - Host the ZIP file on your Vercel app
   - Create installation instructions page
   - Users download and install manually

### Step 4: Update Extension for Updates

When you need to update the extension:

1. **Update version** in `extension/manifest.json`:
```json
{
  "version": "1.1.0"
}
```

2. **Rebuild and redeploy**:
```bash
npm run build:extension:prod
```

3. **Upload to Chrome Web Store** (if using public distribution)

## 🔧 Part 3: Production Configuration

### Environment Variables for Vercel

Set these in your Vercel dashboard or via CLI:

```bash
# Required
CLERK_SECRET_KEY=clerk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...

# Optional but recommended
SERPAPI_KEY=your_serpapi_key
GOOGLE_CLIENT_ID=your_google_client_id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Will be set automatically by build script
NEXT_PUBLIC_API_BASE_URL=https://your-app.vercel.app
```

### Security Considerations

1. **CORS Configuration**: Your Next.js API routes should handle CORS for the extension
2. **Authentication**: Extension uses cookie-based auth with your web app
3. **Content Security Policy**: Extension manifest includes necessary permissions

### Testing Production Deployment

1. **Web App Tests**:
```bash
# Test health endpoint
curl https://your-app.vercel.app/api/health/public

# Test extension auth endpoint
curl https://your-app.vercel.app/api/extension/check-auth
```

2. **Extension Tests**:
   - Install built extension in Chrome
   - Navigate to job sites
   - Test complete workflow: login → profile → CV generation → form filling

## 🚨 Troubleshooting

### Common Issues

1. **Extension can't connect to API**:
   - Check that `NEXT_PUBLIC_API_BASE_URL` is correct in build
   - Verify Vercel deployment is accessible
   - Check Chrome extension console for errors

2. **Authentication issues**:
   - Ensure Clerk is configured for your Vercel domain
   - Check cookie settings and CORS policies

3. **API calls failing**:
   - Verify all environment variables are set in Vercel
   - Check Vercel function logs for errors

### Debug Commands

```bash
# Test local extension build
npm run build:extension

# Check built extension config
cat extension-build/build-info.json

# Test production API
curl https://your-app.vercel.app/api/health/public
```

## 📈 Monitoring & Analytics

Consider adding:
- Vercel Analytics for web app usage
- Chrome extension analytics via Google Analytics
- Error tracking with services like Sentry

## 🔄 CI/CD (Optional)

For automated deployments, you can set up GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Vercel CLI
        run: npm install -g vercel
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

🎉 **Congratulations!** Your Job Application Bot is now deployed and ready for users to install and use with your production API.