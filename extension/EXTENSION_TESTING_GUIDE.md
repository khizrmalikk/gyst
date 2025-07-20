# Job Application Bot Extension - Testing Guide

## 🔄 **First: Reload the Extension**

**Important:** The extension has been significantly updated. You MUST reload it for changes to take effect.

1. Open Chrome and go to `chrome://extensions/`
2. Find "Job Application Bot" in the list
3. Click the **🔄 Reload** button (circular arrow icon)
4. Verify the extension is enabled

## 🧪 **Testing the Complete Workflow**

### **Step 1: Job Description Page Testing**

1. **Navigate to a job listing page:**
   - LinkedIn Jobs: `https://linkedin.com/jobs/`
   - Indeed: `https://indeed.com/`
   - Any company career page with job listings

2. **Open the extension:**
   - Click the extension icon in Chrome toolbar
   - It should open the side panel (not popup)
   - If side panel doesn't work, it may open in a new tab

3. **Verify job detection:**
   - Should show "💼 Job Listing" as page type
   - Should display workflow guidance for Step 1
   - CV and Cover Letter buttons should be enabled

4. **Test CV Generation:**
   - Click "Generate Custom CV" button
   - Should show "Generating CV..." message
   - Should automatically download a PDF file
   - Check downloads folder for `CV_[Company]_[Date].pdf`

5. **Test Cover Letter Generation:**
   - Click "Generate Cover Letter" button
   - Should show "Generating cover letter..." message
   - Should automatically download a PDF file
   - Check downloads folder for `CoverLetter_[Company]_[Date].pdf`

### **Step 2: Application Form Page Testing**

1. **Navigate to an application form:**
   - Look for "Apply" or "Apply Now" links on job pages
   - Or go to company application pages
   - URLs often contain "apply" or "application"

2. **Verify form detection:**
   - Extension should show "📝 Application Form" as page type
   - Should display workflow guidance for Step 2
   - "Analyze Form" and "Fill Application Form" buttons should be enabled

3. **Test Form Analysis:**
   - Click "🔍 Analyze Form" button
   - Should show "Analyzing forms..." message
   - Should detect form fields and show count

4. **Test Form Filling:**
   - Click "✍️ Fill Application Form" button
   - Should show multiple processing steps:
     - "Analyzing form fields..."
     - "Detecting form fields..."
     - "Generating intelligent responses..."
     - "Filling form fields..."
   - Should show success message with field count and AI responses count
   - Form fields on the page should be automatically filled

### **Step 3: Application Submission & Tracking**

1. **After successful form filling:**
   - "✅ Mark as Submitted" button should be enabled
   - Workflow guidance should show Step 3 as active

2. **Test Application Tracking:**
   - Click "✅ Mark as Submitted" button
   - Should show "Saving application data..." message
   - Should show success message with tracking details
   - Button should become disabled after successful submission

## 🔍 **What to Look For**

### **Visual Indicators:**
- ✅ Page type correctly detected (Job Listing vs Application Form)
- ✅ Workflow guidance shows appropriate steps
- ✅ Buttons are enabled/disabled at correct times
- ✅ PDF files are downloaded with proper names
- ✅ Form fields are filled with appropriate data
- ✅ Status messages are clear and informative

### **Expected Behavior:**
- **Job Pages:** CV/Cover Letter generation works, downloads PDFs
- **Form Pages:** Form analysis works, form filling uses profile + AI data
- **Multi-page forms:** Can run form filling multiple times on different pages
- **Tracking:** Application is saved with comprehensive data

### **Real Data Integration:**
- Visit `http://localhost:3000/pages/applications` in browser
- Should see real application data (not dummy data)
- Click on application rows to see detailed views
- Verify CV/Cover Letter generation flags are shown

## 🐛 **Troubleshooting**

### **Extension Not Loading:**
- Check Chrome DevTools console for errors
- Ensure server is running (`npm run dev`)
- Verify extension permissions are granted

### **Buttons Not Working:**
- Open Chrome DevTools on the side panel
- Check console for JavaScript errors
- Verify API server is responding: `curl http://localhost:3000/api/extension/profile`

### **PDF Generation Issues:**
- Check server console for PDF generation errors
- Verify jspdf dependency is installed
- Test API directly: 
  ```bash
  curl -X POST http://localhost:3000/api/extension/generate-cv \
    -H "Content-Type: application/json" \
    -d '{"jobInfo":{"title":"Test","company":"Test"},"userProfile":{"name":"Test"}}' \
    --output test.pdf
  ```

### **Form Filling Not Working:**
- Verify forms are detected (green indicator should appear)
- Check if form fields have proper names/labels
- Test on different job sites (some forms may be complex)

## 📊 **Success Criteria**

- [ ] Extension loads without errors
- [ ] Page types are correctly detected
- [ ] Workflow guidance appears and updates
- [ ] CV generation downloads PDF files
- [ ] Cover letter generation downloads PDF files
- [ ] Form analysis detects fields
- [ ] Form filling completes with AI responses
- [ ] Application tracking saves comprehensive data
- [ ] Applications page shows real data
- [ ] Application detail pages work

## 🔗 **Test URLs**

Try these sites for testing:
- **LinkedIn Jobs:** `https://www.linkedin.com/jobs/search/`
- **Indeed:** `https://www.indeed.com/jobs`
- **AngelList (Wellfound):** `https://wellfound.com/jobs`
- **Y Combinator Jobs:** `https://www.ycombinator.com/jobs`

**Note:** Different job sites have different form structures. The extension should handle most standard application forms, but some highly customized forms may need additional development. 