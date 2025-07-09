import EmailService from '../../_utils/email-service.js';
import { requireAuth } from '../../_utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = requireAuth(req, res);
  if (!session) return;
  const { tokens } = session;

  try {
    const { id } = req.query;
    const { isRead } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Email ID is required' });
    }

    const emailService = new EmailService();
    await emailService.authenticateGmail(tokens);
    
    const result = await emailService.markEmailAsRead(id, isRead);
    res.json(result);
  } catch (error) {
    console.error("Mark email read error:", error);
    res.status(500).json({ error: "Failed to mark email as read" });
  }
} 