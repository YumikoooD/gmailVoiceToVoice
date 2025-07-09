import EmailService from '../_utils/email-service.js';
import { requireAuth } from '../_utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = requireAuth(req, res);
  if (!session) return;
  const { tokens } = session;

  try {
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