import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📦 Preparing ESP32 deployment package...');

const outDir = path.join(__dirname, '../out');

if (!fs.existsSync(outDir)) {
  console.error('❌ Build folder not found. Run "npm run build" first.');
  process.exit(1);
}

// Calculate total size
function getDirectorySize(dirPath) {
  let size = 0;
  
  function calculateSize(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        calculateSize(itemPath);
      } else {
        size += stat.size;
      }
    });
  }
  
  calculateSize(dirPath);
  return size;
}

// List all files for ESP32 upload
console.log('📋 Files ready for ESP32 LittleFS upload:');

function listFiles(dir, prefix = '') {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    const relativePath = prefix + item;
    
    if (stat.isDirectory()) {
      console.log(`📁 /${relativePath}/`);
      listFiles(itemPath, relativePath + '/');
    } else {
      const sizeKB = (stat.size / 1024).toFixed(1);
      console.log(`📄 /${relativePath} (${sizeKB} KB)`);
    }
  });
}

listFiles(outDir);

const totalSize = getDirectorySize(outDir);
const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

console.log('');
console.log('🎉 ESP32 deployment package ready!');
console.log(`📊 Total size: ${totalSizeMB} MB`);
console.log('📁 Location: out/');

console.log('');
console.log('🚀 ESP32 Upload Instructions:');
console.log('1. Upload ALL files from out/ folder to ESP32 LittleFS root');
console.log('2. Maintain directory structure (including _next/ folder)');
console.log('3. Entry point: index.html');
console.log('4. Access: http://[ESP32-IP]/');

console.log('');
console.log('📋 ESP32 LittleFS structure:');
console.log('/');
console.log('├── index.html         ← Entry point');
console.log('├── _next/');
console.log('│   └── static/');
console.log('│       ├── css/       ← CSS files');
console.log('│       └── chunks/    ← JavaScript files');
console.log('└── other files...');

console.log('');
console.log('💡 Advantages:');
console.log('- ✅ No JavaScript bundling errors');
console.log('- ✅ Faster loading (parallel file requests)');
console.log('- ✅ Full Next.js functionality');
console.log('- ✅ Better browser caching');
console.log('- ✅ Same entry point as before');

if (totalSize > 4 * 1024 * 1024) {
  console.log('');
  console.log('⚠️  Warning: Total size > 4MB');
  console.log('💡 Ensure ESP32 has sufficient flash storage');
} else {
  console.log('');
  console.log('✅ File size is acceptable for ESP32 flash storage');
}

console.log('');
console.log('🧪 Local testing:');
console.log('   cd out && npx http-server -p 3002');
console.log('   Then open: http://localhost:3002');
console.log('');
console.log('✨ Ready for ESP32 deployment!');