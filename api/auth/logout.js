import { deleteSession } from '../_utils/session-store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clear session
  const match = (req.headers.cookie || '').match(/session_id=([^;]+)/);
  if (match) deleteSession(match[1]);

  res.setHeader('Set-Cookie', [
    'session_id=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/'
  ]);

  res.redirect('/login');
} 