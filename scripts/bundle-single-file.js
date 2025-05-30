const fs = require('fs');
const path = require('path');

// Read the built HTML file
const htmlPath = path.join(__dirname, '../out/index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Read all CSS files and inline them
const cssFiles = fs.readdirSync(path.join(__dirname, '../out/_next/static/css/'));
cssFiles.forEach(file => {
  if (file.endsWith('.css')) {
    const cssPath = path.join(__dirname, '../out/_next/static/css/', file);
    const css = fs.readFileSync(cssPath, 'utf8');
    html = html.replace(`<link rel="stylesheet" href="/_next/static/css/${file}">`, 
      `<style>${css}</style>`);
  }
});

// Read all JS files and inline them
const jsFiles = fs.readdirSync(path.join(__dirname, '../out/_next/static/chunks/'));
jsFiles.forEach(file => {
  if (file.endsWith('.js')) {
    const jsPath = path.join(__dirname, '../out/_next/static/chunks/', file);
    const js = fs.readFileSync(jsPath, 'utf8');
    html = html.replace(`<script src="/_next/static/chunks/${file}"></script>`, 
      `<script>${js}</script>`);
  }
});

// Write the single bundled file
fs.writeFileSync(path.join(__dirname, '../out/palletizer.html'), html);
console.log('✅ Single file created: out/palletizer.html');