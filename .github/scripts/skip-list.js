const SKIP_HOSTS = new Set([
  'auth.hulu.com',
  'hulu.com',
  'www.hulu.com',
]);

const SKIP_URLS = new Set([
  'https://auth.hulu.com/web/login/',
  'https://www.zee5.com/global',
  'https://www.yupptv.com/channels',
  'https://goplay.su',
  'https://inkapelis.cyou',
  'https://www.anivault.co',
  'https://tbcpl.lol/site-request.html',
  'https://tv.eddit.me/',
  'https://cokcok10.com/'
]);

function normalize(url) {
  return (url || '').trim().replace(/\/+$/, '').toLowerCase();
}

const NORMALIZED_SKIP_URLS = new Set([...SKIP_URLS].map(normalize));

function isWhitelisted(url) {
  if (SKIP_URLS.has(url)) return true;
  if (NORMALIZED_SKIP_URLS.has(normalize(url))) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SKIP_HOSTS.has(host);
  } catch {
    return false;
  }
}

module.exports = { SKIP_HOSTS, SKIP_URLS, isWhitelisted };
