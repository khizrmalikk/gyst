# Chrome Extension Testing Guide

## 🚀 Quick Start

### 1. Prerequisites
- Chrome browser
- Next.js backend running on `http://localhost:3000`
- OpenAI API key configured

### 2. Load the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select your `extension` folder
4. Verify "Job Application Bot" appears in your extensions

### 3. Start Your Backend
```bash
cd /path/to/your/job-application-bot
npm run dev
```

## 🧪 Testing Steps

### Step 1: Test Extension Installation
1. ✅ Extension should appear in Chrome toolbar
2. ✅ Click extension icon → popup should open
3. ✅ Should show current page URL and status

### Step 2: Test on Job Pages
**Go to job sites like:**
- LinkedIn job posts
- Indeed job listings
- Company career pages
- AngelList job posts

**Expected behavior:**
1. ✅ Extension icon should show badge when forms detected
2. ✅ Click extension → should show job information
3. ✅ Should detect if page has application forms

### Step 3: Test Page Analysis
1. **Click "Analyze Page"** button
2. ✅ Should extract job title, company, location
3. ✅ Should detect if application forms are present
4. ✅ Status should update to "Page analyzed"

### Step 4: Test Form Analysis
1. **Navigate to actual application form**
2. **Click "Analyze Form"** button
3. ✅ Should identify form fields (name, email, phone, etc.)
4. ✅ "Fill Form" button should become enabled
5. ✅ Status should show "Form analyzed successfully"

### Step 5: Test Form Filling
1. **Click "Fill Form"** button
2. ✅ Should fetch user profile from API
3. ✅ Should fill detected form fields automatically
4. ✅ Fields should be highlighted in blue
5. ✅ Should show "Form filled successfully" message

### Step 6: Test Document Generation
1. **Click "Generate CV"** button
2. ✅ Should download custom CV file
3. ✅ **Click "Generate Cover Letter"** button
4. ✅ Should download custom cover letter file

## 🔧 API Integration

### New API Endpoints Used:
- `GET /api/extension/profile` - Get user profile
- `POST /api/extension/analyze` - Analyze page/form
- `POST /api/extension/fill` - Fill form & generate documents

### Authentication:
- Uses Clerk authentication from main app
- User must be logged in to Next.js app

## 🐛 Troubleshooting

### Common Issues:

**1. Extension not loading:**
- Check Developer mode is enabled
- Verify manifest.json is valid
- Check console for errors

**2. API calls failing:**
- Ensure backend is running on `http://localhost:3000`
- Check user is logged in to main app
- Verify OpenAI API key is configured

**3. Form detection not working:**
- Try refreshing the page
- Check if page has actual forms
- Some sites may block content scripts

**4. Form filling not working:**
- Check console for JavaScript errors
- Verify form fields are detected correctly
- Some fields may be protected by site

**5. Document generation failing:**
- Check OpenAI API key and credits
- Verify job information was extracted
- Check API response in Network tab

## 📊 Success Metrics

### What Success Looks Like:
- ✅ Extension loads without errors
- ✅ Detects job information on 80%+ of job sites
- ✅ Successfully fills common form fields
- ✅ Generates relevant CV and cover letter
- ✅ No JavaScript errors in console
- ✅ Smooth user experience

### Performance Expectations:
- Page analysis: < 3 seconds
- Form analysis: < 5 seconds
- Form filling: < 3 seconds
- Document generation: < 10 seconds

## 🚧 Known Limitations

1. **Site Compatibility**: Some job sites may block content scripts
2. **Complex Forms**: Multi-step forms may not be fully supported
3. **File Uploads**: Resume uploads need manual handling
4. **Dynamic Content**: Some dynamic forms may not be detected
5. **Authentication**: Requires user to be logged in to main app

## 🎯 Next Steps

1. **Test on Popular Sites**:
   - LinkedIn Jobs
   - Indeed
   - Glassdoor
   - AngelList
   - Company career pages

2. **Edge Case Testing**:
   - Multi-step application forms
   - Forms with captcha
   - Mobile responsive sites
   - Single-page applications

3. **Performance Testing**:
   - Multiple tabs open
   - Large job descriptions
   - Slow network conditions

4. **User Experience**:
   - Error handling
   - Loading states
   - Clear feedback messages

## 📝 Test Results Template

```
Date: _______
Tester: _______
Browser: Chrome Version _______

Sites Tested:
□ LinkedIn Jobs - Status: _____ Notes: _____
□ Indeed - Status: _____ Notes: _____
□ Company Site - Status: _____ Notes: _____

Features Tested:
□ Page Analysis - Status: _____ Notes: _____
□ Form Detection - Status: _____ Notes: _____
□ Form Filling - Status: _____ Notes: _____
□ CV Generation - Status: _____ Notes: _____
□ Cover Letter - Status: _____ Notes: _____

Issues Found:
_________________________________________________
_________________________________________________

Overall Rating: ___/10
```

## 🔄 Continuous Testing

After initial testing, continue to:
1. Test on new job sites regularly
2. Monitor API response times
3. Check for Chrome extension updates
4. Validate document quality
5. Gather user feedback

---

**Remember**: This extension is significantly better than the iframe approach because it has no CORS restrictions and works universally across all job sites! 