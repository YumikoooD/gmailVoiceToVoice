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

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Email ID is required' });
    }

    const emailService = new EmailService();
    await emailService.authenticateGmail(tokens);
    
    const email = await emailService.getEmailDetails(id);
    res.json(email);
  } catch (error) {
    console.error("Get email details error:", error);
    res.status(500).json({ error: "Failed to fetch email details" });
  }
} 