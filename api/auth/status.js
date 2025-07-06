export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = req.headers.cookie || '';
  const authenticated = cookies.includes('authenticated=true');
  const hasTokens = cookies.includes('gmail_tokens=');

  res.json({
    authenticated,
    tokens: hasTokens ? 'present' : 'absent'
  });
} 