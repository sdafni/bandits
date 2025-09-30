const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const swScript = fs.readFileSync(path.join(__dirname, '..', 'public', 'register-sw.js'), 'utf8');

// Script tag to inject
const scriptTag = `<script>${swScript}</script>`;

// Function to inject script into HTML file
function injectScript(htmlPath) {
  if (!fs.existsSync(htmlPath)) {
    return;
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  // Check if script is already injected
  if (html.includes('serviceWorker')) {
    console.log(`⏭️  Skipping ${path.basename(htmlPath)} (already has SW registration)`);
    return;
  }

  // Inject before closing </body> tag
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${scriptTag}\n</body>`);
    fs.writeFileSync(htmlPath, html);
    console.log(`✅ Injected SW registration into ${path.basename(htmlPath)}`);
  } else {
    console.warn(`⚠️  No </body> tag found in ${path.basename(htmlPath)}`);
  }
}

// Function to recursively find all HTML files
function findHtmlFiles(dir) {
  const files = fs.readdirSync(dir);
  const htmlFiles = [];

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      htmlFiles.push(...findHtmlFiles(filePath));
    } else if (file.endsWith('.html')) {
      htmlFiles.push(filePath);
    }
  });

  return htmlFiles;
}

// Main execution
console.log('🔧 Injecting Service Worker registration into HTML files...\n');

const htmlFiles = findHtmlFiles(distDir);

if (htmlFiles.length === 0) {
  console.error('❌ No HTML files found in dist directory');
  process.exit(1);
}

htmlFiles.forEach(injectScript);

console.log(`\n✨ Done! Processed ${htmlFiles.length} HTML files`);