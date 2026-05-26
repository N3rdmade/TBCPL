function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function opt(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  MONGODB_URI: () => req("MONGODB_URI"),
  DB_NAME: () => opt("DB_NAME", "TBCPL"),
  GITHUB_CLIENT_ID: () => req("github_oauth_client_id"),
  GITHUB_CLIENT_SECRET: () => req("github_oauth_client_secret"),
  ENCRYPTION_KEY: () => req("encryption_key"),
  REPO_OWNER: () => opt("GITHUB_REPO_OWNER", "N3rdmade"),
  REPO_NAME: () => opt("GITHUB_REPO_NAME", "TBCPL"),
  REPO_BRANCH: () => opt("GITHUB_REPO_BRANCH", "main"),
  SITE_URL: () => opt("SITE_URL", "http://localhost:3000"),
};
