# Job Application Bot - Chrome Extension

AI-powered Chrome extension that automatically detects job application forms and fills them using your profile data.

## Features

- 🔍 **Auto-detect** application forms on any job site
- 📝 **Smart form filling** with AI-powered field mapping
- 📄 **Custom CV generation** tailored to each job
- 📝 **Custom cover letter** creation
- 🎯 **Real-time job analysis** with page type detection
- 🔄 **Seamless integration** with your Job Application Bot dashboard

## Installation

### Option 1: Load Unpacked Extension (Development)

1. **Build the extension:**
   ```bash
   cd extension
   npm install
   npm run build
   ```

2. **Open Chrome Extensions page:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load the extension:**
   - Click "Load unpacked"
   - Select the `extension` folder
   - The extension should now appear in your extensions list

4. **Pin the extension:**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Job Application Bot" and pin it

### Option 2: Install from Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store once published.

## Setup

1. **Start your Next.js app:**
   ```bash
   npm run dev
   ```

2. **Configure API URL:**
   - The extension defaults to `http://localhost:3000`
   - You can change this in the extension popup settings

3. **Set up your profile:**
   - Go to your dashboard at `http://localhost:3000/pages/profile`
   - Fill in your personal information, experience, and skills

## Usage

### 1. Navigate to Job Sites
Visit any job board or company careers page:
- LinkedIn Jobs
- Indeed
- Glassdoor
- Company career pages
- Job application forms

### 2. Automatic Detection
The extension automatically:
- Detects job application forms
- Shows a badge number on the extension icon
- Analyzes job information (title, company, location)

### 3. Fill Applications
1. **Click the extension icon** when on a job page
2. **Review detected information** in the popup
3. **Click "Fill Application Form"** to auto-fill fields
4. **Generate custom documents** (CV & cover letter)
5. **Review and submit** the form manually

### 4. Features in Action

#### Page Analysis
- **Job Listing Detection:** Identifies job title, company, location
- **Application Form Detection:** Finds and analyzes form fields
- **Page Type Classification:** Job board, job listing, application form

#### Form Filling
- **Smart Field Mapping:** Maps your profile data to form fields
- **Multiple Field Types:** Text, email, textarea, select, checkbox
- **Real-time Highlighting:** Shows which fields were filled
- **Validation Feedback:** Indicates successful/failed field fills

#### Document Generation
- **Custom CV:** Tailored to the specific job requirements
- **Cover Letter:** Personalized for the company and role
- **Instant Download:** Files saved directly to your downloads

## Settings

Access settings through the extension popup:

- **Auto-detect Forms:** Automatically analyze forms on page load
- **Show Tooltips:** Display helpful tooltips for form fields
- **Notifications:** Get notified when forms are detected
- **API URL:** Configure your backend server URL

## Troubleshooting

### Extension Not Working
1. **Check API Connection:**
   - Ensure your Next.js app is running on `http://localhost:3000`
   - Check the extension console for error messages

2. **Reload Extension:**
   - Go to `chrome://extensions/`
   - Click the refresh icon on the Job Application Bot extension

3. **Clear Storage:**
   - Right-click extension icon → "Inspect popup"
   - Go to Application tab → Storage → Clear all

### Form Detection Issues
1. **Manual Analysis:**
   - Use the "Analyze Form" button in the popup
   - Check the browser console for detection logs

2. **Supported Sites:**
   - Most job boards work (LinkedIn, Indeed, Glassdoor)
   - Some sites may block form detection due to security

### Filling Problems
1. **Field Mapping:**
   - Update your profile with complete information
   - Check that form fields have proper labels

2. **Dynamic Forms:**
   - Some forms load fields dynamically
   - Try refreshing the page and re-analyzing

## Development

### File Structure
```
extension/
├── manifest.json          # Extension configuration
├── popup.html             # Main popup interface
├── src/
│   ├── popup.js           # Popup logic and UI
│   ├── popup.css          # Popup styles
│   ├── content.js         # Content script (runs on pages)
│   ├── content.css        # Content script styles
│   └── background.js      # Background service worker
└── assets/
    └── icons/             # Extension icons
```

### API Integration
The extension communicates with your Next.js backend:

- **Endpoint:** `/api/browser/analyze-and-fill`
- **Actions:** `analyze`, `fill`, `generate_cv`, `generate_cover_letter`
- **Authentication:** None (localhost development)

### Debugging
1. **Popup Debugging:**
   - Right-click extension icon → "Inspect popup"

2. **Content Script Debugging:**
   - F12 on any page → Console tab
   - Look for messages starting with emojis (🚀, 📝, etc.)

3. **Background Script Debugging:**
   - Go to `chrome://extensions/`
   - Click "Inspect views: background page"

## Security & Privacy

- **Local Processing:** All data stays on your machine
- **No Tracking:** No analytics or user tracking
- **Open Source:** Full source code available
- **Permissions:** Only requests necessary permissions

## Permissions Explained

- **activeTab:** Access the current tab for form detection
- **storage:** Save your settings and preferences
- **scripting:** Inject content scripts for form analysis
- **host permissions:** Access job sites to analyze forms

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Look at browser console logs
3. Submit issues on the GitHub repository

## Roadmap

- [ ] Chrome Web Store publication
- [ ] Firefox extension support
- [ ] Advanced form field recognition
- [ ] Integration with more job boards
- [ ] Bulk application processing
- [ ] Application tracking and analytics 