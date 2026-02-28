/**
 * Google Cloud Vision Setup Guide
 * 
 * Follow these steps to get your credentials:
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Google Cloud Vision API — Setup Instructions              ║
╚════════════════════════════════════════════════════════════════╝

📋 STEP 1: Create a Google Cloud Project
   → Go to: https://console.cloud.google.com/
   → Click "Select a project" → "New Project"
   → Name it "FiscalNinja" (or similar)
   → Click "Create"

📋 STEP 2: Enable the Cloud Vision API
   → In your project, go to: APIs & Services > Library
   → Search for "Cloud Vision API"
   → Click "Enable"

📋 STEP 3: Create a Service Account
   → Go to: IAM & Admin > Service Accounts
   → Click "+ CREATE SERVICE ACCOUNT"
   → Service account name: "fiscalninja-ocr"
   → Description: "OCR processing for FiscalNinja"
   → Click "Create and Continue"
   → Role: "Cloud Vision AI Service Agent"
   → Click "Continue" → "Done"

📋 STEP 4: Download JSON Key
   → Find your service account in the list
   → Click the 3 dots menu (⋮) → "Manage keys"
   → Click "Add Key" → "Create new key"
   → Select "JSON" → Click "Create"
   → Save the downloaded file as:
     C:\\Users\\trica\\OneDrive\\Área de Trabalho\\Projects\\FiscalNinja\\google-credentials.json

📋 STEP 5: Verify the File
   The JSON file should look like this:
   
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "abc123...",
     "private_key": "-----BEGIN PRIVATE KEY-----\\n...",
     "client_email": "fiscalninja-ocr@your-project.iam.gserviceaccount.com",
     "client_id": "123456789",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     ...
   }

📋 STEP 6: Test the Setup
   Run: npx tsx src/lib/ocr/test-ocr.ts C:\\Users\\trica\\Downloads\\test.jpg

✨ Common Issues:
   • "key must be a string" → Your credentials file is empty or invalid
   • "PERMISSION_DENIED" → Vision API not enabled for your project
   • "UNAUTHENTICATED" → Service account doesn't have Vision API permissions
   • "RESOURCE_EXHAUSTED" → API quota exceeded (free tier = 1000/month)

💰 Pricing:
   • First 1,000 requests/month: FREE
   • After that: $1.50 per 1,000 requests
   • Learn more: https://cloud.google.com/vision/pricing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

// Check current credentials file
const fs = require('fs');
const path = require('path');

const credsPath = path.resolve(__dirname, '../../../google-credentials.json');

try {
  const content = fs.readFileSync(credsPath, 'utf8');
  const creds = JSON.parse(content);
  
  console.log('📄 Current credentials file status:\n');
  const checks = [
    { field: 'type', value: creds.type, expected: 'service_account' },
    { field: 'project_id', value: creds.project_id },
    { field: 'private_key', value: creds.private_key ? '(present)' : undefined },
    { field: 'client_email', value: creds.client_email },
  ];
  
  let allGood = true;
  for (const check of checks) {
    const icon = check.value ? '✅' : '❌';
    const status = check.value || '(missing)';
    console.log(`  ${icon} ${check.field.padEnd(15)} ${status}`);
    if (!check.value) allGood = false;
  }
  
  if (allGood) {
    console.log('\n🎉 Credentials file looks good! Try running the OCR test.');
  } else {
    console.log('\n⚠️  Credentials file is incomplete. Follow steps above to download a new one.');
  }
  
} catch (err) {
  console.log('❌ Could not read credentials file:', err.message);
  console.log('   Follow the steps above to create and download the file.');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
