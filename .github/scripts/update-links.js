const fs = require('fs');
const { isWhitelisted } = require('./skip-list');

const REQUEST_TIMEOUT = 8000;
const PER_LINK_BUDGET = 20000;
const MAX_REDIRECTS = 4;
const MAX_BODY_BYTES = 512 * 1024;
const CONCURRENCY = 8;
const SLEEP_BETWEEN = 50;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const FMHY_DOCS = [
  'https://raw.githubusercontent.com/fmhy/edit/refs/heads/main/docs/video.md',
  'https://raw.githubusercontent.com/fmhy/edit/refs/heads/main/docs/downloading.md',
  'https://raw.githubusercontent.com/fmhy/edit/refs/heads/main/docs/video-tools.md',
  'https://raw.githubusercontent.com/fmhy/edit/refs/heads/main/docs/torrenting.md',
  'https://raw.githubusercontent.com/fmhy/edit/refs/heads/main/docs/reading.md',
  'https://raw.githubusercontent.com/fmhy/edit/refs/heads/main/docs/mobile.md',
  'https://raw.githubusercontent.com/fmhy/edit/refs/heads/main/docs/non-english.md',
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function browserHeaders(url) {
  let referer = '';
  try { const u = new URL(url); referer = `${u.protocol}//${u.host}/`; } catch {}
  return {
    'user-agent': UA,
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'max-age=0',
    'upgrade-insecure-requests': '1',
    'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    ...(referer ? { 'referer': referer } : {}),
  };
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

// Hosts that indicate a parked/dead/redirected-elsewhere domain — never accept as replacement
const REDIRECT_BLOCKLIST_SUFFIXES = [
  'google.com', 'google.co', 'bing.com', 'yahoo.com', 'duckduckgo.com',
  'godaddy.com', 'sedo.com', 'sedoparking.com', 'parkingcrew.net',
  'hugedomains.com', 'undeveloped.com', 'dan.com', 'afternic.com',
  'namecheap.com', 'porkbun.com', 'cloudflare.com',
  'facebook.com', 'instagram.com', 'tiktok.com',
  'youtube.com', 'twitter.com', 'x.com',
  'archive.org', 'web.archive.org',
  'github.com', 'github.io',
  ...JUNK_HOST_SUFFIXES,
];

function isBlockedRedirectTarget(url) {
  try {
    const h = new URL(url).host.toLowerCase().replace(/^www\./, '');
    return REDIRECT_BLOCKLIST_SUFFIXES.some(s => h === s || h.endsWith('.' + s));
  } catch {
    return true;
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function rootDomain(host) {
  const h = host.toLowerCase().replace(/^www\./, '');
  const parts = h.split('.');
  if (parts.length <= 2) return h;
  return parts.slice(-2).join('.');
}
function domainLabel(host) {
  const h = host.toLowerCase().replace(/^www\./, '');
  return h.split('.')[0] || h;
}
function isJunkHost(host) {
  const h = host.toLowerCase();
  if (h.includes('fmhy')) return true;
  return JUNK_HOST_SUFFIXES.some(s => h === s || h.endsWith('.' + s));
}
function siteRoot(u) {
  try { const x = new URL(u); return `${x.protocol}//${x.host}/`; } catch { return null; }
}
function nameSlug(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function sameHost(a, b) {
  try {
    return new URL(a).host.toLowerCase().replace(/^www\./, '')
        === new URL(b).host.toLowerCase().replace(/^www\./, '');
  } catch { return false; }
}

// Single-shot HTTP request with a hard timeout that ACTUALLY aborts.
async function hit(url, { method = 'HEAD', timeout = REQUEST_TIMEOUT, wantBody = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeout);
  try {
    const res = await fetch(url, {
      method,
      redirect: 'manual',
      signal: controller.signal,
      headers: browserHeaders(url),
    });
    const status = res.status;
    const location = res.headers.get('location') || null;

    let body = '';
    if (wantBody) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > MAX_BODY_BYTES) { controller.abort('size-cap'); break; }
        body += decoder.decode(value, { stream: true });
      }
    } else {
      try { res.body && res.body.cancel(); } catch {}
    }
    return { ok: true, status, location, body };
  } catch (err) {
    return { ok: false, error: err.code || err.name || err.message };
  } finally {
    clearTimeout(timer);
  }
}

// Follow redirects manually, capped, with budget.
async function resolveFinal(url, budget) {
  let current = url;
  let lastStatus = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (budget.expired()) return { ok: false, error: 'budget' };
    const res = await hit(current, { method: 'HEAD', timeout: Math.min(REQUEST_TIMEOUT, budget.left()) });
    if (!res.ok) return res;
    lastStatus = res.status;
    if (res.status >= 300 && res.status < 400 && res.location) {
      let next;
      try { next = new URL(res.location, current).toString(); } catch { return { ok: false, error: 'bad-location' }; }
      current = next;
      continue;
    }
    return { ok: true, status: res.status, finalUrl: current };
  }
  return { ok: false, status: lastStatus, error: 'too-many-redirects' };
}

async function isAlive(url, budget) {
  const r = await resolveFinal(url, budget);
  if (!r.ok) return false;
  return r.status >= 200 && r.status < 400;
}

// ─── FMHY index ──────────────────────────────────────────────────────────
let fmhyIndexPromise = null;

async function buildFmhyIndex() {
  const idx = { byLabel: new Map(), byNameSlug: new Map(), count: 0 };
  console.log(`📚 fetching ${FMHY_DOCS.length} FMHY docs in parallel…`);
  const docs = await Promise.all(FMHY_DOCS.map(async (u) => {
    const r = await hit(u, { method: 'GET', timeout: 15000, wantBody: true });
    if (!r.ok || !r.body) {
      console.log(`   ⚠️  failed: ${u} (${r.error || r.status})`);
      return '';
    }
    console.log(`   ✓ ${u} (${r.body.length} bytes)`);
    return r.body;
  }));

  const linkRe = /\[([^\]]{1,120})\]\((https?:\/\/[^)\s]+)\)/g;
  for (const md of docs) {
    if (!md) continue;
    for (const line of md.split('\n')) {
      const localRe = new RegExp(linkRe.source, 'g');
      let m, primary = null;
      while ((m = localRe.exec(line)) !== null) {
        const text = m[1].trim();
        const link = m[2].trim();
        let u;
        try { u = new URL(link); } catch { continue; }
        const host = u.host.toLowerCase();
        if (isJunkHost(host)) continue;
        if (/^\d+$/.test(text) || /^(mirror|backup|alt)$/i.test(text)) continue;
        primary = { name: text, url: siteRoot(link), host, label: domainLabel(host) };
        break;
      }
      if (!primary) continue;
      idx.count++;
      if (!idx.byLabel.has(primary.label)) idx.byLabel.set(primary.label, []);
      idx.byLabel.get(primary.label).push(primary);
      const slug = nameSlug(primary.name);
      if (slug.length >= 3) {
        if (!idx.byNameSlug.has(slug)) idx.byNameSlug.set(slug, []);
        idx.byNameSlug.get(slug).push(primary);
      }
    }
  }
  console.log(`📚 FMHY index built: ${idx.count} primary entries\n`);
  return idx;
}

function getFmhyIndex() {
  if (!fmhyIndexPromise) fmhyIndexPromise = buildFmhyIndex();
  return fmhyIndexPromise;
}

async function findFmhyReplacement(link, budget) {
  const idx = await getFmhyIndex();
  const candidates = new Set();
  let host = null, label = null;
  try { host = new URL(link.url).host.toLowerCase(); label = domainLabel(host); } catch {}
  if (label && idx.byLabel.has(label)) {
    for (const c of idx.byLabel.get(label)) if (c.host !== host) candidates.add(c.url);
  }
  const slug = nameSlug(link.name);
  if (slug.length >= 3 && idx.byNameSlug.has(slug)) {
    for (const c of idx.byNameSlug.get(slug)) candidates.add(c.url);
  }
  for (const cand of candidates) {
    if (!cand || cand === link.url) continue;
    if (budget.expired()) return null;
    if (await isAlive(cand, budget)) return cand;
  }
  return null;
}

// ─── per-link work ───────────────────────────────────────────────────────
function makeBudget(ms) {
  const start = Date.now();
  return {
    left: () => Math.max(0, ms - (Date.now() - start)),
    expired: () => Date.now() - start >= ms,
  };
}

async function processLink(link) {
  const tag = `[${link.name}]`;
  if (isWhitelisted(link.url)) {
    return { result: 'skip', reason: 'whitelisted' };
  }
  const budget = makeBudget(PER_LINK_BUDGET);
  const t0 = Date.now();

  // 1. pre-detected redirect from check-links.js
  if (link.redirectTo) {
    const c = siteRoot(link.redirectTo);
    if (c && !sameHost(c, link.url) && !isBlockedRedirectTarget(c) && await isAlive(c, budget)) {
      return { result: 'fix', source: 'redirect-pre', replacement: c, ms: Date.now() - t0 };
    }
  }

  // 2. fresh redirect-follow
  if (!budget.expired()) {
    const r = await resolveFinal(link.url, budget);
    if (r.ok && r.finalUrl && !sameHost(r.finalUrl, link.url)) {
      const root = siteRoot(r.finalUrl);
      if (root && !isBlockedRedirectTarget(root) && await isAlive(root, budget)) {
        return { result: 'fix', source: 'redirect', replacement: root, ms: Date.now() - t0 };
      }
    }
  }

  // 3. FMHY scrape
  if (!budget.expired()) {
    const fmhy = await findFmhyReplacement(link, budget);
    if (fmhy) {
      return { result: 'fix', source: 'fmhy', replacement: fmhy, ms: Date.now() - t0 };
    }
  }

  return { result: 'unresolved', ms: Date.now() - t0, reason: budget.expired() ? 'budget' : 'no-match' };
}

function replaceUrlInFile(filePath, oldUrl, newUrl) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  let replaced = false;
  for (const category of data.categories) {
    for (const site of category.sites) {
      if (site.url === oldUrl) { site.url = newUrl; replaced = true; }
    }
  }
  if (replaced) fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  return replaced;
}

// ─── main ────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync('broken-links.json')) {
    console.log('No broken-links.json. Nothing to update.');
    process.exit(0);
  }
  const broken = JSON.parse(fs.readFileSync('broken-links.json', 'utf8'));
  if (!broken.length) {
    console.log('broken-links.json empty.');
    process.exit(0);
  }

  console.log(`🔧 Processing ${broken.length} broken link(s) with concurrency=${CONCURRENCY}\n`);
  // Kick off FMHY load in parallel with first link work
  getFmhyIndex();

  const results = new Array(broken.length);
  let cursor = 0, doneCount = 0;
  const runStart = Date.now();

  async function worker(id) {
    while (true) {
      const i = cursor++;
      if (i >= broken.length) return;
      const link = broken[i];
      const slot = `(${i + 1}/${broken.length})`;
      console.log(`${slot} w${id} → ${link.name}  ${link.url}`);
      try {
        results[i] = await processLink(link);
      } catch (e) {
        results[i] = { result: 'unresolved', reason: `crash: ${e.message}` };
      }
      doneCount++;
      const r = results[i];
      if (r.result === 'fix') {
        console.log(`${slot} ✅ ${r.source} ${r.ms}ms → ${r.replacement}`);
      } else if (r.result === 'skip') {
        console.log(`${slot} ⏭️  ${r.reason}`);
      } else {
        console.log(`${slot} ⚠️  ${r.reason} ${r.ms || 0}ms`);
      }
      await sleep(SLEEP_BETWEEN);
    }
  }

  const progress = setInterval(() => {
    const elapsed = Math.round((Date.now() - runStart) / 1000);
    console.log(`⏱  progress: ${doneCount}/${broken.length}  elapsed ${elapsed}s`);
  }, 10000);

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));
  clearInterval(progress);

  const updates = [];
  const unresolved = [];
  for (let i = 0; i < broken.length; i++) {
    const r = results[i];
    const link = broken[i];
    if (r && r.result === 'fix') {
      if (replaceUrlInFile(link.file, link.url, r.replacement)) {
        updates.push({
          name: link.name,
          oldUrl: link.url,
          newUrl: r.replacement,
          file: link.file,
          region: link.region,
          category: link.category,
          source: r.source,
        });
      } else {
        unresolved.push(link);
      }
    } else {
      unresolved.push(link);
    }
  }

  if (updates.length) {
    fs.writeFileSync('link-updates.json', JSON.stringify(updates, null, 2));
    console.log(`\n✨ ${updates.length} link(s) updated → link-updates.json`);
  } else {
    console.log('\nNo updates applied.');
  }
  if (unresolved.length) {
    fs.writeFileSync('broken-links-unresolved.json', JSON.stringify(unresolved, null, 2));
    console.log(`📝 ${unresolved.length} unresolved → broken-links-unresolved.json`);
  }
  const totalSec = Math.round((Date.now() - runStart) / 1000);
  console.log(`Done in ${totalSec}s`);
  process.exit(0);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
