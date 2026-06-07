const fs = require('fs');
const https = require('https');

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

function sendDiscordMessage(content, embeds) {
  return new Promise((resolve, reject) => {
    const webhookUrl = new URL(DISCORD_WEBHOOK);

    const payload = JSON.stringify({
      content: content,
      embeds: embeds
    });

    const options = {
      hostname: webhookUrl.hostname,
      path: webhookUrl.pathname + webhookUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 204) {
        resolve();
      } else {
        reject(new Error(`Discord webhook failed with status ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  if (!DISCORD_WEBHOOK) {
    console.error('DISCORD_WEBHOOK environment variable is not set');
    process.exit(1);
  }

  if (!fs.existsSync('broken-links.json')) {
    console.log('No broken links file found');
    process.exit(0);
  }

  const brokenLinks = JSON.parse(fs.readFileSync('broken-links.json', 'utf8'));

  if (brokenLinks.length === 0) {
    console.log('No broken links to report');
    process.exit(0);
  }

  const groupedByFile = brokenLinks.reduce((acc, link) => {
    const key = `${link.region}|${link.file}`;
    if (!acc[key]) {
      acc[key] = {
        region: link.region,
        file: link.file,
        links: []
      };
    }
    acc[key].links.push(link);
    return acc;
  }, {});

  const embeds = Object.values(groupedByFile).map(group => {
    const fields = group.links.slice(0, 25).map(link => ({
      name: link.name,
      value: `**URL:** ${link.url}\n**Category:** ${link.category}\n**Status:** ${link.status}${link.error ? `\n**Error:** ${link.error}` : ''}`,
      inline: false
    }));

    return {
      title: `🔴 Broken Links in ${group.region}`,
      description: `**File:** \`${group.file}\`\n**Total broken:** ${group.links.length}`,
      color: 15158332,
      fields: fields,
      timestamp: new Date().toISOString()
    };
  });

  const mentions = '<@1141729666160402565> <@321029953200324610>';
  const content = `${mentions}\n\n⚠️ **Link Checker Alert**\nFound ${brokenLinks.length} broken link(s) that need to be replaced.`;

  for (let i = 0; i < embeds.length; i += 10) {
    const batch = embeds.slice(i, i + 10);
    await sendDiscordMessage(i === 0 ? content : '', batch);

    if (i + 10 < embeds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`Sent Discord notification for ${brokenLinks.length} broken link(s)`);
}

main().catch(err => {
  console.error('Error sending Discord notification:', err);
  process.exit(1);
});
