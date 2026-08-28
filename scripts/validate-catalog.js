#!/usr/bin/env node
/**
 * TBCPL Catalog Validator
 * Validates JSON structure, site URL formats, duplicate domains, and verifies all referenced local logo assets exist on disk.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const REGIONS_FILE = path.join(PUBLIC_DIR, 'regions.json');
const LINKS_FILE = path.join(PUBLIC_DIR, 'links.json');
const REGION_LINKS_DIR = path.join(PUBLIC_DIR, 'Region-Links');

const VALID_STATUSES = new Set(['ok', 'new', 'down', 'trusted']);

let errorCount = 0;
let warningCount = 0;

function error(file, msg) {
  console.error(`  ❌ [ERROR] ${msg}`);
  errorCount++;
}

function warn(file, msg) {
  console.warn(`  ⚠️  [WARN] ${msg}`);
  warningCount++;
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function resolveLogoPath(logoRef) {
  if (!logoRef) return null;
  const normalized = logoRef.replace(/^\.\//, '').replace(/^\//, '');
  return path.resolve(PUBLIC_DIR, normalized);
}

function validateRegions() {
  console.log('🔍 Validating regions.json...');
  if (!fs.existsSync(REGIONS_FILE)) {
    error(REGIONS_FILE, 'public/regions.json is missing.');
    return;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(REGIONS_FILE, 'utf8'));
  } catch (err) {
    error(REGIONS_FILE, `Invalid JSON syntax in regions.json: ${err.message}`);
    return;
  }

  if (!Array.isArray(data.regions)) {
    error(REGIONS_FILE, 'regions.json must have a "regions" array.');
    return;
  }

  const seenCodes = new Set();
  for (let i = 0; i < data.regions.length; i++) {
    const r = data.regions[i];
    if (!r.code || typeof r.code !== 'string') {
      error(REGIONS_FILE, `Region at index ${i} missing valid "code".`);
    } else {
      const upper = r.code.toUpperCase();
      if (seenCodes.has(upper)) {
        error(REGIONS_FILE, `Duplicate region code: "${upper}"`);
      }
      seenCodes.add(upper);
    }
    if (!r.name || typeof r.name !== 'string') {
      error(REGIONS_FILE, `Region "${r.code || i}" missing valid "name".`);
    }
    if (r.flag === undefined || r.flag === null) {
      error(REGIONS_FILE, `Region "${r.code || i}" missing "flag".`);
    }
  }

  console.log(`  ✓ Checked ${data.regions.length} regions.`);
}

function validateLinkFile(filePath) {
  const relPath = path.relative(ROOT, filePath);
  console.log(`🔍 Validating ${relPath}...`);

  if (!fs.existsSync(filePath)) {
    error(filePath, `File not found: ${relPath}`);
    return { categories: 0, sites: 0 };
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    error(filePath, `Invalid JSON syntax: ${err.message}`);
    return { categories: 0, sites: 0 };
  }

  if (!Array.isArray(data.categories)) {
    error(filePath, 'Root object must contain a "categories" array.');
    return { categories: 0, sites: 0 };
  }

  let totalSites = 0;
  const seenCategoryIds = new Set();

  for (let cIdx = 0; cIdx < data.categories.length; cIdx++) {
    const cat = data.categories[cIdx];
    if (!cat.id || typeof cat.id !== 'string') {
      error(filePath, `Category at index ${cIdx} missing valid "id".`);
      continue;
    }
    if (seenCategoryIds.has(cat.id)) {
      error(filePath, `Duplicate category id "${cat.id}".`);
    }
    seenCategoryIds.add(cat.id);

    if (!cat.name || typeof cat.name !== 'string') {
      error(filePath, `Category "${cat.id}" missing valid "name".`);
    }

    if (!Array.isArray(cat.sites)) {
      error(filePath, `Category "${cat.id}" must contain a "sites" array.`);
      continue;
    }

    const seenUrls = new Set();

    for (let sIdx = 0; sIdx < cat.sites.length; sIdx++) {
      const site = cat.sites[sIdx];
      const siteDesc = `Site #${sIdx + 1} (${site.name || 'unnamed'}) in category "${cat.id}"`;

      if (!site.name || typeof site.name !== 'string' || !site.name.trim()) {
        error(filePath, `${siteDesc}: missing or empty "name".`);
      }

      if (!site.url || typeof site.url !== 'string' || !site.url.trim()) {
        error(filePath, `${siteDesc}: missing or empty "url".`);
      } else {
        if (!isValidUrl(site.url.trim())) {
          error(filePath, `${siteDesc}: invalid URL format "${site.url}".`);
        } else {
          const normUrl = site.url.trim().toLowerCase();
          if (seenUrls.has(normUrl)) {
            warn(filePath, `${siteDesc}: duplicate URL "${site.url}" within category "${cat.id}".`);
          }
          seenUrls.add(normUrl);
        }
      }

      if (site.logo !== undefined && site.logo !== null) {
        if (typeof site.logo !== 'string') {
          error(filePath, `${siteDesc}: "logo" must be a string.`);
        } else {
          const logoTrim = site.logo.trim();
          if (logoTrim.startsWith('http://') || logoTrim.startsWith('https://')) {
            if (!isValidUrl(logoTrim)) {
              error(filePath, `${siteDesc}: invalid remote logo URL "${logoTrim}".`);
            }
          } else if (logoTrim === '' || logoTrim.endsWith('/')) {
            // Placeholder logo allowed for empty/placeholder categories
          } else {
            const resolved = resolveLogoPath(logoTrim);
            if (!fs.existsSync(resolved)) {
              error(filePath, `${siteDesc}: logo file does not exist on disk -> "${site.logo}" (resolved: ${path.relative(ROOT, resolved)})`);
            }
          }
        }
      }

      if (site.status && !VALID_STATUSES.has(site.status)) {
        error(filePath, `${siteDesc}: invalid status "${site.status}". Must be one of: ${Array.from(VALID_STATUSES).join(', ')}.`);
      }

      if (site.enabled !== undefined && typeof site.enabled !== 'boolean') {
        error(filePath, `${siteDesc}: "enabled" must be boolean.`);
      }

      if (site.tags !== undefined && !Array.isArray(site.tags)) {
        error(filePath, `${siteDesc}: "tags" must be an array of strings.`);
      }

      totalSites++;
    }
  }

  console.log(`  ✓ Checked ${data.categories.length} categories and ${totalSites} site entries.`);
  return { categories: data.categories.length, sites: totalSites };
}

function main() {
  console.log('====================================');
  console.log('🚀 TBCPL Catalog & Asset Validation');
  console.log('====================================\n');

  validateRegions();
  console.log('');

  const linkFiles = [LINKS_FILE];
  if (fs.existsSync(REGION_LINKS_DIR)) {
    const regionFiles = fs
      .readdirSync(REGION_LINKS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.join(REGION_LINKS_DIR, f));
    linkFiles.push(...regionFiles);
  }

  let totalCategories = 0;
  let totalSites = 0;

  for (const f of linkFiles) {
    const res = validateLinkFile(f);
    totalCategories += res.categories;
    totalSites += res.sites;
    console.log('');
  }

  console.log('====================================');
  console.log(`📊 Summary: ${linkFiles.length} file(s), ${totalCategories} categories, ${totalSites} sites checked.`);
  console.log(`   Errors: ${errorCount} | Warnings: ${warningCount}`);
  console.log('====================================\n');

  if (errorCount > 0) {
    console.error(`💥 Validation failed with ${errorCount} error(s). Please fix the issues listed above.`);
    process.exit(1);
  }

  console.log('✨ All catalog files and logo assets are valid!\n');
  process.exit(0);
}

main();
