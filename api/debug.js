import EmailService from './_utils/email-service.js';
import { getTokensFromCookies, isAuthenticated } from './_utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const debug = {
    timestamp: new Date().toISOString(),
    environment: {
      hasGmailClientId: !!process.env.GMAIL_CLIENT_ID,
      hasGmailClientSecret: !!process.env.GMAIL_CLIENT_SECRET,
      hasGmailRedirectUri: !!process.env.GMAIL_REDIRECT_URI
    },
    cookies: {
      raw: req.headers.cookie || 'No cookies',
      hasAuthCookie: (req.headers.cookie || '').includes('authenticated=true'),
      hasTokensCookie: (req.headers.cookie || '').includes('gmail_tokens=')
    },
    authentication: {
      isAuthenticated: isAuthenticated(req),
      tokens: null
    }
  };

  // Try to get tokens
  try {
    const tokens = getTokensFromCookies(req.headers.cookie);
    debug.authentication.tokens = tokens ? {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenType: tokens.token_type,
      expiryDate: tokens.expiry_date
    } : null;
  } catch (error) {
    debug.authentication.tokensError = error.message;
  }

  // If authenticated, try to create email service
  if (debug.authentication.isAuthenticated && debug.authentication.tokens) {
    try {
      const emailService = new EmailService();
      const tokens = getTokensFromCookies(req.headers.cookie);
      await emailService.authenticateGmail(tokens);
      debug.emailService = {
        authenticated: emailService.isAuthenticated(),
        status: 'success'
      };
    } catch (error) {
      debug.emailService = {
        authenticated: false,
        status: 'error',
        error: error.message
      };
    }
  }

  res.json(debug);
} 