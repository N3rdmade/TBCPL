#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const LOGO_DIR = path.join(PUBLIC_DIR, 'logo');
const LINK_FILES = [
  path.join(PUBLIC_DIR, 'links.json'),
  ...fs.readdirSync(path.join(PUBLIC_DIR, 'Region-Links'))
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(PUBLIC_DIR, 'Region-Links', f))
];

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');

function collectReferencedLogos() {
  const referenced = new Set();
  for (const file of LINK_FILES) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const category of data.categories || []) {
      for (const site of category.sites || []) {
        if (!site.logo) continue;
        const normalized = site.logo.replace(/^\.\//, '').replace(/^\//, '');
        referenced.add(path.resolve(PUBLIC_DIR, normalized));
      }
    }
  }
  return referenced;
}

function walkLogos(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkLogos(full));
    else out.push(full);
  }
  return out;
}

function main() {
  const referenced = collectReferencedLogos();
  const allLogos = walkLogos(LOGO_DIR);

  const orphans = allLogos.filter(f => !referenced.has(f));

  console.log(`Logo files on disk: ${allLogos.length}`);
  console.log(`Referenced in JSON: ${referenced.size}`);
  console.log(`Orphans: ${orphans.length}\n`);

  if (orphans.length === 0) {
    console.log('Nothing to remove.');
    return;
  }

  for (const orphan of orphans) {
    const rel = path.relative(ROOT, orphan);
    if (DRY_RUN) {
      console.log(`[DRY] would remove: ${rel}`);
    } else {
      fs.unlinkSync(orphan);
      console.log(`Removed: ${rel}`);
    }
  }

  if (DRY_RUN) {
    console.log(`\nDry run. Re-run with --apply to delete ${orphans.length} file(s).`);
  } else {
    console.log(`\nDeleted ${orphans.length} orphan file(s).`);
  }
}

main();
