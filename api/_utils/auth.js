// Helper function to extract tokens from cookies
export function getTokensFromCookies(cookies) {
  const cookieStr = cookies || '';
  const tokenMatch = cookieStr.match(/gmail_tokens=([^;]+)/);
  
  if (!tokenMatch) {
    console.error('No gmail_tokens cookie found');
    return null;
  }
  
  try {
    const decodedTokens = decodeURIComponent(tokenMatch[1]);
    const tokens = JSON.parse(decodedTokens);
    
    // Validate that tokens have required fields
    if (!tokens.access_token) {
      console.error('Invalid tokens: missing access_token');
      return null;
    }
    
    return tokens;
  } catch (error) {
    console.error('Error parsing tokens from cookies:', error);
    return null;
  }
}

import { getSession } from './session-store.js';

// New: extract session data from cookie
export function getSessionData(req) {
  const cookieStr = req.headers.cookie || '';
  const match = cookieStr.match(/session_id=([^;]+)/);
  if (!match) return null;
  const sessionId = match[1];
  return getSession(sessionId);
}

// Updated authentication check – succeeds when a valid session exists
export function isAuthenticated(req) {
  return Boolean(getSessionData(req));
}

// Require auth and return session data instead of calling next()
export function requireAuth(req, res) {
  const session = getSessionData(req);
  if (!session) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  return session;
} 