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

  const originalBroken = JSON.parse(fs.readFileSync('broken-links.json', 'utf8'));

  if (originalBroken.length === 0) {
    console.log('No broken links to report');
    process.exit(0);
  }

  const fixed = fs.existsSync('link-updates.json')
    ? JSON.parse(fs.readFileSync('link-updates.json', 'utf8'))
    : [];
  const fixedKeySet = new Set(fixed.map(u => `${u.file}|${u.oldUrl}`));

  const unresolved = originalBroken.filter(
    l => !fixedKeySet.has(`${l.file}|${l.url}`)
  );

  const groupedByFile = unresolved.reduce((acc, link) => {
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

  const MAX_FIELDS = 25;
  const MAX_EMBED_CHARS = 5500;
  const COLOR = 15158332;

  function linkToField(link) {
    const name = link.name.length > 256 ? link.name.substring(0, 253) + '...' : link.name;
    let value = `**URL:** ${link.url}\n**Category:** ${link.category}\n**Status:** ${link.status}`;
    if (link.error) {
      value += `\n**Error:** ${link.error.substring(0, 100)}`;
    }
    if (value.length > 1024) {
      value = value.substring(0, 1021) + '...';
    }
    return { name, value, inline: false };
  }

  const embeds = [];

  if (fixed.length > 0) {
    const bySource = fixed.reduce((acc, u) => {
      (acc[u.source] = acc[u.source] || []).push(u);
      return acc;
    }, {});
    const summaryLines = Object.entries(bySource)
      .map(([src, items]) => `**${src}:** ${items.length}`)
      .join(' · ');
    const sampleFields = fixed.slice(0, 10).map(u => ({
      name: (u.name || 'unknown').substring(0, 256),
      value: `~~${u.oldUrl}~~\n→ ${u.newUrl}\n*via ${u.source}* · \`${u.file}\``.substring(0, 1024),
      inline: false,
    }));
    embeds.push({
      title: `✅ Auto-fixed ${fixed.length} link(s)`,
      description: `${summaryLines}${fixed.length > 10 ? `\n_Showing first 10 of ${fixed.length}._` : ''}`,
      color: 3066993,
      fields: sampleFields,
      timestamp: new Date().toISOString(),
    });
  }

  for (const group of Object.values(groupedByFile)) {
    const fields = group.links.map(linkToField);
    const title = `🔴 Broken Links in ${group.region}`.substring(0, 256);
    const baseDescription = `**File:** \`${group.file}\`\n**Total broken:** ${group.links.length}`;

    const chunks = [];
    let current = [];
    let currentChars = title.length + baseDescription.length + 40;

    for (const field of fields) {
      const fieldChars = field.name.length + field.value.length;
      if (current.length >= MAX_FIELDS || currentChars + fieldChars > MAX_EMBED_CHARS) {
        chunks.push(current);
        current = [];
        currentChars = title.length + baseDescription.length + 40;
      }
      current.push(field);
      currentChars += fieldChars;
    }
    if (current.length > 0) chunks.push(current);

    chunks.forEach((chunkFields, idx) => {
      const partLabel = chunks.length > 1 ? ` (part ${idx + 1}/${chunks.length})` : '';
      const description = baseDescription + partLabel;
      embeds.push({
        title: (title + partLabel).substring(0, 256),
        description: description.length > 4096 ? description.substring(0, 4093) + '...' : description,
        color: COLOR,
        fields: chunkFields,
        timestamp: new Date().toISOString()
      });
    });
  }

  const mentions = '<@1141729666160402565> <@321029953200324610>';
  const summary = [
    `Found **${originalBroken.length}** broken link(s).`,
    fixed.length > 0 ? `Auto-fixed **${fixed.length}** ✅` : null,
    unresolved.length > 0 ? `**${unresolved.length}** still need attention ⚠️` : 'All resolved 🎉',
  ].filter(Boolean).join(' · ');
  const content = `${mentions}\n⚠️ **Link Checker Alert**\n${summary}`;

  function embedSize(e) {
    let s = (e.title || '').length + (e.description || '').length;
    for (const f of e.fields || []) s += f.name.length + f.value.length;
    return s;
  }

  const MAX_EMBEDS_PER_MSG = 10;
  const MAX_MSG_CHARS = 5800;
  const messages = [];
  let batch = [];
  let batchChars = 0;
  for (const embed of embeds) {
    const size = embedSize(embed);
    if (batch.length >= MAX_EMBEDS_PER_MSG || batchChars + size > MAX_MSG_CHARS) {
      messages.push(batch);
      batch = [];
      batchChars = 0;
    }
    batch.push(embed);
    batchChars += size;
  }
  if (batch.length > 0) messages.push(batch);
  if (messages.length === 0) messages.push([]);

  for (let i = 0; i < messages.length; i++) {
    const payload = { embeds: messages[i] };
    if (i === 0) payload.content = content;
    await sendDiscordMessage(JSON.stringify(payload), null);
    if (i + 1 < messages.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`Sent Discord notification: ${originalBroken.length} broken, ${fixed.length} fixed, ${unresolved.length} unresolved`);
}

main().catch(err => {
  console.error('Error sending Discord notification:', err);
  process.exit(1);
});
