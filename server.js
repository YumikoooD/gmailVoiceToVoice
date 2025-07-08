import express from "express";
import fs from "fs";
import session from "express-session";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
dotenv.config({ path: './config.env' });
import EmailService from "./server/email-service.js";
import CalendarService from "./api/_utils/calendar-service.js";
import { google } from "googleapis";

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;
const emailService = new EmailService();
const calendarService = new CalendarService();

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
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/calendar.events',
      'https://mail.google.com/'
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
    console.log('=== OAUTH CALLBACK ===');
    console.log('Query params:', req.query);
    console.log('Session ID before:', req.sessionID);
    
    const { code } = req.query;
    if (!code) {
      console.log('ERROR: No code in callback');
      return res.redirect('/login?error=no_code');
    }
    
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Tokens received:', tokens ? 'YES' : 'NO');
 
     // Store tokens in session
     req.session.tokens = tokens;
     req.session.authenticated = true;

    // Auto-generate user profile from recent sent emails
    try {
      await emailService.authenticateGmail(tokens);
      const sentEmails = await emailService.getSentEmails(300);
      const { generateUserProfile } = await import('./api/_utils/user-profile.js');
      const { userProfile } = generateUserProfile(sentEmails);
      req.session.userProfile = userProfile;
      console.log('User profile generated and stored in session');
    } catch (profileErr) {
      console.error('Failed to generate user profile:', profileErr);
    }
 
     console.log('Session ID after:', req.sessionID);
     console.log('Session data:', req.session);
 
     // Authenticate both services
     oauth2Client.setCredentials(tokens);
    await emailService.authenticateGmail(req.session.tokens);
    await calendarService.authenticateGoogleCalendar(tokens);
    
    console.log('Email and calendar services authenticated');
    console.log('======================');
    
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
  console.log('=== AUTH STATUS CHECK ===');
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Cookies received:', req.headers.cookie);
  console.log('Session tokens present:', !!req.session.tokens);
  console.log('Session authenticated:', req.session.authenticated);
  console.log('========================');
  
  res.json({
    authenticated: !!req.session.authenticated,
    tokens: req.session.tokens ? 'present' : 'absent',
    sessionId: req.sessionID,
    userProfile: req.session.userProfile || null
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
    
    const { to, cc = null, subject, body, replyToId } = req.body;
    const result = await emailService.sendEmail(to, subject, body, replyToId, cc);
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

// MCP API routes (protected)
app.get("/api/mcp/list-tools", requireAuth, async (req, res) => {
  try {
    const tools = [
      {
        name: 'list_emails',
        description: 'REQUIRED: Must be called for ANY email listing request. Gets real emails from user\'s Gmail inbox. Use this when user asks about: recent emails, last emails, unread emails, inbox content, email summaries, or any email listing query. NEVER describe emails without calling this function first.',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: {
              type: 'number',
              description: 'Maximum number of emails to return (default: 20)',
              default: 20
            },
            query: {
              type: 'string',
              description: 'Gmail query syntax for filtering. Examples: "is:unread" (unread emails), "from:example@gmail.com" (from specific sender), "after:2024/01/01" (emails after date), "before:2024/12/31" (emails before date), "newer_than:7d" (last 7 days), "older_than:1m" (older than 1 month), "subject:meeting" (emails with subject containing meeting)'
            }
          }
        }
      },
      {
        name: 'get_email_details',
        description: 'Get detailed content of a specific email',
        inputSchema: {
          type: 'object',
          properties: {
            emailId: {
              type: 'string',
              description: 'Gmail message ID'
            }
          },
          required: ['emailId']
        }
      },
      {
        name: 'send_email',
        description: 'Send a new email',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient email address'
            },
            subject: {
              type: 'string',
              description: 'Email subject'
            },
            body: {
              type: 'string',
              description: 'Email body content'
            },
            replyToId: {
              type: 'string',
              description: 'ID of email being replied to (optional)'
            },
            cc: { type: 'array', items: { type: 'string' }, description: 'Email addresses to CC (optional)' }
          },
          required: ['to', 'subject', 'body']
        }
      },
      {
        name: 'mark_email_read',
        description: 'Mark an email as read or unread',
        inputSchema: {
          type: 'object',
          properties: {
            emailId: {
              type: 'string',
              description: 'Gmail message ID'
            },
            isRead: {
              type: 'boolean',
              description: 'Whether to mark as read (true) or unread (false)'
            }
          },
          required: ['emailId', 'isRead']
        }
      },
      {
        name: 'delete_email',
        description: 'Delete/trash an email',
        inputSchema: {
          type: 'object',
          properties: {
            emailId: {
              type: 'string',
              description: 'Gmail message ID'
            }
          },
          required: ['emailId']
        }
      },
      {
        name: 'create_event',
        description: 'Create a new calendar event with optional Google Meet link',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Event title'
            },
            description: {
              type: 'string',
              description: 'Event description (optional)'
            },
            start_time: {
              type: 'string',
              description: 'Event start time in ISO 8601 format (e.g., "2024-01-15T14:30:00")'
            },
            end_time: {
              type: 'string',
              description: 'Event end time in ISO 8601 format (e.g., "2024-01-15T15:30:00")'
            },
            timezone: {
              type: 'string',
              description: 'Timezone for the event (e.g., "America/New_York"), defaults to UTC'
            },
            location: {
              type: 'string',
              description: 'Event location (optional)'
            },
            attendees: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of attendee email addresses (optional)'
            },
            create_meet_link: {
              type: 'boolean',
              description: 'Whether to create a Google Meet link for the event (optional)',
              default: false
            }
          },
          required: ['title', 'start_time', 'end_time']
        }
      },
      {
        name: 'list_events',
        description: 'List upcoming calendar events',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: {
              type: 'number',
              description: 'Maximum number of events to return (default: 10)',
              default: 10
            },
            timeMin: {
              type: 'string',
              description: 'Start time to filter events (ISO 8601 format), defaults to now'
            },
            timeMax: {
              type: 'string',
              description: 'End time to filter events (ISO 8601 format), optional'
            },
            query: {
              type: 'string',
              description: 'Text query to filter events (optional)'
            }
          }
        }
      },
      {
        name: 'get_event_details',
        description: 'Get detailed information about a specific calendar event',
        inputSchema: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'Calendar event ID'
            }
          },
          required: ['eventId']
        }
      },
      {
        name: 'update_event',
        description: 'Update an existing calendar event',
        inputSchema: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'Calendar event ID'
            },
            title: {
              type: 'string',
              description: 'Updated event title (optional)'
            },
            description: {
              type: 'string',
              description: 'Updated event description (optional)'
            },
            start_time: {
              type: 'string',
              description: 'Updated start time in ISO 8601 format (optional)'
            },
            end_time: {
              type: 'string',
              description: 'Updated end time in ISO 8601 format (optional)'
            },
            timezone: {
              type: 'string',
              description: 'Updated timezone (optional)'
            },
            location: {
              type: 'string',
              description: 'Updated location (optional)'
            },
            attendees: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Updated list of attendee email addresses (optional)'
            },
            create_meet_link: {
              type: 'boolean',
              description: 'Whether to add a Google Meet link (optional)'
            }
          },
          required: ['eventId']
        }
      },
      {
        name: 'delete_event',
        description: 'Delete a calendar event',
        inputSchema: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'Calendar event ID'
            }
          },
          required: ['eventId']
        }
      },
      {
        name: 'search_events',
        description: 'Search calendar events by keyword and date range',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (keywords to search for in event titles and descriptions)'
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of events to return (default: 25)',
              default: 25
            },
            timeMin: {
              type: 'string',
              description: 'Start time to filter events (ISO 8601 format), optional'
            },
            timeMax: {
              type: 'string',
              description: 'End time to filter events (ISO 8601 format), optional'
            }
          },
          required: ['query']
        }
      }
    ];

    res.json({ tools });
  } catch (error) {
    console.error("List MCP tools error:", error);
    res.status(500).json({ error: "Failed to list MCP tools" });
  }
});

app.post("/api/mcp/call-tool", requireAuth, async (req, res) => {
  try {
    const { tool_name, arguments: args } = req.body;
    
    if (!tool_name) {
      return res.status(400).json({ error: 'Tool name is required' });
    }

    // Re-authenticate with current session tokens
    if (!emailService.isAuthenticated()) {
      oauth2Client.setCredentials(req.session.tokens);
      await emailService.authenticateGmail(req.session.tokens);
    }
    
    if (!calendarService.isAuthenticated()) {
      oauth2Client.setCredentials(req.session.tokens);
      await calendarService.authenticateGoogleCalendar(req.session.tokens);
    }

    // Execute the tool based on the tool name
    const result = await executeMCPTool(tool_name, args, emailService, calendarService);
    
    res.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    });
  } catch (error) {
    console.error("MCP tool call error:", error);
    res.status(500).json({ 
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ]
    });
  }
});

// MCP tool execution helper function
async function executeMCPTool(toolName, args, emailService, calendarService) {
  switch (toolName) {
    case 'list_emails':
      return await listEmails(args, emailService);
    case 'get_email_details':
      return await getEmailDetails(args, emailService);
    case 'send_email':
      return await sendEmail(args, emailService);
    case 'mark_email_read':
      return await markEmailRead(args, emailService);
    case 'delete_email':
      return await deleteEmail(args, emailService);
    case 'create_event':
      return await createEvent(args, calendarService);
    case 'list_events':
      return await listEvents(args, calendarService);
    case 'get_event_details':
      return await getEventDetails(args, calendarService);
    case 'update_event':
      return await updateEvent(args, calendarService);
    case 'delete_event':
      return await deleteEvent(args, calendarService);
    case 'search_events':
      return await searchEvents(args, calendarService);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function listEmails(args, emailService) {
  const { maxResults = 20, query } = args;
  
  try {
    console.log('🔍 Listing emails with args:', args);
    console.log('🔍 Email service authenticated:', emailService.isAuthenticated());
    
    const emails = await emailService.getInboxEmails(maxResults, query);
    console.log('🔍 Retrieved emails:', emails.length);
    
    const summary = emailService.generateEmailSummary(emails);
    console.log('🔍 Generated summary:', summary);
    
    const result = {
      summary,
      emails: emails.map(email => ({
        id: email.id,
        subject: email.subject,
        from: email.from,
        date: email.date,
        isRead: !email.unread, // Convert unread to isRead
        snippet: email.snippet
      }))
    };
    
    console.log('🔍 Returning result with', result.emails.length, 'emails');
    return result;
  } catch (error) {
    console.error('❌ listEmails error:', error);
    throw new Error(`Failed to list emails: ${error.message}`);
  }
}

async function getEmailDetails(args, emailService) {
  const { emailId } = args;
  
  try {
    const email = await emailService.getEmailDetails(emailId);
    return email;
  } catch (error) {
    throw new Error(`Failed to get email details: ${error.message}`);
  }
}

async function sendEmail(args, emailService) {
  const { to, cc = null, subject, body, replyToId } = args;
  
  try {
    const result = await emailService.sendEmail(to, subject, body, replyToId, cc);
    return {
      success: true,
      messageId: result.id,
      message: 'Email sent successfully'
    };
  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

async function markEmailRead(args, emailService) {
  const { emailId, isRead } = args;
  
  try {
    await emailService.markEmailAsRead(emailId, isRead);
    return {
      success: true,
      message: `Email marked as ${isRead ? 'read' : 'unread'} successfully`
    };
  } catch (error) {
    throw new Error(`Failed to mark email: ${error.message}`);
  }
}

async function deleteEmail(args, emailService) {
  const { emailId } = args;
  
  try {
    await emailService.deleteEmail(emailId);
    return {
      success: true,
      message: 'Email deleted successfully'
    };
  } catch (error) {
    throw new Error(`Failed to delete email: ${error.message}`);
  }
}

// Calendar helper functions
async function createEvent(args, calendarService) {
  try {
    const result = await calendarService.createEvent(args);
    return result;
  } catch (error) {
    throw new Error(`Failed to create calendar event: ${error.message}`);
  }
}

async function listEvents(args, calendarService) {
  try {
    const result = await calendarService.listEvents(args);
    return result;
  } catch (error) {
    throw new Error(`Failed to list calendar events: ${error.message}`);
  }
}

async function getEventDetails(args, calendarService) {
  const { eventId } = args;
  
  try {
    const result = await calendarService.getEventDetails(eventId);
    return result;
  } catch (error) {
    throw new Error(`Failed to get event details: ${error.message}`);
  }
}

async function updateEvent(args, calendarService) {
  const { eventId, ...updates } = args;
  
  try {
    const result = await calendarService.updateEvent(eventId, updates);
    return result;
  } catch (error) {
    throw new Error(`Failed to update calendar event: ${error.message}`);
  }
}

async function deleteEvent(args, calendarService) {
  const { eventId } = args;
  
  try {
    const result = await calendarService.deleteEvent(eventId);
    return result;
  } catch (error) {
    throw new Error(`Failed to delete calendar event: ${error.message}`);
  }
}

async function searchEvents(args, calendarService) {
  const { query, ...options } = args;
  
  try {
    const result = await calendarService.searchEvents(query, options);
    return result;
  } catch (error) {
    throw new Error(`Failed to search calendar events: ${error.message}`);
  }
}

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
