export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const hasClientId = !!process.env.GMAIL_CLIENT_ID && !process.env.GMAIL_CLIENT_ID.includes('your-');
  const hasClientSecret = !!process.env.GMAIL_CLIENT_SECRET && !process.env.GMAIL_CLIENT_SECRET.includes('your-');
  
  res.json({
    configured: hasClientId && hasClientSecret,
    clientId: hasClientId ? 'configured' : 'missing or placeholder',
    clientSecret: hasClientSecret ? 'configured' : 'missing or placeholder',
    redirectUri: process.env.GMAIL_REDIRECT_URI
  });
} 