/**
 * Post-build script: copies pre-rendered HTML from .next/server/app/ to out/
 *
 * In Next.js 15.5.x, App Router pages are rendered into .next/server/app/ by
 * the export workers but the step that copies them into the out/ directory does
 * not run. This script replicates that copy so the static export is complete.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(rootDir, '.next/server/app');
const outDir = path.join(rootDir, 'out');

const manifest = JSON.parse(
  await fs.readFile(path.join(rootDir, '.next/prerender-manifest.json'), 'utf8')
);

let copied = 0;
const routes = Object.keys(manifest.routes);

for (const route of routes) {
  if (route === '/_not-found') continue;

  // Determine source: flat HTML file that .next generates
  const normalized = route === '/' ? '/index' : route;
  const srcFile = path.join(srcDir, `${normalized}.html`);

  // Destination: directory-style for trailingSlash:true, root stays flat
  const destFile = normalized === '/index'
    ? path.join(outDir, 'index.html')
    : path.join(outDir, normalized, 'index.html');

  try {
    await fs.mkdir(path.dirname(destFile), { recursive: true });
    await fs.copyFile(srcFile, destFile);
    copied++;
  } catch {
    // Try the directory-style source as fallback
    const srcAlt = path.join(srcDir, normalized, 'index.html');
    try {
      await fs.mkdir(path.dirname(destFile), { recursive: true });
      await fs.copyFile(srcAlt, destFile);
      copied++;
    } catch (e2) {
      console.warn(`  ✗ ${route}: ${e2.message}`);
    }
  }
}

console.log(`✅ Copied ${copied}/${routes.length - 1} HTML pages to out/`);
