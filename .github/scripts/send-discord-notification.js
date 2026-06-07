const fs = require('fs');
const https = require('https');

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

function sendDiscordMessage(payload, _unused) {
  return new Promise((resolve, reject) => {
    const webhookUrl = new URL(DISCORD_WEBHOOK);

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
    const shown = group.links.slice(0, 25);
    const overflow = group.links.length - shown.length;
    const fields = shown.map(link => {
      const name = link.name.length > 256 ? link.name.substring(0, 253) + '...' : link.name;
      let value = `**URL:** ${link.url}\n**Category:** ${link.category}\n**Status:** ${link.status}`;
      if (link.error) {
        value += `\n**Error:** ${link.error.substring(0, 100)}`;
      }
      if (value.length > 1024) {
        value = value.substring(0, 1021) + '...';
      }
      return { name, value, inline: false };
    });

    let description = `**File:** \`${group.file}\`\n**Total broken:** ${group.links.length}`;
    if (overflow > 0) {
      description += `\n*…and ${overflow} more not shown (Discord 25-field limit). See \`broken-links.json\` artifact.*`;
    }

    return {
      title: `🔴 Broken Links in ${group.region}`.substring(0, 256),
      description: description.length > 4096 ? description.substring(0, 4093) + '...' : description,
      color: 15158332,
      fields: fields,
      timestamp: new Date().toISOString()
    };
  });

  const totalShown = embeds.reduce((sum, e) => sum + e.fields.length, 0);
  const totalOverflow = brokenLinks.length - totalShown;

  const mentions = '<@1141729666160402565> <@321029953200324610>';
  let content = `${mentions}\n⚠️ **Link Checker Alert**\nFound ${brokenLinks.length} broken link(s) that need to be replaced.`;
  if (totalOverflow > 0) {
    content += `\n*Note: ${totalOverflow} link(s) omitted from this report due to Discord limits — check the workflow artifact for full list.*`;
  }

  for (let i = 0; i < embeds.length; i += 10) {
    const batch = embeds.slice(i, i + 10);
    const messageContent = i === 0 ? content : null;
    const payload = {};

    if (messageContent) {
      payload.content = messageContent;
    }
    if (batch.length > 0) {
      payload.embeds = batch;
    }

    await sendDiscordMessage(JSON.stringify(payload), null);

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
