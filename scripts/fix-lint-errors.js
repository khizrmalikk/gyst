#!/usr/bin/env node

/**
 * Script to automatically fix common ESLint errors
 * Run this after deployment to clean up the codebase
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing common ESLint errors...');

// First, try to auto-fix what ESLint can handle
console.log('📝 Running ESLint auto-fix...');
try {
  execSync('npm run lint:fix', { stdio: 'inherit' });
  console.log('✅ ESLint auto-fix completed');
} catch (error) {
  console.log('⚠️ ESLint auto-fix had some issues, continuing with manual fixes...');
}

// Function to recursively find TypeScript/JavaScript files
function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .next, etc.
        if (!['node_modules', '.next', 'dist', 'build', '.git'].includes(item)) {
          traverse(fullPath);
        }
      } else {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Function to fix common issues in a file
function fixCommonIssues(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Fix unescaped quotes in JSX
  const oldContent = content;
  
  // Fix single quotes in JSX
  content = content.replace(/([>]|\s)([^<]*)'([^<]*[<])/g, (match, before, middle, after) => {
    if (middle.includes('</') || middle.includes('<')) return match;
    return before + middle.replace(/'/g, '&apos;') + after;
  });
  
  // Fix double quotes in JSX text (simple cases)
  content = content.replace(/([>]|\s)([^<]*)"([^<]*[<])/g, (match, before, middle, after) => {
    if (middle.includes('</') || middle.includes('<')) return match;
    return before + middle.replace(/"/g, '&quot;') + after;
  });
  
  // Convert let to const for variables that are never reassigned (simple cases)
  content = content.replace(/\blet\s+(\w+)\s*=\s*([^;]+);[\s\S]*?(?=\n\s*(?:let|const|var|function|class|export|import|\}))/g, (match, varName, value) => {
    // Simple heuristic: if the variable name doesn't appear in an assignment after declaration
    const restOfContent = match.slice(match.indexOf(';') + 1);
    const reassignmentPattern = new RegExp(`\\b${varName}\\s*[=]`, 'g');
    if (!reassignmentPattern.test(restOfContent)) {
      return match.replace(/\blet\s+/, 'const ');
    }
    return match;
  });
  
  if (content !== oldContent) {
    changed = true;
  }
  
  return { content, changed };
}

// Main execution
const srcDir = path.join(__dirname, '../src');
console.log(`🔍 Scanning files in ${srcDir}...`);

const files = findFiles(srcDir);
console.log(`📁 Found ${files.length} files to process`);

let processedCount = 0;
let changedCount = 0;

for (const file of files) {
  try {
    const result = fixCommonIssues(file);
    
    if (result.changed) {
      fs.writeFileSync(file, result.content);
      changedCount++;
      console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
    }
    
    processedCount++;
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log('\n📊 Summary:');
console.log(`   Processed: ${processedCount} files`);
console.log(`   Modified: ${changedCount} files`);

if (changedCount > 0) {
  console.log('\n🚀 Running final lint check...');
  try {
    execSync('npm run lint', { stdio: 'inherit' });
    console.log('✅ All linting issues resolved!');
  } catch (error) {
    console.log('⚠️ Some linting issues remain. Check the output above for details.');
    console.log('💡 You can run this script again or fix remaining issues manually.');
  }
} else {
  console.log('ℹ️ No automatic fixes were applied. Run `npm run lint` to see remaining issues.');
}

console.log('\n🎉 Lint fix script completed!');