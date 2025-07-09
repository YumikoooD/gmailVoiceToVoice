import { google } from 'googleapis';
import EmailService from '../_utils/email-service.js';
import { generateUserProfile } from '../_utils/user-profile.js';
import { createSession } from '../_utils/session-store.js';

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

    // ===== Auto-generate user profile =====
    let userProfile = null;
    try {
      const emailService = new EmailService();
      await emailService.authenticateGmail(tokens);
      const sentEmails = await emailService.getSentEmails(1000);
      ({ userProfile } = await generateUserProfile(sentEmails));
    } catch (profileErr) {
      console.error('Failed to generate user profile:', profileErr);
    }

    // -------- Create user session --------
    const sessionId = createSession({ tokens, userProfile });
    res.setHeader('Set-Cookie', [
      `session_id=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/`
    ]);

    res.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/login?error=auth_failed');
  }
} 