export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = req.headers.cookie || '';
  const authenticated = cookies.includes('authenticated=true');
  const hasTokens = cookies.includes('gmail_tokens=');
  let userProfile = null;
  const profileMatch = cookies.match(/user_profile=([^;]+)/);
  if (profileMatch) {
    try {
      userProfile = JSON.parse(decodeURIComponent(profileMatch[1]));
    } catch (err) {
      console.error('Failed parsing user_profile cookie:', err);
    }
  }

  res.json({
    authenticated,
    tokens: hasTokens ? 'present' : 'absent',
    userProfile
  });
} 