const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { isWhitelisted } = require('./skip-list');

const REQUEST_TIMEOUT = 8000;
const PER_LINK_BUDGET = 30000;
const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 256 * 1024;
const SLEEP_BETWEEN = 200;

const FMHY_DOCS = [
  'https://raw.githubusercontent.com/fmhy/edit/refs/heads/main/docs/video.md',
  'https://raw.githubusercontent.com/fmhy/edit/refs/heads/main/docs/downloading.md',
  'https://raw.githubusercontent.com/fmhy/edit/refs/heads/main/docs/video-tools.md',
  'https://raw.githubusercontent.com/fmhy/edit/refs/heads/main/docs/torrenting.md',
  'https://raw.githubusercontent.com/fmhy/edit/refs/heads/main/docs/reading.md',
  'https://raw.githubusercontent.com/fmhy/edit/refs/heads/main/docs/mobile.md',
  'https://raw.githubusercontent.com/fmhy/edit/refs/heads/main/docs/non-english.md',
];

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function rootDomain(host) {
  const h = host.toLowerCase().replace(/^www\./, '');
  const parts = h.split('.');
  if (parts.length <= 2) return h;
  return parts.slice(-2).join('.');
}

function domainLabel(host) {
  const h = host.toLowerCase().replace(/^www\./, '');
  const parts = h.split('.');
  if (parts.length === 0) return h;
  if (parts.length === 1) return parts[0];
  return parts[0];
}

const JUNK_HOST_SUFFIXES = [
  'github.com', 'github.io', 'reddit.com', 'wikipedia.org',
  'discord.gg', 'discord.com', 'discordapp.com',
  't.me', 'telegram.me', 'telegram.org',
  'rentry.co', 'rentry.org', 'pastebin.com',
  'twitter.com', 'x.com', 'youtube.com', 'youtu.be',
  'patreon.com', 'ko-fi.com', 'buymeacoffee.com',
  'archive.org', 'web.archive.org',
];

function isJunkHost(host) {
  const h = host.toLowerCase();
  if (h.includes('fmhy')) return true;
  return JUNK_HOST_SUFFIXES.some(suffix => h === suffix || h.endsWith('.' + suffix));
}

function siteRoot(u) {
  try {
    const url = new URL(u);
    return `${url.protocol}//${url.host}/`;
  } catch {
    return null;
  }
}

function nameSlug(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fetchRaw(url, { method = 'HEAD', redirectsLeft = MAX_REDIRECTS, wantBody = false, hardTimeout = REQUEST_TIMEOUT } = {}) {
  return new Promise((resolve) => {
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (e) {
      return resolve({ error: `bad url: ${e.message}` });
    }
    const protocol = urlObj.protocol === 'https:' ? https : http;
    const origin = `${urlObj.protocol}//${urlObj.host}`;

    const options = {
      method,
      timeout: hardTimeout,
      headers: {
        ...BROWSER_HEADERS,
        'Origin': origin,
        'Referer': origin + '/',
      },
    };

    let settled = false;
    let req;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(killer);
      try { if (req) req.destroy(); } catch {}
      resolve(value);
    };

    const killer = setTimeout(() => settle({ error: `hard timeout ${hardTimeout}ms` }), hardTimeout);

    req = protocol.request(url, options, (res) => {
      const status = res.statusCode;
      const loc = res.headers.location;
      if (status >= 300 && status < 400 && loc) {
        res.resume();
        if (redirectsLeft <= 0) return settle({ status, finalUrl: url, body: '' });
        let nextUrl;
        try { nextUrl = new URL(loc, url).toString(); } catch { return settle({ status, finalUrl: url, body: '' }); }
        clearTimeout(killer);
        try { req.destroy(); } catch {}
        settled = true;
        fetchRaw(nextUrl, { method, redirectsLeft: redirectsLeft - 1, wantBody, hardTimeout }).then(resolve);
        return;
      }

      if (!wantBody) {
        res.resume();
        return settle({ status, finalUrl: url, body: '' });
      }

      const chunks = [];
      let bytes = 0;
      res.on('data', c => {
        bytes += c.length;
        if (bytes > MAX_BODY_BYTES) {
          return settle({ status, finalUrl: url, body: Buffer.concat(chunks).toString('utf8'), truncated: true });
        }
        chunks.push(c);
      });
      res.on('end', () => settle({ status, finalUrl: url, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', err => settle({ error: err.message }));
    });

    req.on('error', err => settle({ error: err.message }));
    req.on('timeout', () => settle({ error: 'socket timeout' }));
    req.end();
  });
}

async function followRedirect(originalUrl) {
  const res = await fetchRaw(originalUrl, { method: 'HEAD' });
  if (res.error) return null;
  if (res.status < 200 || res.status >= 400) return null;
  if (!res.finalUrl) return null;

  try {
    const origHost = new URL(originalUrl).host.toLowerCase();
    const finalHost = new URL(res.finalUrl).host.toLowerCase();
    if (origHost === finalHost) return null;
    return siteRoot(res.finalUrl);
  } catch {
    return null;
  }
}

async function validateCandidate(url) {
  const res = await fetchRaw(url, { method: 'HEAD' });
  if (res.error) return false;
  return res.status >= 200 && res.status < 400;
}

let fmhyIndex = null;

async function loadFmhyIndex() {
  if (fmhyIndex) return fmhyIndex;
  fmhyIndex = { byLabel: new Map(), byNameSlug: new Map(), entries: [] };

  for (const docUrl of FMHY_DOCS) {
    const res = await fetchRaw(docUrl, { method: 'GET', wantBody: true, hardTimeout: 20000 });
    if (res.error || !res.body) {
      console.log(`⚠️  Failed to fetch FMHY doc ${docUrl}`);
      continue;
    }
    const md = res.body;
    const lineRegex = /^[^\n]*$/gm;
    const linkRegex = /\[([^\]]{1,120})\]\((https?:\/\/[^)\s]+)\)/g;

    let lineMatch;
    while ((lineMatch = lineRegex.exec(md)) !== null) {
      const line = lineMatch[0];
      const localRegex = new RegExp(linkRegex.source, 'g');
      let m;
      let primary = null;
      while ((m = localRegex.exec(line)) !== null) {
        const linkText = m[1].trim();
        const link = m[2].trim();
        try {
          const u = new URL(link);
          const host = u.host.toLowerCase();
          if (isJunkHost(host)) continue;
          if (/^\d+$/.test(linkText) || /^(mirror|backup|alt)$/i.test(linkText)) continue;
          primary = { name: linkText, url: siteRoot(link), host, label: domainLabel(host) };
          break;
        } catch {}
      }
      if (!primary) continue;

      fmhyIndex.entries.push(primary);
      if (primary.label) {
        if (!fmhyIndex.byLabel.has(primary.label)) fmhyIndex.byLabel.set(primary.label, []);
        fmhyIndex.byLabel.get(primary.label).push(primary);
      }
      const slug = nameSlug(primary.name);
      if (slug.length >= 3) {
        if (!fmhyIndex.byNameSlug.has(slug)) fmhyIndex.byNameSlug.set(slug, []);
        fmhyIndex.byNameSlug.get(slug).push(primary);
      }
    }
  }
  console.log(`📚 FMHY index built: ${fmhyIndex.entries.length} primary entries`);
  return fmhyIndex;
}

async function findFmhyReplacement(brokenLink, budgetLeft = () => Infinity) {
  const idx = await loadFmhyIndex();
  const ordered = [];
  const seen = new Set();
  const add = (url) => {
    if (!url || url === brokenLink.url || seen.has(url)) return;
    seen.add(url);
    ordered.push(url);
  };

  let brokenHost = null;
  let brokenLabel = null;
  try {
    brokenHost = new URL(brokenLink.url).host.toLowerCase();
    brokenLabel = domainLabel(brokenHost);
  } catch {}

  if (brokenLabel) {
    const byLabel = idx.byLabel.get(brokenLabel);
    if (byLabel) {
      for (const c of byLabel) {
        if (c.host !== brokenHost) add(c.url);
      }
    }
  }

  const slug = nameSlug(brokenLink.name);
  if (slug.length >= 3) {
    const byName = idx.byNameSlug.get(slug);
    if (byName) {
      for (const c of byName) add(c.url);
    }
  }

  for (const candidate of ordered) {
    if (budgetLeft() < 2000) {
      console.log(`   ⏱️  out of budget; stopping FMHY candidates`);
      break;
    }
    console.log(`   🔎 trying FMHY candidate: ${candidate}`);
    const ok = await validateCandidate(candidate);
    await sleep(SLEEP_BETWEEN);
    if (ok) return candidate;
  }
  return null;
}

function replaceUrlInFile(filePath, oldUrl, newUrl) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  let replaced = false;
  for (const category of data.categories) {
    for (const site of category.sites) {
      if (site.url === oldUrl) {
        site.url = newUrl;
        replaced = true;
      }
    }
  }
  if (replaced) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  }
  return replaced;
}

async function main() {
  if (!fs.existsSync('broken-links.json')) {
    console.log('No broken-links.json found. Nothing to update.');
    process.exit(0);
  }

  const broken = JSON.parse(fs.readFileSync('broken-links.json', 'utf8'));
  if (!broken.length) {
    console.log('broken-links.json is empty. Nothing to update.');
    process.exit(0);
  }

  console.log(`🔧 Attempting to fix ${broken.length} broken link(s)...\n`);

  const updates = [];
  const unresolved = [];

  for (const link of broken) {
    console.log(`\n— ${link.name} (${link.url})`);
    if (isWhitelisted(link.url)) {
      console.log(`   ⏭️  skipped (whitelisted)`);
      unresolved.push(link);
      continue;
    }
    let replacement = null;
    let source = null;

    const linkStart = Date.now();
    const budgetLeft = () => PER_LINK_BUDGET - (Date.now() - linkStart);

    if (link.redirectTo) {
      const candidate = siteRoot(link.redirectTo);
      if (candidate && candidate !== link.url) {
        console.log(`   ↪︎  pre-detected redirect → ${candidate}`);
        const ok = await validateCandidate(candidate);
        if (ok) {
          replacement = candidate;
          source = 'redirect';
        }
      }
    }

    if (!replacement && budgetLeft() > 3000) {
      const redirected = await followRedirect(link.url);
      if (redirected && redirected !== link.url) {
        console.log(`   ↪︎  redirect → ${redirected}`);
        const ok = await validateCandidate(redirected);
        if (ok) {
          replacement = redirected;
          source = 'redirect';
        }
      }
    }
    await sleep(SLEEP_BETWEEN);

    if (!replacement && budgetLeft() > 3000) {
      const fromFmhy = await findFmhyReplacement(link, budgetLeft);
      if (fromFmhy) {
        replacement = fromFmhy;
        source = 'fmhy';
      }
    }

    if (budgetLeft() <= 0) {
      console.log(`   ⏱️  per-link budget exhausted (${PER_LINK_BUDGET}ms)`);
    }

    if (replacement && link.file) {
      const ok = replaceUrlInFile(link.file, link.url, replacement);
      if (ok) {
        console.log(`   ✅ ${source}: ${link.url} → ${replacement}`);
        updates.push({
          name: link.name,
          oldUrl: link.url,
          newUrl: replacement,
          file: link.file,
          region: link.region,
          category: link.category,
          source,
        });
      } else {
        unresolved.push(link);
      }
    } else {
      console.log(`   ⚠️  no replacement found`);
      unresolved.push(link);
    }
  }

  if (updates.length) {
    fs.writeFileSync('link-updates.json', JSON.stringify(updates, null, 2));
    console.log(`\n✨ Applied ${updates.length} update(s). See link-updates.json.`);
  } else {
    console.log('\nNo updates applied.');
  }

  if (unresolved.length) {
    fs.writeFileSync('broken-links-unresolved.json', JSON.stringify(unresolved, null, 2));
    console.log(`📝 ${unresolved.length} link(s) still unresolved. See broken-links-unresolved.json.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('update-links failed:', err);
  process.exit(1);
});
