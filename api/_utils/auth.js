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