const fs = require('fs');
const path = require('path');
const https = require('https');

const MAX_RETRIES = 2;
const RETRY_DELAY = 1500;
const REQUEST_TIMEOUT = 8000;
const CONCURRENCY = 10;
const MAX_REDIRECTS = 5;

const { isWhitelisted } = require('./skip-list');

// Disable TLS verification for reachability checks on third-party sites
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const urlCache = new Map();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function sendDiscordNotification(content, embeds) {
  const webhookUrl = process.env.DISCORD_WEBHOOK;
  if (!webhookUrl) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const payload = JSON.stringify({ content, embeds });

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 204 || res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Discord webhook failed with status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function countTotalLinks(filePaths) {
  let total = 0;
  let uniqueUrls = new Set();

  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      for (const category of data.categories) {
        for (const site of category.sites) {
          if (site.enabled !== false && site.url && !isWhitelisted(site.url)) {
            uniqueUrls.add(site.url);
            total++;
          }
        }
      }
    }
  }

  return { total, unique: uniqueUrls.size };
}

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

async function singleRequest(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
      headers: browserHeaders(url),
    });
    return { status: res.status, location: res.headers.get('location') || null };
  } catch (err) {
    return { error: err.code || err.name || err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(url, retries = 0) {
  let current = url;
  let lastStatus = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await singleRequest(current);
    if (res.error) {
      if (retries < MAX_RETRIES) {
        await sleep(RETRY_DELAY);
        return checkUrl(url, retries + 1);
      }
      return { success: false, error: res.error };
    }
    lastStatus = res.status;
    if (res.status >= 300 && res.status < 400 && res.location) {
      let next;
      try { next = new URL(res.location, current).toString(); } catch { break; }
      try {
        const origHost = new URL(url).host.toLowerCase().replace(/^www\./, '');
        const nextHost = new URL(next).host.toLowerCase().replace(/^www\./, '');
        if (origHost !== nextHost) {
          return { success: false, status: res.status, redirectTo: next, reason: 'cross-domain-redirect' };
        }
      } catch {}
      current = next;
      continue;
    }
    if (res.status >= 200 && res.status < 400) {
      return { success: true, status: res.status };
    }
    if (res.status === 404 || res.status >= 500) {
      if (retries < MAX_RETRIES) {
        await sleep(RETRY_DELAY);
        return checkUrl(url, retries + 1);
      }
      return { success: false, status: res.status };
    }
    return { success: true, status: res.status };
  }
  return { success: false, status: lastStatus, error: 'too many redirects' };
}

async function checkLinksInFile(filePath, region) {
  console.log(`Checking links in ${filePath}...`);

  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  const brokenLinks = [];

  const tasks = [];
  for (const category of data.categories) {
    for (const site of category.sites) {
      if (site.enabled === false || !site.url) continue;
      if (isWhitelisted(site.url)) continue;
      tasks.push({ site, category });
    }
  }

  let cursor = 0;
  let done = 0;
  const total = tasks.length;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= total) return;
      const { site, category } = tasks[i];
      let result;
      if (urlCache.has(site.url)) {
        result = urlCache.get(site.url);
      } else {
        result = await checkUrl(site.url);
        urlCache.set(site.url, result);
      }
      done++;
      if (!result.success) {
        brokenLinks.push({
          name: site.name,
          url: site.url,
          category: category.name,
          status: result.status || 'timeout/error',
          error: result.error,
          redirectTo: result.redirectTo,
          reason: result.reason,
          region: region,
          file: filePath
        });
        const detail = result.redirectTo ? `→ ${result.redirectTo} (${result.reason})` : (result.status || result.error);
        console.log(`❌ ${done}/${total} ${site.name} - ${site.url} (${detail})`);
      } else {
        console.log(`✅ ${done}/${total} ${site.name} (${result.status})`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return brokenLinks;
}

async function main() {
  const brokenLinks = [];

  const mainLinksPath = path.join(process.cwd(), 'public/links.json');
  const regionLinksDir = path.join(process.cwd(), 'public/Region-Links');

  const allFiles = [];
  if (fs.existsSync(mainLinksPath)) {
    allFiles.push(mainLinksPath);
  }
  if (fs.existsSync(regionLinksDir)) {
    const regionFiles = fs.readdirSync(regionLinksDir)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(regionLinksDir, f));
    allFiles.push(...regionFiles);
  }

  const { total, unique } = countTotalLinks(allFiles);
  const avgTimePerLink = 2.5;
  const estimatedMinutes = Math.max(1, Math.ceil((unique * avgTimePerLink) / CONCURRENCY / 60));
  const startTime = new Date();
  const estimatedEnd = new Date(startTime.getTime() + estimatedMinutes * 60000);

  console.log(`Starting link check: ${total} total links (${unique} unique)`);
  console.log(`Estimated time: ${estimatedMinutes} minutes`);

  await sendDiscordNotification(
    '🔍 **Link Checker Started**',
    [{
      title: 'Link Validation In Progress',
      description: `Checking all links across the platform...`,
      color: 3447003,
      fields: [
        { name: 'Total Links', value: `${total}`, inline: true },
        { name: 'Unique URLs', value: `${unique}`, inline: true },
        { name: 'Estimated Time', value: `~${estimatedMinutes} min`, inline: true },
        { name: 'Started At', value: `<t:${Math.floor(startTime.getTime() / 1000)}:F>`, inline: false },
        { name: 'Expected Completion', value: `<t:${Math.floor(estimatedEnd.getTime() / 1000)}:R>`, inline: false }
      ],
      timestamp: startTime.toISOString()
    }]
  ).catch(err => console.error('Failed to send start notification:', err));

  if (fs.existsSync(mainLinksPath)) {
    const links = await checkLinksInFile(mainLinksPath, 'GLOBAL');
    brokenLinks.push(...links);
  }

  if (fs.existsSync(regionLinksDir)) {
    const files = fs.readdirSync(regionLinksDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const region = file.replace('links.', '').replace('.json', '');
      const filePath = path.join(regionLinksDir, file);
      const links = await checkLinksInFile(filePath, region);
      brokenLinks.push(...links);
    }
  }

  if (brokenLinks.length > 0) {
    fs.writeFileSync('broken-links.json', JSON.stringify(brokenLinks, null, 2));
    console.log(`\n❌ Found ${brokenLinks.length} broken link(s)`);
  } else {
    console.log('\n✅ All links are working!');
    const endTime = new Date();
    const durationMin = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    await sendDiscordNotification(
      '✅ **Link Checker Completed**',
      [{
        title: 'No Dead Links Found',
        description: 'All links checked successfully. Everything is working.',
        color: 3066993,
        fields: [
          { name: 'Total Links', value: `${total}`, inline: true },
          { name: 'Unique URLs', value: `${unique}`, inline: true },
          { name: 'Duration', value: `~${durationMin} min`, inline: true },
          { name: 'Finished At', value: `<t:${Math.floor(endTime.getTime() / 1000)}:F>`, inline: false }
        ],
        timestamp: endTime.toISOString()
      }]
    ).catch(err => console.error('Failed to send completion notification:', err));
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
