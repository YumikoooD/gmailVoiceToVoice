// Helper function to extract tokens from cookies
export function getTokensFromCookies(cookies) {
  const cookieStr = cookies || '';
  const tokenMatch = cookieStr.match(/gmail_tokens=([^;]+)/);
  
  if (!tokenMatch) return null;
  
  try {
    return JSON.parse(decodeURIComponent(tokenMatch[1]));
  } catch (error) {
    return null;
  }
}

// Helper function to check if user is authenticated
export function isAuthenticated(req) {
  const cookies = req.headers.cookie || '';
  return cookies.includes('authenticated=true');
}

// Middleware-like function for auth check
export function requireAuth(req, res, next) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
} 