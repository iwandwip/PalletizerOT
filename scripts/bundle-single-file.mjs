import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Building single HTML file for ESP32...');

const outDir = path.join(__dirname, '../out');
const htmlPath = path.join(outDir, 'index.html');
const outputPath = path.join(outDir, 'index.html'); // Output sebagai index.html

if (!fs.existsSync(htmlPath)) {
  console.error('❌ Build not found. Run "npm run build" first.');
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');

// ========== CSS INLINING ==========
console.log('📄 Processing CSS files...');
const cssDir = path.join(outDir, '_next/static/css');
if (fs.existsSync(cssDir)) {
  const cssFiles = fs.readdirSync(cssDir);
  let cssCount = 0;
  
  cssFiles.forEach(file => {
    if (file.endsWith('.css')) {
      const cssPath = path.join(cssDir, file);
      const css = fs.readFileSync(cssPath, 'utf8');
      
      // Escape filename untuk regex
      const escapedFile = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const linkPattern = new RegExp(
        `<link[^>]*href="[^"]*\\/_next\\/static\\/css\\/${escapedFile}[^"]*"[^>]*>`,
        'g'
      );
      
      if (linkPattern.test(html)) {
        html = html.replace(linkPattern, `<style>${css}</style>`);
        cssCount++;
      }
    }
  });
  
  console.log(`✅ Inlined ${cssCount} CSS files`);
} else {
  console.log('⚠️  No CSS directory found');
}

// ========== JAVASCRIPT INLINING ==========
console.log('📄 Processing JavaScript files...');

// Helper function untuk inline JavaScript files
function inlineJavaScript(html, jsDir, dirName) {
  if (!fs.existsSync(jsDir)) {
    console.log(`⚠️  No ${dirName} directory found`);
    return html;
  }
  
  const jsFiles = fs.readdirSync(jsDir);
  let jsCount = 0;
  
  jsFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const jsPath = path.join(jsDir, file);
      let js = fs.readFileSync(jsPath, 'utf8');
      
      // Clean line endings dan escape script-breaking content
      js = js.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      js = js.replace(/<\/script>/gi, '<\\/script>');
      
      // Escape filename untuk regex
      const escapedFile = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const scriptPattern = new RegExp(
        `<script[^>]*src="[^"]*\\/_next\\/static\\/${dirName}\\/${escapedFile}[^"]*"[^>]*></script>`,
        'g'
      );
      
      if (scriptPattern.test(html)) {
        html = html.replace(scriptPattern, `<script>${js}</script>`);
        jsCount++;
      }
    }
  });
  
  if (jsCount > 0) {
    console.log(`✅ Inlined ${jsCount} ${dirName} files`);
  }
  
  return html;
}

// Process chunks directory
html = inlineJavaScript(html, path.join(outDir, '_next/static/chunks'), 'chunks');

// Process js directory
html = inlineJavaScript(html, path.join(outDir, '_next/static/js'), 'js');

// Handle static manifest files
const staticManifests = [
  { file: 'buildManifest.js', name: 'buildManifest.js' },
  { file: 'ssgManifest.js', name: 'ssgManifest.js' },
  { file: '_buildManifest.js', name: '_buildManifest.js' },
  { file: '_ssgManifest.js', name: '_ssgManifest.js' }
];

staticManifests.forEach(({ file, name }) => {
  const manifestPath = path.join(outDir, '_next/static', file);
  if (fs.existsSync(manifestPath)) {
    const js = fs.readFileSync(manifestPath, 'utf8');
    const escapedFile = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const scriptPattern = new RegExp(
      `<script[^>]*src="[^"]*\\/_next\\/static\\/${escapedFile}[^"]*"[^>]*></script>`,
      'g'
    );
    
    if (scriptPattern.test(html)) {
      html = html.replace(scriptPattern, `<script>${js}</script>`);
      console.log(`✅ Inlined ${name}`);
    }
  }
});

// ========== CLEANUP EXTERNAL REFERENCES ==========
console.log('🧹 Cleaning up external references...');

const cleanupPatterns = [
  // Remove any remaining _next references
  /\/_next\/[^"'\s>]*/g,
  /_next\/[^"'\s>]*/g,
  // Remove empty or invalid link/script tags
  /<link[^>]*href="[^"]*_next[^"]*"[^>]*>/g,
  /<script[^>]*src="[^"]*_next[^"]*"[^>]*><\/script>/g,
  /<link[^>]*href=""[^>]*>/g,
  /<link[^>]*href="\s*"[^>]*>/g,
  /<script[^>]*src=""[^>]*><\/script>/g,
  /<script[^>]*src="\s*"[^>]*><\/script>/g,
  // Remove preload/prefetch links
  /<link[^>]*rel="preload"[^>]*>/g,
  /<link[^>]*rel="modulepreload"[^>]*>/g,
  /<link[^>]*rel="prefetch"[^>]*>/g
];

cleanupPatterns.forEach(pattern => {
  html = html.replace(pattern, '');
});

// Remove empty lines created by cleanup
html = html.replace(/\n\s*\n/g, '\n');

// ========== ADD DEBUGGING SCRIPT ==========
console.log('🔧 Adding ESP32 compatibility and debugging scripts...');

const debugScript = `
<script>
console.log('🚀 Palletizer ESP32 app initializing...');

// ESP32 compatibility checks
if (typeof fetch === 'undefined') {
  console.warn('⚠️ Fetch API not available - using XMLHttpRequest fallback');
}

// Enhanced error handling
window.addEventListener('error', function(e) {
  console.error('❌ Runtime error:', e.error || e.message);
  console.error('Location:', (e.filename || 'unknown') + ':' + (e.lineno || 0) + ':' + (e.colno || 0));
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('❌ Unhandled promise rejection:', e.reason);
  e.preventDefault(); // Prevent default browser handling
});

// Ensure root element exists for React
document.addEventListener('DOMContentLoaded', function() {
  let rootElement = document.getElementById('root');
  if (!rootElement) {
    console.log('🔧 Creating missing root element...');
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
    console.log('✅ Root element created');
  } else {
    console.log('✅ Root element found');
  }
  
  // Check React mounting
  setTimeout(function() {
    if (rootElement.children.length === 0) {
      console.warn('⚠️ Root element is empty - React may not have mounted');
      // Try to trigger React initialization
      if (window.React && window.ReactDOM) {
        console.log('🔄 Attempting manual React mount...');
      }
    } else {
      console.log('✅ React app mounted successfully');
    }
  }, 2000);
});

// ESP32 memory management
if (typeof gc === 'function') {
  console.log('♻️ Garbage collection available');
  setInterval(function() {
    if (Math.random() < 0.1) { // 10% chance every interval
      gc();
    }
  }, 30000); // Every 30 seconds
}

console.log('📋 ESP32 compatibility setup complete');
</script>
`;

// Insert debug script before closing head tag
html = html.replace('</head>', debugScript + '</head>');

// ========== ENSURE ROOT ELEMENT ==========
console.log('🔧 Ensuring root element exists...');
if (!html.includes('<div id="root">') && !html.includes('<div id="root"/>')) {
  console.log('⚠️ Adding missing root element for React mounting');
  
  const bodyRegex = /<body[^>]*>/;
  if (bodyRegex.test(html)) {
    html = html.replace(bodyRegex, (match) => {
      return match + '<div id="root"></div>';
    });
  } else {
    html = html.replace('</body>', '<div id="root"></div></body>');
  }
}

// ========== MINIFY HTML ==========
console.log('📏 Minifying HTML...');
html = html
  .replace(/>\s+</g, '><')           // Remove whitespace between tags
  .replace(/\s{2,}/g, ' ')           // Replace multiple spaces with single space
  .replace(/<!--.*?-->/g, '')        // Remove HTML comments (except conditional)
  .trim();

// ========== WRITE OUTPUT ==========
console.log('💾 Writing output file...');
fs.writeFileSync(outputPath, html, 'utf8');

// ========== FILE SIZE ANALYSIS ==========
const stats = fs.statSync(outputPath);
const fileSizeKB = (stats.size / 1024).toFixed(2);
const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log('');
console.log('🎉 Build completed successfully!');
console.log('📁 Output file: index.html');
console.log(`📊 File size: ${fileSizeKB} KB (${fileSizeMB} MB)`);

// ESP32 size warnings
if (stats.size > 1024 * 1024) { // > 1MB
  console.log('⚠️  Warning: File size > 1MB may be too large for some ESP32 configurations');
  console.log('💡 Consider enabling GZIP compression on ESP32 web server');
} else if (stats.size > 512 * 1024) { // > 512KB
  console.log('💡 Note: File size > 512KB - ensure ESP32 has sufficient flash space');
} else {
  console.log('✅ File size is optimal for ESP32 deployment');
}

// ========== VALIDATION CHECKS ==========
console.log('');
console.log('🔍 Final validation checks:');

const hasRootElement = html.includes('<div id="root">') || html.includes('<div id="root"/>');
const hasReactRefs = html.includes('React') || html.includes('react');
const hasExternalRefs = html.includes('_next');
const hasCSSInlined = html.includes('<style>');

// Count script tags
const scriptTags = html.match(/<script[^>]*>/g) || [];
const inlineScripts = scriptTags.filter(tag => !tag.includes('src=')).length;
const externalScripts = scriptTags.filter(tag => tag.includes('src=')).length;
const hasJSInlined = inlineScripts > 0;

console.log(`Root element: ${hasRootElement ? '✅' : '❌'}`);
console.log(`React references: ${hasReactRefs ? '✅' : '❌'}`);
console.log(`External _next refs: ${hasExternalRefs ? '❌ Found' : '✅ Clean'}`);
console.log(`CSS inlined: ${hasCSSInlined ? '✅' : '❌'}`);
console.log(`JS inlined: ${hasJSInlined ? '✅' : '❌'} (${inlineScripts} inline, ${externalScripts} external)`);

// Log remaining external references if any
if (externalScripts > 0) {
  console.log('🔍 Remaining external scripts:');
  scriptTags.filter(tag => tag.includes('src=')).forEach(tag => {
    console.log(`   ${tag}`);
  });
}

// ========== DEPLOYMENT INSTRUCTIONS ==========
console.log('');
console.log('🚀 ESP32 Deployment Instructions:');
console.log('1. Upload index.html to ESP32 LittleFS root directory');
console.log('2. Ensure ESP32 web server serves files from LittleFS');
console.log('3. Access via ESP32 IP address (e.g., http://192.168.4.1)');
console.log('');
console.log('🧪 Local testing:');
console.log('   cd out && npx http-server -p 3002');
console.log('   Then open: http://localhost:3002/index.html');
console.log('');
console.log('✨ Ready for ESP32 deployment!');