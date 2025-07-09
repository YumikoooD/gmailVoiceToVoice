// Simple in-memory session store (development only)
import crypto from 'node:crypto';

// Map<sessionId, any>
const store = new Map();

/**
 * Create a session and return its id.
 * @param {any} data – arbitrary session payload (e.g. { tokens, userProfile })
 * @param {number} ttlSeconds – optional TTL after which session is auto-expired (default 1 day)
 * @returns {string} sessionId
 */
export function createSession(data, ttlSeconds = 60 * 60 * 24) {
  const id = crypto.randomUUID();
  store.set(id, data);

  // Simple TTL cleanup
  setTimeout(() => {
    store.delete(id);
  }, ttlSeconds * 1000).unref?.();

  return id;
}

/** Get session data or null */
export const getSession = (id) => store.get(id) ?? null;

/** Delete a session */
export const deleteSession = (id) => store.delete(id); 