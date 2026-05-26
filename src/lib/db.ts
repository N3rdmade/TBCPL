import "server-only";
import { MongoClient, type Db } from "mongodb";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __tbcpl_mongo: { client: MongoClient | null; promise: Promise<MongoClient> | null } | undefined;
}

const g = globalThis as typeof globalThis & {
  __tbcpl_mongo?: { client: MongoClient | null; promise: Promise<MongoClient> | null };
};

if (!g.__tbcpl_mongo) g.__tbcpl_mongo = { client: null, promise: null };

async function getClient(): Promise<MongoClient> {
  const store = g.__tbcpl_mongo!;
  if (store.client) return store.client;
  if (!store.promise) {
    const uri = env.MONGODB_URI();
    store.promise = new MongoClient(uri, {
      serverSelectionTimeoutMS: 6000,
    }).connect();
  }
  store.client = await store.promise;
  return store.client;
}

export async function db(): Promise<Db> {
  const client = await getClient();
  return client.db(env.DB_NAME());
}

export const COLLECTIONS = {
  sessions: "sessions",
  admins: "admins",
  auditLog: "auditLog",
  siteRequests: "siteRequests",
  cache: "cache",
} as const;

export async function ensureIndexes() {
  const d = await db();
  await Promise.all([
    d.collection(COLLECTIONS.sessions).createIndex({ sid: 1 }, { unique: true }),
    d.collection(COLLECTIONS.sessions).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    d.collection(COLLECTIONS.admins).createIndex({ githubLogin: 1 }, { unique: true }),
    d.collection(COLLECTIONS.siteRequests).createIndex({ submittedAt: -1 }),
    d.collection(COLLECTIONS.siteRequests).createIndex({ status: 1, submittedAt: -1 }),
    d.collection(COLLECTIONS.auditLog).createIndex({ at: -1 }),
    d.collection(COLLECTIONS.cache).createIndex({ key: 1 }, { unique: true }),
  ]);
}
