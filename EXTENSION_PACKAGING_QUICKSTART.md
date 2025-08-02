# 🚀 Extension Packaging Quick Start

## 📦 Package Your Extension in 3 Steps

### Step 1: Update Your Production URL

In `package.json`, replace `https://your-app.vercel.app` with your actual Vercel URL:

```json
"build:extension:prod": "NEXT_PUBLIC_API_BASE_URL=https://YOUR_ACTUAL_URL.vercel.app node scripts/build-extension.js"
```

### Step 2: Build & Package

```bash
# Option A: Build and package in one command (recommended)
npm run distribute:extension

# Option B: Step by step
npm run build:extension:prod
npm run package:extension
```

### Step 3: You're Done! 

✅ `job-application-bot-extension.zip` is ready for distribution!

## 🎯 Distribution Options

### 🌟 Chrome Web Store (Recommended)

**Quick Steps:**
1. Go to [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole/)
2. Pay $5 one-time developer fee
3. Click "New Item" → Upload your ZIP file
4. Fill store listing (see `EXTENSION_DISTRIBUTION_GUIDE.md`)
5. Submit for review (1-3 days)

**Benefits:**
- Automatic updates for users
- One-click installation  
- Better security and trust
- Wider discoverability

### 📎 Manual Distribution

**Quick Steps:**
1. Share `job-application-bot-extension.zip` with users
2. Provide installation instructions (see below)

**User Installation:**
```
1. Download and unzip the file
2. Open Chrome → chrome://extensions/
3. Enable "Developer mode" 
4. Click "Load unpacked" → Select unzipped folder
5. Pin extension to toolbar
```

## 📋 Before You Submit

### ✅ Pre-Submission Checklist

- [ ] Extension built with production API URL
- [ ] Tested with your live Vercel deployment
- [ ] All features working correctly
- [ ] Created required screenshots (see `store-assets/ASSETS_CHECKLIST.md`)
- [ ] Privacy policy published on your website
- [ ] Store listing text prepared

### 🧪 Quick Test

```bash
# Test your packaged extension
npm run build:extension:prod

# Load extension-build/ folder in Chrome
# Test with your live deployment
```

## 📚 Detailed Guides

- **Full Distribution Guide:** `EXTENSION_DISTRIBUTION_GUIDE.md`
- **Store Assets Guide:** `store-assets/ASSETS_CHECKLIST.md`  
- **Extension Testing:** `extension/EXTENSION_TESTING_GUIDE.md`

## 🎉 You're Ready!

Your Job Application Bot extension is now ready for users to download and use with your deployed web application! 

**Next Steps:**
1. Package your extension
2. Create store assets
3. Submit to Chrome Web Store
4. Share with your users!

---

**Need Help?** 
- Check the detailed guides above
- Test thoroughly before distribution
- Consider starting with manual distribution to gather feedback