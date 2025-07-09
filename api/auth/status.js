import { getSessionData } from '../_utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSessionData(req);
  const authenticated = Boolean(session);

  res.json({
    authenticated,
    tokens: authenticated ? 'present' : 'absent',
    userProfile: session?.userProfile || null
  });
} 