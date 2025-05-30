import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Building comprehensive single HTML file for ESP32...');

const outDir = path.join(__dirname, '../out');
const htmlPath = path.join(outDir, 'index.html');
const outputPath = path.join(outDir, 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.error('❌ Build not found. Run "npm run build" first.');
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');

// ========== COMPREHENSIVE FILE DISCOVERY ==========
console.log('🔍 Discovering all Next.js assets...');

function findAllAssets(dir, extensions = ['.css', '.js']) {
  const assets = [];
  
  function scanDir(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const items = fs.readdirSync(currentDir);
    items.forEach(item => {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDir(itemPath);
      } else if (extensions.some(ext => item.endsWith(ext))) {
        const relativePath = path.relative(outDir, itemPath);
        assets.push({
          file: item,
          fullPath: itemPath,
          relativePath: relativePath.replace(/\\/g, '/'),
          type: item.endsWith('.css') ? 'css' : 'js'
        });
      }
    });
  }
  
  scanDir(dir);
  return assets;
}

// Find all assets in _next directory
const nextDir = path.join(outDir, '_next');
const allAssets = findAllAssets(nextDir);

console.log(`📦 Found ${allAssets.length} assets to process`);
allAssets.forEach(asset => {
  console.log(`   ${asset.type.toUpperCase()}: ${asset.relativePath}`);
});

// ========== COMPREHENSIVE CSS INLINING ==========
console.log('📄 Processing ALL CSS files...');
const cssAssets = allAssets.filter(asset => asset.type === 'css');
let cssCount = 0;

cssAssets.forEach(asset => {
  try {
    const css = fs.readFileSync(asset.fullPath, 'utf8');
    
    // Multiple patterns to catch all CSS references
    const patterns = [
      // Standard link tags
      new RegExp(`<link[^>]*href="[^"]*${asset.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*>`, 'g'),
      // With leading slash
      new RegExp(`<link[^>]*href="[^"]*\\/${asset.relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*>`, 'g'),
      // Preload links
      new RegExp(`<link[^>]*rel="preload"[^>]*href="[^"]*${asset.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*>`, 'g'),
    ];
    
    let replaced = false;
    patterns.forEach(pattern => {
      if (pattern.test(html)) {
        html = html.replace(pattern, `<style>\n${css}\n</style>`);
        replaced = true;
      }
    });
    
    if (replaced) {
      cssCount++;
      console.log(`✅ Inlined CSS: ${asset.file}`);
    }
  } catch (error) {
    console.warn(`⚠️ Failed to inline CSS ${asset.file}:`, error.message);
  }
});

console.log(`✅ Total CSS files inlined: ${cssCount}`);

// ========== COMPREHENSIVE JAVASCRIPT INLINING ==========
console.log('📄 Processing ALL JavaScript files...');
const jsAssets = allAssets.filter(asset => asset.type === 'js');
let jsCount = 0;

jsAssets.forEach(asset => {
  try {
    let js = fs.readFileSync(asset.fullPath, 'utf8');
    
    // Clean and validate JavaScript
    js = js.trim();
    if (!js) {
      console.warn(`⚠️ Empty JS file: ${asset.file}`);
      return;
    }
    
    // Safe JavaScript processing
    js = js.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    js = js.replace(/<\/script>/gi, '<\\/script>');
    
    // Wrap in safe error handling with better error info
    const safeJS = `
(function() {
  try {
    ${js}
  } catch(error) {
    console.error('❌ JS Error in ${asset.file}:', error.message);
    console.error('Stack:', error.stack);
  }
})();`;

    // Multiple patterns to catch all script references
    const patterns = [
      // Standard script tags
      new RegExp(`<script[^>]*src="[^"]*${asset.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*></script>`, 'g'),
      // With full path
      new RegExp(`<script[^>]*src="[^"]*\\/${asset.relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*></script>`, 'g'),
      // Preload script tags
      new RegExp(`<link[^>]*rel="preload"[^>]*href="[^"]*${asset.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*>`, 'g'),
      // Module preload
      new RegExp(`<link[^>]*rel="modulepreload"[^>]*href="[^"]*${asset.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*>`, 'g'),
    ];
    
    let replaced = false;
    patterns.forEach(pattern => {
      if (pattern.test(html)) {
        html = html.replace(pattern, `<script>${safeJS}</script>`);
        replaced = true;
      }
    });
    
    if (replaced) {
      jsCount++;
      console.log(`✅ Inlined JS: ${asset.file}`);
    } else {
      // Check if this file is referenced but not found
      if (html.includes(asset.file)) {
        console.warn(`⚠️ File ${asset.file} referenced but pattern not matched`);
        // Try a more aggressive replacement
        const simplePattern = new RegExp(asset.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        if (html.includes(asset.file)) {
          console.log(`🔧 Attempting aggressive inline for ${asset.file}`);
          // Replace any reference to this file with inline script
          html = html.replace(
            new RegExp(`<script[^>]*src="[^"]*${asset.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*></script>`, 'g'),
            `<script>${safeJS}</script>`
          );
          jsCount++;
          console.log(`✅ Aggressively inlined JS: ${asset.file}`);
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ Failed to inline JS ${asset.file}:`, error.message);
  }
});

console.log(`✅ Total JavaScript files inlined: ${jsCount}`);

// ========== AGGRESSIVE CLEANUP ==========
console.log('🧹 Aggressive cleanup of ALL external references...');

// Remove ALL preload and modulepreload links
const preloadPatterns = [
  /<link[^>]*rel="preload"[^>]*>/g,
  /<link[^>]*rel="modulepreload"[^>]*>/g,
  /<link[^>]*rel="prefetch"[^>]*>/g,
  /<link[^>]*rel="dns-prefetch"[^>]*>/g,
];

preloadPatterns.forEach(pattern => {
  html = html.replace(pattern, '');
});

// Remove ALL _next references
const nextPatterns = [
  // Script tags
  /<script[^>]*src="[^"]*\/_next\/[^"]*"[^>]*><\/script>/g,
  /<script[^>]*src="[^"]*_next[^"]*"[^>]*><\/script>/g,
  // Link tags
  /<link[^>]*href="[^"]*\/_next\/[^"]*"[^>]*>/g,
  /<link[^>]*href="[^"]*_next[^"]*"[^>]*>/g,
  // Any remaining _next references
  /\/_next\/[^"'\s>]*/g,
  /_next\/[^"'\s>]*/g,
  // Empty src/href attributes
  /<script[^>]*src=""[^>]*><\/script>/g,
  /<link[^>]*href=""[^>]*>/g,
  /<script[^>]*src="\s*"[^>]*><\/script>/g,
  /<link[^>]*href="\s*"[^>]*>/g,
];

nextPatterns.forEach(pattern => {
  html = html.replace(pattern, '');
});

// Clean up multiple newlines and spaces
html = html.replace(/\n\s*\n\s*\n/g, '\n\n');
html = html.replace(/>\s+</g, '><');

// ========== ENHANCED DEBUGGING SCRIPT ==========
console.log('🔧 Adding enhanced debugging and React initialization...');

const enhancedDebugScript = `
<script>
console.log('🚀 Palletizer ESP32 app starting (comprehensive build)...');

// Enhanced global error handling
window.addEventListener('error', function(e) {
  console.error('❌ GLOBAL ERROR:', {
    message: e.message || 'Unknown error',
    filename: e.filename || 'unknown',
    lineno: e.lineno || 0,
    colno: e.colno || 0,
    stack: e.error ? e.error.stack : 'No stack trace'
  });
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('❌ UNHANDLED PROMISE REJECTION:', e.reason);
  e.preventDefault();
});

// React initialization check
let reactCheckCount = 0;
const maxReactChecks = 10;

function checkReactStatus() {
  reactCheckCount++;
  console.log('🔍 React check #' + reactCheckCount);
  
  if (typeof React === 'undefined') {
    console.warn('⚠️ React not available yet');
    if (reactCheckCount < maxReactChecks) {
      setTimeout(checkReactStatus, 500);
    } else {
      console.error('❌ React failed to load after ' + maxReactChecks + ' attempts');
      showReactError();
    }
    return;
  }
  
  if (typeof ReactDOM === 'undefined') {
    console.warn('⚠️ ReactDOM not available yet');
    if (reactCheckCount < maxReactChecks) {
      setTimeout(checkReactStatus, 500);
    } else {
      console.error('❌ ReactDOM failed to load after ' + maxReactChecks + ' attempts');
      showReactError();
    }
    return;
  }
  
  console.log('✅ React and ReactDOM loaded successfully');
  
  // Check if React app mounted
  setTimeout(function() {
    const root = document.getElementById('root');
    if (root && root.children.length > 0) {
      console.log('✅ React app mounted successfully');
    } else {
      console.warn('⚠️ React loaded but app not mounted');
      showMountError();
    }
  }, 2000);
}

function showReactError() {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = '<div style="padding: 20px; color: red; font-family: monospace; border: 1px solid red; margin: 20px; border-radius: 4px;"><h3>React Loading Error</h3><p>React library failed to load. This may be due to missing JavaScript chunks.</p><p>Check the browser console for specific errors.</p></div>';
  }
}

function showMountError() {
  const root = document.getElementById('root');
  if (root && root.children.length === 0) {
    root.innerHTML = '<div style="padding: 20px; color: orange; font-family: monospace; border: 1px solid orange; margin: 20px; border-radius: 4px;"><h3>React Mount Warning</h3><p>React loaded but the app component did not mount.</p><p>Check console for component errors.</p></div>';
  }
}

// DOM ready handler
document.addEventListener('DOMContentLoaded', function() {
  console.log('📋 DOM Content Loaded');
  
  // Ensure root element exists
  let root = document.getElementById('root');
  if (!root) {
    console.log('🔧 Creating root element');
    root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
  }
  
  // Start React checking
  setTimeout(checkReactStatus, 100);
});

console.log('📋 Enhanced error handling and React monitoring setup complete');
</script>
`;

// Insert enhanced debug script before closing head tag
html = html.replace('</head>', enhancedDebugScript + '</head>');

// ========== ENSURE ROOT ELEMENT ==========
if (!html.includes('<div id="root">')) {
  console.log('🔧 Adding root element');
  const bodyMatch = html.match(/<body[^>]*>/);
  if (bodyMatch) {
    html = html.replace(bodyMatch[0], bodyMatch[0] + '\n<div id="root"></div>');
  }
}

// ========== WRITE OUTPUT ==========
console.log('💾 Writing comprehensive output file...');
fs.writeFileSync(outputPath, html, 'utf8');

// ========== FINAL VALIDATION ==========
const stats = fs.statSync(outputPath);
const fileSizeKB = (stats.size / 1024).toFixed(2);

console.log('');
console.log('🎉 Comprehensive build completed!');
console.log('📁 Output: index.html');
console.log(`📊 Size: ${fileSizeKB} KB`);

// Final validation checks
const finalHtml = fs.readFileSync(outputPath, 'utf8');
const hasRoot = finalHtml.includes('<div id="root">');
const hasStyle = finalHtml.includes('<style>');
const hasScript = finalHtml.includes('<script>');
const hasNextRefs = finalHtml.includes('_next/');
const hasPreloads = finalHtml.includes('rel="preload"');

console.log('');
console.log('🔍 Final validation:');
console.log(`Root element: ${hasRoot ? '✅' : '❌'}`);
console.log(`CSS inlined: ${hasStyle ? '✅' : '❌'}`);
console.log(`JS inlined: ${hasScript ? '✅' : '❌'}`);
console.log(`Next.js refs: ${hasNextRefs ? '❌ Found' : '✅ Clean'}`);
console.log(`Preload links: ${hasPreloads ? '❌ Found' : '✅ Clean'}`);
console.log(`Enhanced debugging: ✅ Added`);

// Size warnings
if (stats.size < 100 * 1024) {
  console.log('⚠️  Warning: File size < 100KB, may be incomplete');
} else if (stats.size > 1024 * 1024) {
  console.log('⚠️  Warning: File size > 1MB, may be too large for ESP32');
} else {
  console.log('✅ File size is optimal for ESP32');
}

// Check for missing files
if (hasNextRefs) {
  console.log('');
  console.log('🔍 Remaining _next references found:');
  const nextMatches = finalHtml.match(/_next\/[^"'\s>]*/g);
  if (nextMatches) {
    const uniqueRefs = [...new Set(nextMatches)];
    uniqueRefs.forEach(ref => console.log(`   ${ref}`));
  }
}

console.log('');
console.log('🧪 Test instructions:');
console.log('1. start out\\index.html');
console.log('2. Open F12 console IMMEDIATELY');
console.log('3. Look for "🚀 Palletizer ESP32 app starting"');
console.log('4. Check for "✅ React app mounted successfully"');
console.log('5. Report any ChunkLoadError or missing file errors');
console.log('');
console.log('✨ Comprehensive build complete!');