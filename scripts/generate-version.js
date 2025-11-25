const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');

const versionInfo = {
  version: packageJson.version,
  buildNumber: process.env.BUILD_NUMBER || Date.now().toString(),
  buildDate: new Date().toISOString(),
  gitCommit: process.env.GIT_COMMIT || 'local',
  environment: process.env.NODE_ENV || 'development'
};

const outputPath = path.join(__dirname, '..', 'frontend', 'public', 'version.json');

// Ensure the public directory exists
const publicDir = path.dirname(outputPath);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

console.log('✓ Version info generated:', versionInfo.version);
console.log('  Build:', versionInfo.buildNumber);
console.log('  Date:', versionInfo.buildDate);
