import EmailService from '../_utils/email-service.js';
import { getTokensFromCookies, isAuthenticated } from '../_utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    const emailService = new EmailService();
    await emailService.authenticateGmail(tokens);
    
    const limit = parseInt(req.query.limit) || 20;
    const emails = await emailService.getInboxEmails(limit);
    const summary = emailService.generateEmailSummary(emails);
    
    res.json({ emails, summary });
  } catch (error) {
    console.error("Get emails error:", error);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
} 