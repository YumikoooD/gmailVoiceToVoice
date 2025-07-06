export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clear cookies
  res.setHeader('Set-Cookie', [
    'gmail_tokens=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/',
    'authenticated=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
  ]);

  res.redirect('/login');
} 