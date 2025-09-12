import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const client = createClient({ url: REDIS_URL });
let connected = false;

async function getRedisClient() {
  if (!connected) {
    await client.connect();
    console.log("✅ Connected to Redis!");
    connected = true;
  }
  return client;
}

export const cacheGet = async (key) => {
  try {
    const c = await getRedisClient();
    const raw = await c.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("❌ Redis GET error:", e);
    return null;
  }
};

export const cacheSet = async (key, value, ttlSeconds = 60) => {
  try {
    const c = await getRedisClient();
    await c.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (e) {
    console.error("❌ Redis SET error:", e);
  }
};

export const cacheDelPattern = async (pattern) => {
  try {
    const c = await getRedisClient();
    const keys = [];
    for await (const k of c.scanIterator({ MATCH: pattern })) keys.push(k);
    if (keys.length) await c.del(keys);
  } catch (e) {
    console.error("❌ Redis DEL pattern error:", e);
  }
};

export default getRedisClient;