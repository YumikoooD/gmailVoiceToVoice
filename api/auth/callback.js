import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect('/login?error=auth_failed');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || `https://${req.headers.host}/api/auth/callback`
    );
    
    const { tokens } = await oauth2Client.getToken(code);
    
    // For Vercel, we need to handle sessions differently
    // Store tokens in a secure cookie or external session store
    res.setHeader('Set-Cookie', [
      `gmail_tokens=${JSON.stringify(tokens)}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`,
      `authenticated=true; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`
    ]);
    
    res.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/login?error=auth_failed');
  }
} 