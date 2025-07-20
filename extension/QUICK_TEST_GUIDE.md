# 🚀 Quick Extension Testing Guide

## 📋 Pre-Test Setup (2 minutes)

### 1. Update Node.js (REQUIRED)
```bash
# Your current version: v16.17.0 (too old)
# Required: v18.18.0+ or v20.x.x

# Using Homebrew (recommended)
brew install node@20
brew link node@20 --force

# Verify
node --version  # Should show v20.x.x
```

### 2. Start the Server
```bash
npm run dev
# Should start without the Node.js version error
```

### 3. Reload Extension
1. Go to `chrome://extensions/`
2. Find "Job Application Bot"
3. Click **"Reload"** button
4. Or remove and re-add the extension from the `extension` folder

## 🧪 Test the Fixes (5 minutes)

### **Test 1: Page Change Detection** ⏱️ 30s
1. Open a job site (LinkedIn, Indeed, etc.)
2. Click the extension icon to open side panel
3. **Check:** URL shows in "📄 Page Analysis" section
4. Navigate to a different page
5. **Expected:** URL updates automatically within 2-4 seconds ✅
6. **Expected:** Page type changes (e.g., "💼 Job Listing" → "📝 Application Form") ✅

### **Test 2: Manual Analysis Button** ⏱️ 15s
1. Click "🔄 Re-analyze Page" button
2. **Expected:** Status shows "Analyzing page..." ✅
3. **Expected:** Workflow guidance updates ✅

### **Test 3: CV Generation** ⏱️ 60s
1. Go to a job listing page (not an application form)
2. Open DevTools Console (F12 → Console tab)
3. Click "📄 Generate Custom CV" button
4. **Watch Console:** Should see detailed logs:
   ```
   🚀 Starting CV generation...
   🔗 Testing API connectivity...
   ✅ API server is responding
   👤 Fetching user profile...
   🏗️ Calling CV generation API...
   ```
5. **Expected:** PDF downloads automatically ✅
6. **Expected:** Success message appears ✅

### **Test 4: Cover Letter Generation** ⏱️ 60s
1. Still on job listing page
2. Click "📝 Generate Cover Letter" button  
3. **Watch Console:** Should see similar detailed logs
4. **Expected:** PDF downloads automatically ✅
5. **Expected:** Success message appears ✅

### **Test 5: Form Detection** ⏱️ 30s
1. Navigate to an application form page
2. **Expected:** UI shows "📝 Application Form" ✅
3. **Expected:** "Fill Application Form" button is enabled ✅
4. **Expected:** Workflow guidance shows form filling step ✅

## 🐛 Common Issues & Quick Fixes

### ❌ **"API server not responding"**
**Problem:** Server not running  
**Fix:** `npm run dev` in terminal

### ❌ **No PDF downloads**  
**Problem:** Missing APIs or profile data
**Check:** Console for specific error messages

### ❌ **URL not updating**
**Problem:** Extension not reloaded properly
**Fix:** Go to chrome://extensions/ → Click "Reload"

### ❌ **CSP errors in console**
**Problem:** Extension files not updated
**Fix:** Re-load extension from folder (remove & add)

## ✅ Success Checklist

After testing, you should have:
- [x] URL updates automatically when navigating
- [x] Manual re-analyze button works
- [x] CV generates and downloads as PDF
- [x] Cover letter generates and downloads as PDF  
- [x] Form detection works on application pages
- [x] Console shows detailed, helpful logs
- [x] No CSP errors in console
- [x] Workflow guidance updates correctly

## 📞 If Something's Still Not Working

1. **Check the console** for specific error messages
2. **Verify Node.js version** is 18.18.0+
3. **Ensure server is running** on localhost:3000
4. **Try the database migration** if profile/CV generation fails
5. **Share the console logs** for specific debugging

The extension should now work reliably with proper error handling and user feedback! 🎉

---

**Quick Status Check:**
- Server running? ✅ `curl http://localhost:3000/api/health/public`
- Extension loaded? ✅ Check chrome://extensions/
- Node.js updated? ✅ `node --version` 