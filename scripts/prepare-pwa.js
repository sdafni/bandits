const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const publicDir = path.join(__dirname, '..', 'public');
const assetsDir = path.join(__dirname, '..', 'assets/images');

// Copy manifest.json to dist
const manifestSrc = path.join(publicDir, 'manifest.json');
const manifestDest = path.join(distDir, 'manifest.json');

if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, manifestDest);
  console.log('✅ Copied manifest.json to dist/');
} else {
  console.error('❌ manifest.json not found in public/');
}

// Copy app icon as PWA icons
const iconSrc = path.join(assetsDir, 'bandiTourMAinLogo.png');

if (fs.existsSync(iconSrc)) {
  // For now, just copy the icon as both sizes
  // In production, you should resize these properly
  const icon192 = path.join(distDir, 'icon-192.png');
  const icon512 = path.join(distDir, 'icon-512.png');

  fs.copyFileSync(iconSrc, icon192);
  fs.copyFileSync(iconSrc, icon512);

  console.log('✅ Copied app icons to dist/');
  console.log('   - icon-192.png');
  console.log('   - icon-512.png');
} else {
  console.error('❌ App icon not found at:', iconSrc);
}

// Inject manifest link into HTML files
const manifestLink = '<link rel="manifest" href="/manifest.json" />';
const appleIconLink = '<link rel="apple-touch-icon" href="/icon-192.png" />';
const themeColor = '<meta name="theme-color" content="#ff0000" />';

function injectManifestLinks(htmlPath) {
  if (!fs.existsSync(htmlPath)) {
    return;
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  // Check if already injected
  if (html.includes('rel="manifest"')) {
    console.log(`⏭️  Skipping ${path.basename(htmlPath)} (already has manifest link)`);
    return;
  }

  // Inject before </head> tag
  if (html.includes('</head>')) {
    const injection = `${manifestLink}\n${appleIconLink}\n${themeColor}\n</head>`;
    html = html.replace('</head>', injection);
    fs.writeFileSync(htmlPath, html);
    console.log(`✅ Injected manifest link into ${path.basename(htmlPath)}`);
  } else {
    console.warn(`⚠️  No </head> tag found in ${path.basename(htmlPath)}`);
  }
}

// Find all HTML files
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

console.log('\n🔧 Preparing PWA assets...\n');

const htmlFiles = findHtmlFiles(distDir);

if (htmlFiles.length === 0) {
  console.error('❌ No HTML files found in dist directory');
  process.exit(1);
}

console.log('\n📝 Injecting manifest links into HTML files...\n');
htmlFiles.forEach(injectManifestLinks);

console.log(`\n✨ Done! Processed ${htmlFiles.length} HTML files`);