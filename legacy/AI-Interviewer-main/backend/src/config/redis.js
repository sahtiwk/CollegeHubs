'use strict';

/**
 * redis.js — Redis client singleton (official redis package)
 */

const { createClient } = require('redis');

const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';

class OfficialRedisCompatWrapper {
  constructor(nativeClient) {
    this.native = nativeClient;
  }

  on(event, handler) {
    this.native.on(event, handler);
    return this;
  }

  async get(key) {
    return await this.native.get(key);
  }

  async set(key, value, ...args) {
    if (args[0] === 'EX') {
      const ttl = args[1];
      return await this.native.set(key, value, { EX: ttl });
    }
    return await this.native.set(key, value);
  }

  async del(key) {
    return await this.native.del(key);
  }

  async info(section) {
    return await this.native.info(section);
  }

  async dbsize() {
    return await this.native.dbSize();
  }

  pipeline() {
    const multi = this.native.multi();
    const commands = [];
    
    return {
      sadd: (key, member) => {
        multi.sAdd(key, member);
        commands.push('sadd');
        return this;
      },
      expire: (key, ttl) => {
        multi.expire(key, ttl);
        commands.push('expire');
        return this;
      },
      exec: async () => {
        const results = await multi.exec();
        // ioredis returns array of [err, value]
        return results.map(val => [null, val]);
      }
    };
  }

  async quit() {
    await this.native.quit();
  }
}

let client = null;
let compatClient = null;

if (REDIS_ENABLED) {
  const url = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
  
  client = createClient({
    url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 5) {
          console.warn('[Redis] Max reconnection attempts reached. Disabling connection retries.');
          return false; // Stop retrying
        }
        return Math.min(retries * 500, 2000);
      }
    }
  });

  client.on('error', (err) => console.warn('[Redis] Error:', err.message));
  client.on('connect', () => console.log('[Redis] Connecting...'));
  client.on('ready', () => console.log('[Redis] Redis Connected'));
  client.on('end', () => console.warn('[Redis] Connection closed'));

  compatClient = new OfficialRedisCompatWrapper(client);
} else {
  console.log('[Redis] Disabled via REDIS_ENABLED=false');
}

function getClient() {
  return compatClient;
}

async function connect() {
  if (client) {
    try {
      await client.connect();
    } catch (err) {
      console.error('[Redis] Failed to connect on startup:', err.message);
    }
  }
}

async function disconnect() {
  if (client) {
    await client.quit().catch(() => {});
    client = null;
    compatClient = null;
  }
}

async function clearJobsCache() {
  if (client) {
    try {
      await client.del('jobs:all');
      
      let cursor = 0;
      do {
        const reply = await client.scan(cursor, { MATCH: 'jobs:*', COUNT: 100 });
        cursor = reply.cursor;
        if (reply.keys && reply.keys.length > 0) {
          await client.del(reply.keys);
        }
      } while (cursor !== 0);
      
      console.log('[Redis] Cleared "jobs:all" and all "jobs:*" cache keys');
    } catch (err) {
      console.warn('[Redis] Failed to clear jobs cache keys:', err.message);
    }
  }
}

module.exports = { getClient, connect, disconnect, clearJobsCache };
