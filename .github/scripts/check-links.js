const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const REQUEST_TIMEOUT = 10000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkUrl(url, retries = 0) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const options = {
      method: 'HEAD',
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkChecker/1.0)'
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
      req.destroy();
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
        console.log(`Checking ${site.name}: ${site.url}`);
        const result = await checkUrl(site.url);

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

        await sleep(500);
      }
    }
  }

  return brokenLinks;
}

async function main() {
  const brokenLinks = [];

  const mainLinksPath = path.join(process.cwd(), 'public/links.json');
  if (fs.existsSync(mainLinksPath)) {
    const links = await checkLinksInFile(mainLinksPath, 'GLOBAL');
    brokenLinks.push(...links);
  }

  const regionLinksDir = path.join(process.cwd(), 'public/Region-Links');
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
    process.exit(1);
  } else {
    console.log('\n✅ All links are working!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
