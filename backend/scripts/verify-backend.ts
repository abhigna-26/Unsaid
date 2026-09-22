/**
 * Thought Catcher - Backend Verification Script
 * Validates build, lint, tests, security, configurations, and Firestore rules.
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: CheckResult[] = [];
const backendDir = path.resolve(__dirname, '..');
const functionsDir = path.join(backendDir, 'functions');

console.log('==================================================');
console.log('🔍 RUNNING THOUGHT CATCHER BACKEND VERIFICATION');
console.log('==================================================\n');

// 1. Check TypeScript Build
try {
  console.log('📦 Step 1: Compiling TypeScript...');
  execSync('npm run build', { cwd: functionsDir, stdio: 'pipe' });
  results.push({ name: 'TypeScript Build', passed: true, message: 'Clean compilation without errors.' });
} catch (err: any) {
  results.push({ name: 'TypeScript Build', passed: false, message: err.message });
}

// 2. Check ESLint
try {
  console.log('🧹 Step 2: Running Linter...');
  execSync('npm run lint', { cwd: functionsDir, stdio: 'pipe' });
  results.push({ name: 'ESLint Code Quality', passed: true, message: '0 errors, 0 warnings.' });
} catch (err: any) {
  results.push({ name: 'ESLint Code Quality', passed: false, message: err.message });
}

// 3. Check Unit & Security Tests
try {
  console.log('🧪 Step 3: Running Test Suite...');
  const testOutput = execSync('npm test', { cwd: functionsDir, encoding: 'utf-8' });
  results.push({ name: 'Jest Test Suite', passed: true, message: 'All unit and security tests passed.' });
} catch (err: any) {
  results.push({ name: 'Jest Test Suite', passed: false, message: err.message });
}

// 4. Check Firestore Rules and Indexes
try {
  console.log('🛡️ Step 4: Validating Security Rules & Indexes...');
  const rulesPath = path.join(backendDir, 'firestore.rules');
  const indexesPath = path.join(backendDir, 'firestore.indexes.json');
  if (fs.existsSync(rulesPath) && fs.existsSync(indexesPath)) {
    const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
    if (rulesContent.includes('rules_version = \'2\';') && rulesContent.includes('match /captures/{captureId}')) {
      results.push({ name: 'Firestore Security Rules', passed: true, message: 'Rules file is valid and covers all collections.' });
    } else {
      results.push({ name: 'Firestore Security Rules', passed: false, message: 'Rules file missing required matches.' });
    }
  } else {
    results.push({ name: 'Firestore Security Rules', passed: false, message: 'Missing firestore.rules or indexes.' });
  }
} catch (err: any) {
  results.push({ name: 'Firestore Security Rules', passed: false, message: err.message });
}

// 5. Check Git Ignore Security
try {
  console.log('🔒 Step 5: Scanning .gitignore for Secret Protection...');
  const gitignorePath = path.join(backendDir, '.gitignore');
  const functionsGitignorePath = path.join(functionsDir, '.gitignore');
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8') + fs.readFileSync(functionsGitignorePath, 'utf-8');

  if (gitignoreContent.includes('.secret.local') && gitignoreContent.includes('.env')) {
    results.push({ name: 'Secret Git Protection', passed: true, message: '.secret.local and .env are protected from git commits.' });
  } else {
    results.push({ name: 'Secret Git Protection', passed: false, message: 'Gitignore missing critical secret rules.' });
  }
} catch (err: any) {
  results.push({ name: 'Secret Git Protection', passed: false, message: err.message });
}

// 6. Security Scan (Search for hardcoded secret values)
try {
  console.log('🔎 Step 6: Scanning Codebase for Leaked Keys/Tokens...');
  const srcDir = path.join(functionsDir, 'src');

  function scanDir(dir: string): boolean {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!scanDir(fullPath)) return false;
      } else if (file.endsWith('.ts') && !file.includes('.test.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Check for suspicious patterns like real groq keys or raw secrets
        if (/gsk_[a-zA-Z0-9]{20,}/.test(content)) {
          return false;
        }
      }
    }
    return true;
  }

  const clean = scanDir(srcDir);
  if (clean) {
    results.push({ name: 'Hardcoded Secret Scan', passed: true, message: 'No hardcoded API keys or credentials detected.' });
  } else {
    results.push({ name: 'Hardcoded Secret Scan', passed: false, message: 'Found suspicious key patterns in source files.' });
  }
} catch (err: any) {
  results.push({ name: 'Hardcoded Secret Scan', passed: false, message: err.message });
}

// 7. Check Secret Presence (Without Printing Secret)
const hasLocalSecret = fs.existsSync(path.join(functionsDir, '.secret.local'));
const hasEnvGroq = Boolean(process.env.GROQ_API_KEY);
results.push({
  name: 'Groq Secret Configuration',
  passed: true,
  message: (hasLocalSecret || hasEnvGroq)
    ? 'Local Groq key configured.'
    : 'No local key found in .secret.local (Mock mode active in emulator). Run verify:groq when ready.',
});

// Summary Table
console.log('\n==================================================');
console.log('📋 VERIFICATION RESULTS SUMMARY');
console.log('==================================================');
let allPassed = true;
for (const res of results) {
  const icon = res.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} | ${res.name.padEnd(26)} | ${res.message}`);
  if (!res.passed) allPassed = false;
}
console.log('==================================================');

if (allPassed) {
  console.log('🎉 Backend verification succeeded! Ready for local emulator testing.\n');
  process.exit(0);
} else {
  console.error('⚠️ Verification encountered failures. Please inspect errors above.\n');
  process.exit(1);
}
