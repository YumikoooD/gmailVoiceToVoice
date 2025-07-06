import express from "express";
import fs from "fs";
import session from "express-session";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
dotenv.config({ path: './config.env' });
import EmailService from "./server/email-service.js";
import { google } from "googleapis";

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;
const emailService = new EmailService();

// Middleware
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// OAuth2 client setup
const isProduction = process.env.NODE_ENV === 'production';
const redirectUri = isProduction ? 
  process.env.GMAIL_REDIRECT_URI : 
  `http://localhost:${port}/api/auth/callback`;

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  redirectUri
);

// Generate OAuth2 URL
const getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify'
    ]
  });
};

// Configure Vite middleware for React client
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Auth routes
app.get("/api/auth/login", (req, res) => {
  const authUrl = getAuthUrl();
  res.redirect(authUrl);
});

app.get("/api/auth/callback", async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in session
    req.session.tokens = tokens;
    req.session.authenticated = true;
    
    // Authenticate the email service
    oauth2Client.setCredentials(tokens);
    await emailService.authenticateGmail(tokens);
    
    // Redirect to home page
    res.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/login?error=auth_failed');
  }
});

app.get("/api/auth/logout", (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get("/api/auth/status", (req, res) => {
  res.json({
    authenticated: !!req.session.authenticated,
    tokens: req.session.tokens ? 'present' : 'absent'
  });
});

app.get("/api/auth/config-test", (req, res) => {
  const hasClientId = !!process.env.GMAIL_CLIENT_ID && !process.env.GMAIL_CLIENT_ID.includes('your-');
  const hasClientSecret = !!process.env.GMAIL_CLIENT_SECRET && !process.env.GMAIL_CLIENT_SECRET.includes('your-');
  
  res.json({
    configured: hasClientId && hasClientSecret,
    clientId: hasClientId ? 'configured' : 'missing or placeholder',
    clientSecret: hasClientSecret ? 'configured' : 'missing or placeholder',
    redirectUri: redirectUri
  });
});

// API route for token generation
app.get("/api/token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-realtime-preview-2024-12-17",
          voice: "verse",
        }),
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Email API routes (protected)
app.get("/api/emails", requireAuth, async (req, res) => {
  try {
    // Re-authenticate with current session tokens
    if (!emailService.isAuthenticated()) {
      oauth2Client.setCredentials(req.session.tokens);
      await emailService.authenticateGmail(req.session.tokens);
    }
    
    const limit = parseInt(req.query.limit) || 20;
    const emails = await emailService.getInboxEmails(limit);
    const summary = emailService.generateEmailSummary(emails);
    res.json({ emails, summary });
  } catch (error) {
    console.error("Get emails error:", error);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

app.get("/api/emails/:id", requireAuth, async (req, res) => {
  try {
    // Re-authenticate with current session tokens
    if (!emailService.isAuthenticated()) {
      oauth2Client.setCredentials(req.session.tokens);
      await emailService.authenticateGmail(req.session.tokens);
    }
    
    const { id } = req.params;
    const email = await emailService.getEmailDetails(id);
    res.json(email);
  } catch (error) {
    console.error("Get email details error:", error);
    res.status(500).json({ error: "Failed to fetch email details" });
  }
});

app.post("/api/emails/send", requireAuth, async (req, res) => {
  try {
    // Re-authenticate with current session tokens
    if (!emailService.isAuthenticated()) {
      oauth2Client.setCredentials(req.session.tokens);
      await emailService.authenticateGmail(req.session.tokens);
    }
    
    const { to, subject, body, replyToId } = req.body;
    const result = await emailService.sendEmail(to, subject, body, replyToId);
    res.json(result);
  } catch (error) {
    console.error("Send email error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

app.patch("/api/emails/:id/read", requireAuth, async (req, res) => {
  try {
    // Re-authenticate with current session tokens
    if (!emailService.isAuthenticated()) {
      oauth2Client.setCredentials(req.session.tokens);
      await emailService.authenticateGmail(req.session.tokens);
    }
    
    const { id } = req.params;
    const { isRead } = req.body;
    const result = await emailService.markEmailAsRead(id, isRead);
    res.json(result);
  } catch (error) {
    console.error("Mark email read error:", error);
    res.status(500).json({ error: "Failed to mark email as read" });
  }
});

app.delete("/api/emails/:id", requireAuth, async (req, res) => {
  try {
    // Re-authenticate with current session tokens
    if (!emailService.isAuthenticated()) {
      oauth2Client.setCredentials(req.session.tokens);
      await emailService.authenticateGmail(req.session.tokens);
    }
    
    const { id } = req.params;
    const result = await emailService.deleteEmail(id);
    res.json(result);
  } catch (error) {
    console.error("Delete email error:", error);
    res.status(500).json({ error: "Failed to delete email" });
  }
});

// Render the React client
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  try {
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf-8"),
    );
    
    // Simplified SSR - just return empty html for now to avoid router SSR issues
    const html = template.replace(`<!--ssr-outlet-->`, '');
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite.ssrFixStacktrace(e);
    next(e);
  }
});

app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
});
