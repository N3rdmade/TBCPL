const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const REQUEST_TIMEOUT = 10000;

const SKIP_HOSTS = new Set([
  'auth.hulu.com',
  'hulu.com',
  'www.hulu.com'
]);

const SKIP_URLS = new Set([
  'https://auth.hulu.com/web/login/',
  'https://www.zee5.com/global',
  'https://www.yupptv.com/channels'
]);

function isWhitelisted(url) {
  if (SKIP_URLS.has(url)) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SKIP_HOSTS.has(host);
  } catch {
    return false;
  }
}

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

async function checkUrl(url, retries = 0) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    const origin = `${urlObj.protocol}//${urlObj.host}`;

    const options = {
      method: 'HEAD',
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Origin': origin,
        'Referer': origin + '/'
      }
    };

    const req = protocol.request(url, options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve({ success: true, status: res.statusCode });
      } else if (res.statusCode === 404 || res.statusCode >= 500) {
        if (retries < MAX_RETRIES) {
          console.log(`Retry ${retries + 1}/${MAX_RETRIES} for ${url}`);
          setTimeout(async () => {
            const result = await checkUrl(url, retries + 1);
            resolve(result);
          }, RETRY_DELAY);
        } else {
          resolve({ success: false, status: res.statusCode });
        }
      } else {
        resolve({ success: true, status: res.statusCode });
      }
    });

    req.on('error', async (err) => {
      if (retries < MAX_RETRIES) {
        console.log(`Retry ${retries + 1}/${MAX_RETRIES} for ${url} (error: ${err.message})`);
        await sleep(RETRY_DELAY);
        const result = await checkUrl(url, retries + 1);
        resolve(result);
      } else {
        resolve({ success: false, error: err.message });
      }
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });

    req.end();
  });
}

async function checkLinksInFile(filePath, region) {
  console.log(`Checking links in ${filePath}...`);

  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  const brokenLinks = [];

  for (const category of data.categories) {
    for (const site of category.sites) {
      if (site.enabled !== false && site.url) {
        if (isWhitelisted(site.url)) {
          console.log(`⏭️  SKIP (whitelisted): ${site.name} - ${site.url}`);
          continue;
        }

        let result;

        if (urlCache.has(site.url)) {
          console.log(`[CACHED] ${site.name}: ${site.url}`);
          result = urlCache.get(site.url);
        } else {
          console.log(`Checking ${site.name}: ${site.url}`);
          result = await checkUrl(site.url);
          urlCache.set(site.url, result);
          await sleep(500);
        }

        if (!result.success) {
          brokenLinks.push({
            name: site.name,
            url: site.url,
            category: category.name,
            status: result.status || 'timeout/error',
            error: result.error,
            region: region,
            file: filePath
          });
          console.log(`❌ BROKEN: ${site.name} - ${site.url} (${result.status || result.error})`);
        } else {
          console.log(`✅ OK: ${site.name} (${result.status})`);
        }
      }
    }
  }

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
  const avgTimePerLink = 10.5;
  const estimatedMinutes = Math.ceil((unique * avgTimePerLink) / 60);
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
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
