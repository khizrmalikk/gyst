#!/usr/bin/env node

/**
 * Build script for the Job Application Bot Chrome Extension
 * This script prepares the extension for production by replacing environment variables
 */

const fs = require('fs');
const path = require('path');

// Get the API base URL from environment or use default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const isDevelopment = API_BASE_URL.includes('localhost');

console.log('🔨 Building Job Application Bot Extension...');
console.log(`📡 API Base URL: ${API_BASE_URL}`);
console.log(`🌍 Environment: ${isDevelopment ? 'Development' : 'Production'}`);

// Paths
const extensionDir = path.join(__dirname, '../extension');
const buildDir = path.join(__dirname, '../extension-build');

// Create build directory
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Files to copy and process
const filesToProcess = [
  'manifest.json',
  'popup.js',
  'sidepanel.js',
  'content.js',
  'background.js',
  'popup.html',
  'sidepanel.html',
  'popup.css'
];

// Static files to copy as-is
const staticFiles = [
  'assets/icon16.svg',
  'assets/icon32.svg', 
  'assets/icon48.svg',
  'assets/icon128.svg'
];

// Process JavaScript files - replace API base URL
function processJavaScriptFile(filePath, outputPath) {
  console.log(`📝 Processing: ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace hardcoded localhost URLs with environment variable
  content = content.replace(
    /apiBaseUrl\s*=\s*['"`]http:\/\/localhost:3000['"`]/g,
    `apiBaseUrl = '${API_BASE_URL}'`
  );
  
  // Replace any other hardcoded localhost references
  content = content.replace(
    /['"`]http:\/\/localhost:3000[^'"`]*['"`]/g,
    (match) => {
      const url = match.slice(1, -1); // Remove quotes
      const newUrl = url.replace('http://localhost:3000', API_BASE_URL);
      return match[0] + newUrl + match[match.length - 1];
    }
  );
  
  fs.writeFileSync(outputPath, content);
}

// Process manifest.json - update host permissions
function processManifest(filePath, outputPath) {
  console.log(`📝 Processing: manifest.json`);
  
  const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Update host permissions for production
  if (!isDevelopment) {
    const prodUrl = new URL(API_BASE_URL);
    manifest.host_permissions = [
      `${prodUrl.protocol}//${prodUrl.host}/*`,
      "https://*/*" // Keep HTTPS wildcard for job sites
    ];
    
    // Update version for production
    manifest.version = "1.0.0";
    manifest.description = "Automate job applications with AI-powered form filling and document generation - Production Version";
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
}

// Copy static files
function copyStaticFile(relativePath) {
  const sourcePath = path.join(extensionDir, relativePath);
  const outputPath = path.join(buildDir, relativePath);
  
  // Create directory if it doesn't exist
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, outputPath);
    console.log(`📄 Copied: ${relativePath}`);
  } else {
    console.warn(`⚠️  File not found: ${relativePath}`);
  }
}

// Process all files
try {
  // Copy and process JavaScript/JSON files
  filesToProcess.forEach(file => {
    const sourcePath = path.join(extensionDir, file);
    const outputPath = path.join(buildDir, file);
    
    if (!fs.existsSync(sourcePath)) {
      console.warn(`⚠️  File not found: ${file}`);
      return;
    }
    
    if (file === 'manifest.json') {
      processManifest(sourcePath, outputPath);
    } else if (file.endsWith('.js')) {
      processJavaScriptFile(sourcePath, outputPath);
    } else {
      // Copy HTML and CSS files as-is
      fs.copyFileSync(sourcePath, outputPath);
      console.log(`📄 Copied: ${file}`);
    }
  });
  
  // Copy static files
  staticFiles.forEach(file => {
    copyStaticFile(file);
  });
  
  // Create a build info file
  const buildInfo = {
    buildTime: new Date().toISOString(),
    apiBaseUrl: API_BASE_URL,
    environment: isDevelopment ? 'development' : 'production',
    version: '1.0.0'
  };
  
  fs.writeFileSync(
    path.join(buildDir, 'build-info.json'), 
    JSON.stringify(buildInfo, null, 2)
  );
  
  console.log('✅ Extension build completed successfully!');
  console.log(`📦 Build output: ${buildDir}`);
  console.log(`🚀 Ready to load in Chrome: chrome://extensions/ > Load unpacked > ${buildDir}`);
  
  if (!isDevelopment) {
    console.log('📋 Production deployment notes:');
    console.log(`   - API Base URL: ${API_BASE_URL}`);
    console.log('   - Host permissions updated for production domain');
    console.log('   - Remember to update Chrome Web Store listing');
  }
  
} catch (error) {
  console.error('❌ Extension build failed:', error);
  process.exit(1);
}