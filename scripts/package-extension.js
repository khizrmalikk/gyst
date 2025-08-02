#!/usr/bin/env node

/**
 * Package script for the Job Application Bot Chrome Extension
 * Creates a distribution-ready ZIP file from the built extension
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Packaging Job Application Bot Extension...');

// Paths
const buildDir = path.join(__dirname, '../extension-build');
const packageName = 'job-application-bot-extension.zip';
const packagePath = path.join(__dirname, '../', packageName);

// Check if build directory exists
if (!fs.existsSync(buildDir)) {
  console.error('❌ Build directory not found! Run npm run build:extension:prod first.');
  console.log('💡 Run: npm run build:extension:prod');
  process.exit(1);
}

// Remove existing package if it exists
if (fs.existsSync(packagePath)) {
  fs.unlinkSync(packagePath);
  console.log('🗑️  Removed existing package');
}

try {
  // Check if zip command is available
  let zipCommand;
  try {
    execSync('which zip', { stdio: 'ignore' });
    zipCommand = 'zip';
  } catch (error) {
    try {
      execSync('which 7z', { stdio: 'ignore' });
      zipCommand = '7z';
    } catch (error) {
      throw new Error('Neither zip nor 7z command found. Please install zip utilities.');
    }
  }

  console.log(`🔧 Using ${zipCommand} for packaging...`);

  // Create ZIP package
  if (zipCommand === 'zip') {
    // Use zip command (Unix/Mac/WSL)
    execSync(`cd "${buildDir}" && zip -r "${packagePath}" .`, { stdio: 'inherit' });
  } else {
    // Use 7z command (Windows/Cross-platform)
    execSync(`7z a "${packagePath}" "${buildDir}/*"`, { stdio: 'inherit' });
  }

  // Verify package was created and get size
  if (fs.existsSync(packagePath)) {
    const stats = fs.statSync(packagePath);
    const sizeKB = Math.round(stats.size / 1024);
    
    console.log('✅ Extension packaged successfully!');
    console.log(`📦 Package: ${packageName}`);
    console.log(`📏 Size: ${sizeKB} KB`);
    console.log('');
    console.log('📋 Distribution Options:');
    console.log('');
    console.log('🌟 Option 1: Chrome Web Store (Recommended)');
    console.log('   1. Go to: https://chrome.google.com/webstore/devconsole/');
    console.log('   2. Click "New Item" and upload the ZIP file');
    console.log('   3. Fill in store listing details');
    console.log('   4. Submit for review (1-3 days)');
    console.log('');
    console.log('📎 Option 2: Manual Distribution');
    console.log('   1. Share the ZIP file with users');
    console.log('   2. Provide installation instructions');
    console.log('   3. Users load as "unpacked extension"');
    console.log('');
    console.log('📚 See EXTENSION_DISTRIBUTION_GUIDE.md for detailed instructions');
    
  } else {
    throw new Error('Package creation failed - ZIP file not found');
  }

} catch (error) {
  console.error('❌ Packaging failed:', error.message);
  console.log('');
  console.log('🔧 Troubleshooting:');
  console.log('   - Ensure zip or 7z is installed');
  console.log('   - Check build directory exists: extension-build/');
  console.log('   - Run: npm run build:extension:prod first');
  process.exit(1);
}

// Display package contents for verification
try {
  console.log('');
  console.log('📂 Package Contents:');
  
  if (zipCommand === 'zip') {
    execSync(`zip -sf "${packagePath}"`, { stdio: 'inherit' });
  } else {
    execSync(`7z l "${packagePath}"`, { stdio: 'inherit' });
  }
} catch (error) {
  console.log('   (Could not list package contents)');
}

console.log('');
console.log('🎉 Ready for distribution!');