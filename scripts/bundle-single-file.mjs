import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Building single HTML file for ESP32...');

// Paths
const outDir = path.join(__dirname, '../out');
const htmlPath = path.join(outDir, 'index.html');
const outputPath = path.join(outDir, 'palletizer.html');

// Check if build exists
if (!fs.existsSync(htmlPath)) {
  console.error('❌ Build not found. Run "npm run build" first.');
  process.exit(1);
}

// Read main HTML file
let html = fs.readFileSync(htmlPath, 'utf8');

console.log('📄 Processing CSS files...');

// Function to inline CSS files
const cssDir = path.join(outDir, '_next/static/css');
if (fs.existsSync(cssDir)) {
  const cssFiles = fs.readdirSync(cssDir);
  let cssCount = 0;
  
  cssFiles.forEach(file => {
    if (file.endsWith('.css')) {
      const cssPath = path.join(cssDir, file);
      const css = fs.readFileSync(cssPath, 'utf8');
      
      // Robust pattern matching for CSS links
      const linkPattern = new RegExp(
        `<link[^>]*href="[^"]*\\/_next\\/static\\/css\\/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*>`,
        'g'
      );
      
      html = html.replace(linkPattern, `<style>${css}</style>`);
      cssCount++;
    }
  });
  
  console.log(`✅ Inlined ${cssCount} CSS files`);
} else {
  console.log('⚠️  No CSS directory found');
}

console.log('📄 Processing JavaScript files...');

// Function to inline JS files
const jsDir = path.join(outDir, '_next/static/chunks');
if (fs.existsSync(jsDir)) {
  const jsFiles = fs.readdirSync(jsDir);
  let jsCount = 0;
  
  jsFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const jsPath = path.join(jsDir, file);
      const js = fs.readFileSync(jsPath, 'utf8');
      
      // Robust pattern matching for script tags
      const scriptPattern = new RegExp(
        `<script[^>]*src="[^"]*\\/_next\\/static\\/chunks\\/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*></script>`,
        'g'
      );
      
      html = html.replace(scriptPattern, `<script>${js}</script>`);
      jsCount++;
    }
  });
  
  console.log(`✅ Inlined ${jsCount} JavaScript files`);
} else {
  console.log('⚠️  No JavaScript chunks directory found');
}

// Also inline main application JS (if exists)
const appDir = path.join(outDir, '_next/static/js');
if (fs.existsSync(appDir)) {
  const appFiles = fs.readdirSync(appDir);
  let appJsCount = 0;
  
  appFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const appJsPath = path.join(appDir, file);
      const appJs = fs.readFileSync(appJsPath, 'utf8');
      
      const appScriptPattern = new RegExp(
        `<script[^>]*src="[^"]*\\/_next\\/static\\/js\\/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*></script>`,
        'g'
      );
      
      html = html.replace(appScriptPattern, `<script>${appJs}</script>`);
      appJsCount++;
    }
  });
  
  if (appJsCount > 0) {
    console.log(`✅ Inlined ${appJsCount} application JS files`);
  }
}

// Clean up any remaining _next references
html = html.replace(/\/_next\/static\/[^"'\s]*/g, '');

// Remove any empty link/script tags
html = html.replace(/<link[^>]*href=""[^>]*>/g, '');
html = html.replace(/<script[^>]*src=""[^>]*><\/script>/g, '');

// Minify HTML (optional but recommended for ESP32)
html = html
  .replace(/>\s+</g, '><')           // Remove whitespace between tags
  .replace(/\s{2,}/g, ' ')           // Replace multiple spaces with single space
  .replace(/<!--.*?-->/g, '')        // Remove HTML comments
  .trim();

// Write the final single file
fs.writeFileSync(outputPath, html, 'utf8');

// Get file statistics
const stats = fs.statSync(outputPath);
const fileSizeKB = (stats.size / 1024).toFixed(2);
const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log('');
console.log('🎉 Build completed successfully!');
console.log('📁 Output file:', outputPath);
console.log(`📊 File size: ${fileSizeKB} KB (${fileSizeMB} MB)`);

// File size recommendations
if (stats.size > 1024 * 1024) {
  console.log('⚠️  Warning: File size > 1MB may be too large for some ESP32 configurations');
} else if (stats.size > 512 * 1024) {
  console.log('💡 Note: File size > 512KB - ensure ESP32 has sufficient flash space');
} else {
  console.log('✅ File size is optimal for ESP32 deployment');
}

console.log('');
console.log('🚀 Ready for ESP32 deployment');
console.log('');
console.log('📋 Next steps:');
console.log('1. Upload palletizer.html to ESP32 LittleFS');
console.log('2. Rename to index.html on ESP32');
console.log('3. Access via ESP32 IP address');
console.log('4. Test all functionality');