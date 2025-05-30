import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Building single HTML file for ESP32...');

const outDir = path.join(__dirname, '../out');
const htmlPath = path.join(outDir, 'index.html');
const outputPath = path.join(outDir, 'palletizer.html');

if (!fs.existsSync(htmlPath)) {
  console.error('❌ Build not found. Run "npm run build" first.');
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');

console.log('📄 Processing CSS files...');
const cssDir = path.join(outDir, '_next/static/css');
if (fs.existsSync(cssDir)) {
  const cssFiles = fs.readdirSync(cssDir);
  let cssCount = 0;
  
  cssFiles.forEach(file => {
    if (file.endsWith('.css')) {
      const cssPath = path.join(cssDir, file);
      const css = fs.readFileSync(cssPath, 'utf8');
      
      const linkPattern = new RegExp(
        `<link[^>]*href="[^"]*\\/_next\\/static\\/css\\/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*>`,
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

console.log('📄 Processing JavaScript files (comprehensive)...');

// Function to safely inline JavaScript
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
      
      // Clean line endings
      js = js.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Escape any potential script-breaking content
      js = js.replace(/<\/script>/gi, '<\\/script>');
      
      // Find and replace script tags for this file
      const scriptPatterns = [
        new RegExp(`<script[^>]*src="[^"]*\\/_next\\/static\\/${dirName}\\/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\console.log('📄 Processing JavaScript files...');
const chunksDir = path.join(outDir, '_next/static/chunks');
if (fs.existsSync(chunksDir)) {
  const jsFiles = fs.readdirSync(chunksDir);
  let jsCount = 0;
  
  jsFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const jsPath = path.join(chunksDir, file);
      let js = fs.readFileSync(jsPath, 'utf8');
      
      js = js.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      const scriptPattern = new RegExp(
        `<script[^>]*src="[^"]*\\/_next\\/static\\/chunks\\/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*></script>`,
        'g'
      );
      
      if (scriptPattern.test(html)) {
        html = html.replace(scriptPattern, `<script>${js}</script>`);
        jsCount++;
      }
    }
  });
  
  console.log(`✅ Inlined ${jsCount} JavaScript chunk files`);
} else {
  console.log('⚠️  No JavaScript chunks directory found');
}

const appDir = path.join(outDir, '_next/static/js');
if (fs.existsSync(appDir)) {
  const appFiles = fs.readdirSync(appDir);
  let appJsCount = 0;
  
  appFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const appJsPath = path.join(appDir, file);
      let appJs = fs.readFileSync(appJsPath, 'utf8');
      
      appJs = appJs.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      const appScriptPattern = new RegExp(
        `<script[^>]*src="[^"]*\\/_next\\/static\\/js\\/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*></script>`,
        'g'
      );
      
      if (appScriptPattern.test(html)) {
        html = html.replace(appScriptPattern, `<script>${appJs}</script>`);
        appJsCount++;
      }
    }
  });
  
  if (appJsCount > 0) {
    console.log(`✅ Inlined ${appJsCount} application JS files`);
  }
}

const buildManifestPath = path.join(outDir, '_next/static/buildManifest.js');
if (fs.existsSync(buildManifestPath)) {
  const buildManifest = fs.readFileSync(buildManifestPath, 'utf8');
  const buildScriptPattern = /<script[^>]*src="[^"]*\/_next\/static\/buildManifest\.js[^"]*"[^>]*><\/script>/g;
  if (buildScriptPattern.test(html)) {
    html = html.replace(buildScriptPattern, `<script>${buildManifest}</script>`);
    console.log('✅ Inlined buildManifest.js');
  }
}

const ssgManifestPath = path.join(outDir, '_next/static/ssgManifest.js');
if (fs.existsSync(ssgManifestPath)) {
  const ssgManifest = fs.readFileSync(ssgManifestPath, 'utf8');
  const ssgScriptPattern = /<script[^>]*src="[^"]*\/_next\/static\/ssgManifest\.js[^"]*"[^>]*><\/script>/g;
  if (ssgScriptPattern.test(html)) {
    html = html.replace(ssgScriptPattern, `<script>${ssgManifest}</script>`);
    console.log('✅ Inlined ssgManifest.js');
  }
}')}[^"]*"[^>]*></script>`, 'g'),
        new RegExp(`<script[^>]*src="[^"]*_next/static/${dirName}/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\console.log('📄 Processing JavaScript files...');
const chunksDir = path.join(outDir, '_next/static/chunks');
if (fs.existsSync(chunksDir)) {
  const jsFiles = fs.readdirSync(chunksDir);
  let jsCount = 0;
  
  jsFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const jsPath = path.join(chunksDir, file);
      let js = fs.readFileSync(jsPath, 'utf8');
      
      js = js.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      const scriptPattern = new RegExp(
        `<script[^>]*src="[^"]*\\/_next\\/static\\/chunks\\/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*></script>`,
        'g'
      );
      
      if (scriptPattern.test(html)) {
        html = html.replace(scriptPattern, `<script>${js}</script>`);
        jsCount++;
      }
    }
  });
  
  console.log(`✅ Inlined ${jsCount} JavaScript chunk files`);
} else {
  console.log('⚠️  No JavaScript chunks directory found');
}

const appDir = path.join(outDir, '_next/static/js');
if (fs.existsSync(appDir)) {
  const appFiles = fs.readdirSync(appDir);
  let appJsCount = 0;
  
  appFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const appJsPath = path.join(appDir, file);
      let appJs = fs.readFileSync(appJsPath, 'utf8');
      
      appJs = appJs.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      const appScriptPattern = new RegExp(
        `<script[^>]*src="[^"]*\\/_next\\/static\\/js\\/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*></script>`,
        'g'
      );
      
      if (appScriptPattern.test(html)) {
        html = html.replace(appScriptPattern, `<script>${appJs}</script>`);
        appJsCount++;
      }
    }
  });
  
  if (appJsCount > 0) {
    console.log(`✅ Inlined ${appJsCount} application JS files`);
  }
}

const buildManifestPath = path.join(outDir, '_next/static/buildManifest.js');
if (fs.existsSync(buildManifestPath)) {
  const buildManifest = fs.readFileSync(buildManifestPath, 'utf8');
  const buildScriptPattern = /<script[^>]*src="[^"]*\/_next\/static\/buildManifest\.js[^"]*"[^>]*><\/script>/g;
  if (buildScriptPattern.test(html)) {
    html = html.replace(buildScriptPattern, `<script>${buildManifest}</script>`);
    console.log('✅ Inlined buildManifest.js');
  }
}

const ssgManifestPath = path.join(outDir, '_next/static/ssgManifest.js');
if (fs.existsSync(ssgManifestPath)) {
  const ssgManifest = fs.readFileSync(ssgManifestPath, 'utf8');
  const ssgScriptPattern = /<script[^>]*src="[^"]*\/_next\/static\/ssgManifest\.js[^"]*"[^>]*><\/script>/g;
  if (ssgScriptPattern.test(html)) {
    html = html.replace(ssgScriptPattern, `<script>${ssgManifest}</script>`);
    console.log('✅ Inlined ssgManifest.js');
  }
}')}[^"]*"[^>]*></script>`, 'g'),
        new RegExp(`<script[^>]*src="[^"]*${file.replace(/[.*+?^${}()|[\]\\]/g, '\\console.log('📄 Processing JavaScript files...');
const chunksDir = path.join(outDir, '_next/static/chunks');
if (fs.existsSync(chunksDir)) {
  const jsFiles = fs.readdirSync(chunksDir);
  let jsCount = 0;
  
  jsFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const jsPath = path.join(chunksDir, file);
      let js = fs.readFileSync(jsPath, 'utf8');
      
      js = js.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      const scriptPattern = new RegExp(
        `<script[^>]*src="[^"]*\\/_next\\/static\\/chunks\\/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*></script>`,
        'g'
      );
      
      if (scriptPattern.test(html)) {
        html = html.replace(scriptPattern, `<script>${js}</script>`);
        jsCount++;
      }
    }
  });
  
  console.log(`✅ Inlined ${jsCount} JavaScript chunk files`);
} else {
  console.log('⚠️  No JavaScript chunks directory found');
}

const appDir = path.join(outDir, '_next/static/js');
if (fs.existsSync(appDir)) {
  const appFiles = fs.readdirSync(appDir);
  let appJsCount = 0;
  
  appFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const appJsPath = path.join(appDir, file);
      let appJs = fs.readFileSync(appJsPath, 'utf8');
      
      appJs = appJs.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      const appScriptPattern = new RegExp(
        `<script[^>]*src="[^"]*\\/_next\\/static\\/js\\/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*></script>`,
        'g'
      );
      
      if (appScriptPattern.test(html)) {
        html = html.replace(appScriptPattern, `<script>${appJs}</script>`);
        appJsCount++;
      }
    }
  });
  
  if (appJsCount > 0) {
    console.log(`✅ Inlined ${appJsCount} application JS files`);
  }
}

const buildManifestPath = path.join(outDir, '_next/static/buildManifest.js');
if (fs.existsSync(buildManifestPath)) {
  const buildManifest = fs.readFileSync(buildManifestPath, 'utf8');
  const buildScriptPattern = /<script[^>]*src="[^"]*\/_next\/static\/buildManifest\.js[^"]*"[^>]*><\/script>/g;
  if (buildScriptPattern.test(html)) {
    html = html.replace(buildScriptPattern, `<script>${buildManifest}</script>`);
    console.log('✅ Inlined buildManifest.js');
  }
}

const ssgManifestPath = path.join(outDir, '_next/static/ssgManifest.js');
if (fs.existsSync(ssgManifestPath)) {
  const ssgManifest = fs.readFileSync(ssgManifestPath, 'utf8');
  const ssgScriptPattern = /<script[^>]*src="[^"]*\/_next\/static\/ssgManifest\.js[^"]*"[^>]*><\/script>/g;
  if (ssgScriptPattern.test(html)) {
    html = html.replace(ssgScriptPattern, `<script>${ssgManifest}</script>`);
    console.log('✅ Inlined ssgManifest.js');
  }
}')}[^"]*"[^>]*></script>`, 'g')
      ];
      
      let replaced = false;
      scriptPatterns.forEach(pattern => {
        if (pattern.test(html)) {
          html = html.replace(pattern, `<script>${js}</script>`);
          replaced = true;
        }
      });
      
      if (replaced) {
        jsCount++;
      }
    }
  });
  
  console.log(`✅ Inlined ${jsCount} ${dirName} files`);
  return html;
}

// Process all JavaScript directories
html = inlineJavaScript(html, path.join(outDir, '_next/static/chunks'), 'chunks');
html = inlineJavaScript(html, path.join(outDir, '_next/static/js'), 'js');

// Handle additional static files
const staticDir = path.join(outDir, '_next/static');
if (fs.existsSync(staticDir)) {
  const staticFiles = ['buildManifest.js', 'ssgManifest.js', '_buildManifest.js', '_ssgManifest.js'];
  
  staticFiles.forEach(filename => {
    const filePath = path.join(staticDir, filename);
    if (fs.existsSync(filePath)) {
      const js = fs.readFileSync(filePath, 'utf8');
      const pattern = new RegExp(`<script[^>]*src="[^"]*${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\console.log('📄 Processing JavaScript files...');
const chunksDir = path.join(outDir, '_next/static/chunks');
if (fs.existsSync(chunksDir)) {
  const jsFiles = fs.readdirSync(chunksDir);
  let jsCount = 0;
  
  jsFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const jsPath = path.join(chunksDir, file);
      let js = fs.readFileSync(jsPath, 'utf8');
      
      js = js.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      const scriptPattern = new RegExp(
        `<script[^>]*src="[^"]*\\/_next\\/static\\/chunks\\/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*></script>`,
        'g'
      );
      
      if (scriptPattern.test(html)) {
        html = html.replace(scriptPattern, `<script>${js}</script>`);
        jsCount++;
      }
    }
  });
  
  console.log(`✅ Inlined ${jsCount} JavaScript chunk files`);
} else {
  console.log('⚠️  No JavaScript chunks directory found');
}

const appDir = path.join(outDir, '_next/static/js');
if (fs.existsSync(appDir)) {
  const appFiles = fs.readdirSync(appDir);
  let appJsCount = 0;
  
  appFiles.forEach(file => {
    if (file.endsWith('.js')) {
      const appJsPath = path.join(appDir, file);
      let appJs = fs.readFileSync(appJsPath, 'utf8');
      
      appJs = appJs.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      const appScriptPattern = new RegExp(
        `<script[^>]*src="[^"]*\\/_next\\/static\\/js\\/${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*></script>`,
        'g'
      );
      
      if (appScriptPattern.test(html)) {
        html = html.replace(appScriptPattern, `<script>${appJs}</script>`);
        appJsCount++;
      }
    }
  });
  
  if (appJsCount > 0) {
    console.log(`✅ Inlined ${appJsCount} application JS files`);
  }
}

const buildManifestPath = path.join(outDir, '_next/static/buildManifest.js');
if (fs.existsSync(buildManifestPath)) {
  const buildManifest = fs.readFileSync(buildManifestPath, 'utf8');
  const buildScriptPattern = /<script[^>]*src="[^"]*\/_next\/static\/buildManifest\.js[^"]*"[^>]*><\/script>/g;
  if (buildScriptPattern.test(html)) {
    html = html.replace(buildScriptPattern, `<script>${buildManifest}</script>`);
    console.log('✅ Inlined buildManifest.js');
  }
}

const ssgManifestPath = path.join(outDir, '_next/static/ssgManifest.js');
if (fs.existsSync(ssgManifestPath)) {
  const ssgManifest = fs.readFileSync(ssgManifestPath, 'utf8');
  const ssgScriptPattern = /<script[^>]*src="[^"]*\/_next\/static\/ssgManifest\.js[^"]*"[^>]*><\/script>/g;
  if (ssgScriptPattern.test(html)) {
    html = html.replace(ssgScriptPattern, `<script>${ssgManifest}</script>`);
    console.log('✅ Inlined ssgManifest.js');
  }
}')}[^"]*"[^>]*></script>`, 'g');
      if (pattern.test(html)) {
        html = html.replace(pattern, `<script>${js}</script>`);
        console.log(`✅ Inlined ${filename}`);
      }
    }
  });
}

console.log('🧹 Comprehensive cleanup of external references...');
// More aggressive cleanup with multiple passes
const cleanupPatterns = [
  /\/_next\/[^"'\s>]*/g,
  /_next\/[^"'\s>]*/g,
  /<link[^>]*href="[^"]*_next[^"]*"[^>]*>/g,
  /<script[^>]*src="[^"]*_next[^"]*"[^>]*><\/script>/g,
  /<link[^>]*href=""[^>]*>/g,
  /<link[^>]*href="\s*"[^>]*>/g,
  /<script[^>]*src=""[^>]*><\/script>/g,
  /<script[^>]*src="\s*"[^>]*><\/script>/g,
  /<link[^>]*rel="preload"[^>]*>/g,
  /<link[^>]*rel="modulepreload"[^>]*>/g,
  /<link[^>]*rel="prefetch"[^>]*>/g
];

cleanupPatterns.forEach(pattern => {
  html = html.replace(pattern, '');
});

// Remove empty lines created by cleanup
html = html.replace(/\n\s*\n/g, '\n');

console.log('🔧 Adding debugging and React mounting scripts...');
const debugScript = `
<script>
console.log('🚀 Palletizer app initializing...');

// Error handling
window.addEventListener('error', function(e) {
  console.error('❌ Runtime error:', e.error);
  console.error('Location:', e.filename + ':' + e.lineno + ':' + e.colno);
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('❌ Unhandled promise rejection:', e.reason);
});

// Check for React and root element
if (typeof React !== 'undefined') {
  console.log('✅ React loaded successfully');
} else {
  console.warn('⚠️ React not found in global scope');
}

// Ensure root element exists
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
  
  // Trigger React if needed
  setTimeout(function() {
    if (rootElement.children.length === 0) {
      console.warn('⚠️ Root element is empty - React may not have mounted');
    } else {
      console.log('✅ React app appears to be mounted');
    }
  }, 1000);
});

console.log('📋 Environment check complete');
</script>
`;

html = html.replace('</head>', debugScript + '</head>');

console.log('📏 Minifying HTML...');
html = html
  .replace(/>\s+</g, '><')
  .replace(/\s{2,}/g, ' ')
  .replace(/<!--.*?-->/g, '')
  .trim();

console.log('💾 Writing output file...');
fs.writeFileSync(outputPath, html, 'utf8');

const stats = fs.statSync(outputPath);
const fileSizeKB = (stats.size / 1024).toFixed(2);
const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log('');
console.log('🎉 Build completed successfully!');
console.log('📁 Output file:', outputPath);
console.log(`📊 File size: ${fileSizeKB} KB (${fileSizeMB} MB)`);

if (stats.size > 1024 * 1024) {
  console.log('⚠️  Warning: File size > 1MB may be too large for some ESP32 configurations');
} else if (stats.size > 512 * 1024) {
  console.log('💡 Note: File size > 512KB - ensure ESP32 has sufficient flash space');
} else {
  console.log('✅ File size is optimal for ESP32 deployment');
}

console.log('🔧 Ensuring root element exists...');
if (!html.includes('<div id="root">')) {
  console.log('⚠️  Adding missing root element for React mounting');
  
  const bodyRegex = /<body[^>]*>/;
  if (bodyRegex.test(html)) {
    html = html.replace(bodyRegex, (match) => {
      return match + '<div id="root"></div>';
    });
  } else {
    html = html.replace('</body>', '<div id="root"></div></body>');
  }
}

console.log('');
console.log('🔍 Validation checks:');
const hasRootElement = html.includes('<div id="root">') || html.includes('<div id="root"/>');
const hasReactRefs = html.includes('React') || html.includes('react');
const hasExternalRefs = html.includes('_next');
const hasCSSInlined = html.includes('<style>');

// Better JS detection - check for inlined scripts without src attributes
const scriptTags = html.match(/<script[^>]*>/g) || [];
const inlineScripts = scriptTags.filter(tag => !tag.includes('src=')).length;
const externalScripts = scriptTags.filter(tag => tag.includes('src=')).length;
const hasJSInlined = inlineScripts > 0;

console.log(`Root element: ${hasRootElement ? '✅' : '❌'}`);
console.log(`React references: ${hasReactRefs ? '✅' : '❌'}`);
console.log(`External _next refs: ${hasExternalRefs ? '❌ Found' : '✅ Clean'}`);
console.log(`CSS inlined: ${hasCSSInlined ? '✅' : '❌'}`);
console.log(`JS inlined: ${hasJSInlined ? '✅' : '❌'} (${inlineScripts} inline, ${externalScripts} external)`);

// Log details for debugging
if (externalScripts > 0) {
  console.log('🔍 External scripts found:');
  scriptTags.filter(tag => tag.includes('src=')).forEach(tag => {
    console.log(`   ${tag}`);
  });
}

if (!hasJSInlined) {
  console.log('⚠️  No inline JavaScript detected - this may cause issues');
}
console.log('🧪 Testing instructions:');
console.log('1. Test locally with HTTP server:');
console.log('   cd out && npx http-server -p 8080');
console.log('   Then open: http://localhost:8080/palletizer.html');
console.log('');
console.log('2. Deploy to ESP32:');
console.log('   - Upload palletizer.html to ESP32 LittleFS');
console.log('   - Rename to index.html on ESP32');
console.log('   - Access via ESP32 IP address');
console.log('');
console.log('🚀 Ready for deployment!');