#!/usr/bin/env node

/**
 * Test script for deployment verification
 * Run this after deploying to verify everything is working
 */

const https = require('https');
const http = require('http');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

console.log('🧪 Testing Job Application Bot Deployment...');
console.log(`🎯 Target URL: ${API_BASE_URL}`);

// Test endpoints
const endpoints = [
  '/api/health/public',
  '/api/extension/check-auth',
  '/api/test/llm/public'
];

async function testEndpoint(endpoint) {
  const url = `${API_BASE_URL}${endpoint}`;
  const isHttps = url.startsWith('https');
  const client = isHttps ? https : http;
  
  return new Promise((resolve) => {
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          endpoint,
          status: res.statusCode,
          success: res.statusCode >= 200 && res.statusCode < 300,
          data: data.substring(0, 200) // Limit data length
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        endpoint,
        status: 0,
        success: false,
        error: error.message
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        endpoint,
        status: 0,
        success: false,
        error: 'Timeout'
      });
    });
  });
}

async function runTests() {
  console.log('\n🔍 Testing API endpoints...\n');
  
  const results = [];
  
  for (const endpoint of endpoints) {
    process.stdout.write(`  Testing ${endpoint}... `);
    const result = await testEndpoint(endpoint);
    
    if (result.success) {
      console.log(`✅ ${result.status}`);
    } else {
      console.log(`❌ ${result.status || 'ERROR'} - ${result.error || 'Failed'}`);
    }
    
    results.push(result);
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('================================');
  
  let passCount = 0;
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.endpoint} (${result.status || 'ERROR'})`);
    if (result.success) passCount++;
  });
  
  console.log('================================');
  console.log(`📈 Passed: ${passCount}/${results.length} tests`);
  
  if (passCount === results.length) {
    console.log('\n🎉 All tests passed! Your deployment is ready.');
    console.log('\n📋 Next Steps:');
    console.log('   1. Build your extension: npm run build:extension:prod');
    console.log('   2. Test the extension with a job site');
    console.log('   3. Deploy to Chrome Web Store');
  } else {
    console.log('\n⚠️  Some tests failed. Check your deployment configuration.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});