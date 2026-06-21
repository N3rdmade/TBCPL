#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const LINK_FILES = [
  path.join(PUBLIC_DIR, 'links.json'),
  ...fs.readdirSync(path.join(PUBLIC_DIR, 'Region-Links'))
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(PUBLIC_DIR, 'Region-Links', f))
];

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');

function resolveLogo(logoPath) {
  const normalized = logoPath.replace(/^\.\//, '').replace(/^\//, '');
  return path.resolve(PUBLIC_DIR, normalized);
}

function collectReferencedLogos(skipDisabled = true) {
  const referenced = new Set();
  for (const file of LINK_FILES) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const category of data.categories || []) {
      for (const site of category.sites || []) {
        if (skipDisabled && site.enabled === false) continue;
        if (!site.logo) continue;
        referenced.add(resolveLogo(site.logo));
      }
    }
  }
  return referenced;
}

function main() {
  const stillReferenced = collectReferencedLogos(true);

  let totalRemovedSites = 0;
  const logosToDelete = new Set();
  const fileChanges = [];

  for (const file of LINK_FILES) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    let removedHere = 0;

    for (const category of data.categories || []) {
      const before = category.sites.length;
      const kept = [];
      for (const site of category.sites) {
        if (site.enabled === false) {
          if (site.logo) {
            const logoPath = resolveLogo(site.logo);
            if (!stillReferenced.has(logoPath)) {
              logosToDelete.add(logoPath);
            }
          }
          removedHere++;
        } else {
          kept.push(site);
        }
      }
      category.sites = kept;
      if (category.sites.length !== before) {
        // category modified
      }
    }

    if (removedHere > 0) {
      fileChanges.push({ file, removedHere, data });
      totalRemovedSites += removedHere;
    }
  }

  console.log(`Disabled site entries to remove: ${totalRemovedSites}`);
  console.log(`Logo files to delete: ${logosToDelete.size}`);
  console.log(`JSON files to update: ${fileChanges.length}\n`);

  for (const { file, removedHere } of fileChanges) {
    console.log(`  ${path.relative(ROOT, file)} — ${removedHere} entry/entries removed`);
  }
  console.log('');
  for (const logo of logosToDelete) {
    console.log(`  ${path.relative(ROOT, logo)}`);
  }

  if (totalRemovedSites === 0 && logosToDelete.size === 0) {
    console.log('\nNothing to remove.');
    return;
  }

  if (DRY_RUN) {
    console.log(`\nDry run. Re-run with --apply to perform deletions.`);
    return;
  }

  for (const { file, data } of fileChanges) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
    console.log(`Updated: ${path.relative(ROOT, file)}`);
  }

  for (const logo of logosToDelete) {
    if (fs.existsSync(logo)) {
      fs.unlinkSync(logo);
      console.log(`Deleted: ${path.relative(ROOT, logo)}`);
    }
  }

  console.log(`\nRemoved ${totalRemovedSites} entry/entries and ${logosToDelete.size} logo file(s).`);
}

main();
