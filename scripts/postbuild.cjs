const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function buildHtml() {
  const distClient = path.join(__dirname, '../dist/client');
  const targetHtml = path.join(distClient, 'index.html');
  const serverEntry = path.join(__dirname, '../dist/server/index.mjs');

  let html = '';

  // Method 1: SSR fetch from dist/server/index.mjs
  if (fs.existsSync(serverEntry)) {
    try {
      console.log('Rendering static HTML using dist/server/index.mjs...');
      const server = await import(serverEntry);
      const res = await server.default.fetch(
        new Request('http://localhost/'),
        { ASSETS: { fetch: () => new Response(null, { status: 404 }) } },
        { waitUntil: () => {} }
      );
      if (res && res.status === 200) {
        html = await res.text();
        console.log('Successfully SSR rendered index.html (' + html.length + ' bytes)');
      }
    } catch (e) {
      console.warn('SSR fetch failed, falling back to template reconstruction:', e.message);
    }
  }

  // Method 2: Template reconstruction fallback
  if (!html) {
    console.log('Using template reconstruction fallback...');
    const assetsDir = path.join(distClient, 'assets');
    const files = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
    
    // Pick the largest index-*.js as main entry
    const indexFiles = files.filter(f => f.startsWith('index-') && f.endsWith('.js'));
    indexFiles.sort((a, b) => {
      const sa = fs.statSync(path.join(assetsDir, a)).size;
      const sb = fs.statSync(path.join(assetsDir, b)).size;
      return sb - sa;
    });
    const mainJs = indexFiles[0] || 'index.js';
    const stylesCss = files.find(f => f.startsWith('styles-') && f.endsWith('.css')) || 'styles.css';
    const routesJs = files.find(f => f.startsWith('routes-') && f.endsWith('.js')) || 'routes.js';
    const utilsJs = files.find(f => f.startsWith('utils-') && f.endsWith('.js')) || 'utils.js';

    console.log('Selected mainJs:', mainJs, 'stylesCss:', stylesCss);

    const templatePath = path.join(__dirname, '../android/app/src/main/assets/public/index.html');
    let template = '';
    if (fs.existsSync(templatePath)) {
      template = fs.readFileSync(templatePath, 'utf8');
    } else {
      template = '<!DOCTYPE html><html lang="bn" data-theme="midnight"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/><title>Noor Habit</title></head><body><div class="min-h-dvh"></div></body></html>';
    }

    html = template
      .replace(/styles-[A-Za-z0-9_-]+\.css/g, stylesCss)
      .replace(/index-[A-Za-z0-9_-]+\.js/g, mainJs)
      .replace(/routes-[A-Za-z0-9_-]+\.js/g, routesJs)
      .replace(/utils-[A-Za-z0-9_-]+\.js/g, utilsJs);
  }

  fs.writeFileSync(targetHtml, html, 'utf8');
  console.log('Wrote', targetHtml);

  // Sync to android assets
  const androidPublic = path.join(__dirname, '../android/app/src/main/assets/public');
  if (fs.existsSync(androidPublic)) {
    console.log('Copying client assets to Android public assets...');
    fs.cpSync(distClient, androidPublic, { recursive: true });

    // Ensure compatibility aliases in android assets
    const androidAssets = path.join(androidPublic, 'assets');
    if (fs.existsSync(androidAssets)) {
      const aFiles = fs.readdirSync(androidAssets);
      const curMain = aFiles
        .filter(f => f.startsWith('index-') && f.endsWith('.js'))
        .sort((a, b) => fs.statSync(path.join(androidAssets, b)).size - fs.statSync(path.join(androidAssets, a)).size)[0];
      if (curMain) {
        const mainBytes = fs.readFileSync(path.join(androidAssets, curMain));
        ['index-Dni0F4bb.js', 'index-Ulgq0ZCB.js'].forEach(alias => {
          fs.writeFileSync(path.join(androidAssets, alias), mainBytes);
        });
      }
    }
  }

  console.log('Postbuild finished successfully.');
}

buildHtml().catch(err => {
  console.error('Postbuild fatal error:', err);
  process.exit(1);
});
