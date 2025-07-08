export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.query;

  // Handle config-test request
  if (action === 'config-test') {
    const hasClientId = !!process.env.GMAIL_CLIENT_ID && !process.env.GMAIL_CLIENT_ID.includes('your-');
    const hasClientSecret = !!process.env.GMAIL_CLIENT_SECRET && !process.env.GMAIL_CLIENT_SECRET.includes('your-');
    
    return res.json({
      configured: hasClientId && hasClientSecret,
      clientId: hasClientId ? 'configured' : 'missing or placeholder',
      clientSecret: hasClientSecret ? 'configured' : 'missing or placeholder',
      redirectUri: process.env.GMAIL_REDIRECT_URI
    });
  }

  // Handle status request (default)
  // Parse cookies for session info
  const cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        cookies[key] = value;
      }
    });
  }

  const authenticated = !!cookies.authenticated && !!cookies.gmail_tokens;

  res.json({
    authenticated,
    tokens: cookies.gmail_tokens ? 'present' : 'absent'
  });
} 