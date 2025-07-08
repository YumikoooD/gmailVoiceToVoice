import EmailService from '../_utils/email-service.js';
import { getTokensFromCookies, isAuthenticated } from '../_utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const tokens = getTokensFromCookies(req.headers.cookie);
    if (!tokens) {
      return res.status(401).json({ error: 'No valid tokens found' });
    }

    const { to, cc, subject, body, replyToId } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }

    const emailService = new EmailService();
    await emailService.authenticateGmail(tokens);
    
    const result = await emailService.sendEmail(to, subject, body, replyToId, cc);
    res.json(result);
  } catch (error) {
    console.error("Send email error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
} 