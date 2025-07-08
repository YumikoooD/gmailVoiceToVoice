import EmailService from './_utils/email-service.js';
import CalendarService from './_utils/calendar-service.js';
import { google } from 'googleapis';

const emailService = new EmailService();
const calendarService = new CalendarService();

// Helper function to parse cookies
function parseCookies(cookieString) {
  const cookies = {};
  if (cookieString) {
    cookieString.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        cookies[key] = value;
      }
    });
  }
  return cookies;
}

// Helper function to authenticate services
async function authenticateServices(cookies) {
  if (!cookies.gmail_tokens || !cookies.authenticated) {
    throw new Error('Authentication required');
  }

  try {
    const tokens = JSON.parse(decodeURIComponent(cookies.gmail_tokens));
    
    // Authenticate both services
    if (!emailService.isAuthenticated()) {
      await emailService.authenticateGmail(tokens);
    }
    
    if (!calendarService.isAuthenticated()) {
      await calendarService.authenticateGoogleCalendar(tokens);
    }
    
    return tokens;
  } catch (error) {
    throw new Error('Invalid authentication tokens');
  }
}

export default async function handler(req, res) {
  const { method, query } = req;
  
  try {
    // Handle list-tools request
    if (method === 'GET' && (query.action === 'list-tools' || !query.action)) {
      const tools = [
        {
          name: 'list_emails',
          description: 'List emails from the inbox with optional filtering',
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
                description: 'Gmail search query (e.g., "is:unread", "from:example@email.com")'
              }
            }
          }
        },
        {
          name: 'get_email_details',
          description: 'Get detailed information about a specific email',
          inputSchema: {
            type: 'object',
            properties: {
              emailId: {
                type: 'string',
                description: 'Email ID to get details for'
              }
            },
            required: ['emailId']
          }
        },
        {
          name: 'send_email',
          description: 'Send an email or reply to an existing email',
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
              cc: {
                type: 'array',
                items: { type: 'string' },
                description: 'Email addresses to CC (optional)'
              },
              body: {
                type: 'string',
                description: 'Email body content'
              },
              replyToId: {
                type: 'string',
                description: 'ID of email to reply to (optional)'
              }
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
                description: 'Email ID to mark as read/unread'
              },
              isRead: {
                type: 'boolean',
                description: 'Whether to mark as read (true) or unread (false)',
                default: true
              }
            },
            required: ['emailId']
          }
        },
        {
          name: 'delete_email',
          description: 'Delete an email',
          inputSchema: {
            type: 'object',
            properties: {
              emailId: {
                type: 'string',
                description: 'Email ID to delete'
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
                description: 'Event start time in ISO 8601 format'
              },
              end_time: {
                type: 'string',
                description: 'Event end time in ISO 8601 format'
              },
              timezone: {
                type: 'string',
                description: 'Timezone for the event'
              },
              location: {
                type: 'string',
                description: 'Event location (optional)'
              },
              attendees: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of attendee email addresses'
              },
              create_meet_link: {
                type: 'boolean',
                description: 'Whether to create a Google Meet link',
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
                description: 'Maximum number of events to return',
                default: 10
              },
              timeMin: {
                type: 'string',
                description: 'Start time to filter events'
              },
              timeMax: {
                type: 'string',
                description: 'End time to filter events'
              },
              query: {
                type: 'string',
                description: 'Text query to filter events'
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
              title: { type: 'string', description: 'Updated event title' },
              description: { type: 'string', description: 'Updated event description' },
              start_time: { type: 'string', description: 'Updated start time' },
              end_time: { type: 'string', description: 'Updated end time' },
              timezone: { type: 'string', description: 'Updated timezone' },
              location: { type: 'string', description: 'Updated location' },
              attendees: { type: 'array', items: { type: 'string' }, description: 'Updated attendees' },
              create_meet_link: { type: 'boolean', description: 'Whether to add Google Meet link' }
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
                description: 'Search query'
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of events to return',
                default: 25
              },
              timeMin: {
                type: 'string',
                description: 'Start time to filter events'
              },
              timeMax: {
                type: 'string',
                description: 'End time to filter events'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'get_user_profile',
          description: 'Retrieve the current user\'s profile including contacts list for name→email resolution',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ];

      return res.json({ tools });
    }

    // Handle call-tool request
    if (method === 'POST' && (query.action === 'call-tool' || !query.action)) {
      const { tool_name, arguments: args } = req.body;

      if (!tool_name) {
        return res.status(400).json({ error: 'tool_name is required' });
      }

      // Parse cookies for authentication
      const cookies = parseCookies(req.headers.cookie);
      await authenticateServices(cookies);

      // Execute the tool
      const result = await executeTool(tool_name, args, cookies);
      
      return res.json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('MCP error:', error);
    return res.status(500).json({ error: error.message || 'MCP operation failed' });
  }
}

async function executeTool(toolName, args, cookies) {
  switch (toolName) {
    case 'list_emails':
      return await listEmails(args);
    case 'get_email_details':
      return await getEmailDetails(args);
    case 'send_email':
      return await sendEmail(args, cookies);
    case 'mark_email_read':
      return await markEmailRead(args);
    case 'delete_email':
      return await deleteEmail(args);
    case 'create_event':
      return await createEvent(args);
    case 'list_events':
      return await listEvents(args);
    case 'get_event_details':
      return await getEventDetails(args);
    case 'update_event':
      return await updateEvent(args);
    case 'delete_event':
      return await deleteEvent(args);
    case 'search_events':
      return await searchEvents(args);
    case 'get_user_profile':
      return await getUserProfile(cookies);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Email helper functions
async function listEmails(args) {
  const { maxResults = 20, query } = args;
  const emails = await emailService.getInboxEmails(maxResults, query);
  const summary = emailService.generateEmailSummary(emails);
  
  return {
    summary,
    emails: emails.map(email => ({
      id: email.id,
      subject: email.subject,
      from: email.from,
      date: email.date,
      isRead: !email.unread,
      snippet: email.snippet
    }))
  };
}

async function getEmailDetails(args) {
  const { emailId } = args;
  const email = await emailService.getEmailDetails(emailId);
  return email;
}

async function sendEmail(args, cookies) {
  let { to, cc = null, subject, body, replyToId } = args;

  // Helper: resolve name → email using user_profile cookie or sent mail history
  const resolveEmail = async (name) => {
    // 1) From user_profile cookie (if present)
    try {
      if (cookies.user_profile) {
        const profile = JSON.parse(decodeURIComponent(cookies.user_profile));
        const contacts = profile.contacts || [];
        // Exact name match
        const exact = contacts.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (exact) return exact.email;
        // Partial match on name
        const partial = contacts.find(c => name.toLowerCase().split(' ').every(p=>c.name.includes(p)));
        if (partial) return partial.email;
        // Fallback frequentContacts list
        const candidates = profile.frequentContacts || [];
        const matched = candidates.find((e) => e.toLowerCase().includes(name.toLowerCase()));
        if (matched) return matched;
      }
    } catch (e) {
      console.error('Failed to parse user_profile cookie', e);
    }

    // 2) Fallback: scan recently sent emails for addresses containing the name
    try {
      const sent = await emailService.getSentEmails(200);
      const emailCounts = {};
      sent.forEach((mail) => {
        if (!mail.to) return;
        const recipients = Array.isArray(mail.to) ? mail.to : [mail.to];
        recipients.forEach((addr) => {
          if (addr.toLowerCase().includes(name.toLowerCase())) {
            emailCounts[addr] = (emailCounts[addr] || 0) + 1;
          }
        });
      });
      if (Object.keys(emailCounts).length) {
        // Return most common match
        return Object.entries(emailCounts).sort((a,b)=>b[1]-a[1])[0][0];
      }
    } catch (e) {
      console.error('Failed to scan sent emails for contacts', e);
    }

    return null;
  };

  if (!to) {
    throw new Error('"to" parameter is required');
  }

  if (!to.includes('@')) {
    const resolved = await resolveEmail(to);
    if (!resolved) {
      throw new Error(`Could not resolve email address for recipient "${to}"`);
    }
    to = resolved;
  }

  // Resolve CC addresses if provided
  let ccResolved = null;
  if (cc) {
    const ccArray = Array.isArray(cc) ? cc : [cc];
    ccResolved = [];
    for (const recipient of ccArray) {
      if (recipient.includes('@')) {
        ccResolved.push(recipient);
      } else {
        const resolved = await resolveEmail(recipient);
        if (!resolved) throw new Error(`Could not resolve email address for CC recipient "${recipient}"`);
        ccResolved.push(resolved);
      }
    }
  }

  const result = await emailService.sendEmail(to, subject, body, replyToId, ccResolved);
  return result;
}

async function markEmailRead(args) {
  const { emailId, isRead = true } = args;
  const result = await emailService.markEmailAsRead(emailId, isRead);
  return result;
}

async function deleteEmail(args) {
  const { emailId } = args;
  const result = await emailService.deleteEmail(emailId);
  return result;
}

// Calendar helper functions
async function createEvent(args) {
  return await calendarService.createEvent(args);
}

async function listEvents(args) {
  return await calendarService.listEvents(args);
}

async function getEventDetails(args) {
  const { eventId } = args;
  return await calendarService.getEventDetails(eventId);
}

async function updateEvent(args) {
  const { eventId, ...updates } = args;
  return await calendarService.updateEvent(eventId, updates);
}

async function deleteEvent(args) {
  const { eventId } = args;
  return await calendarService.deleteEvent(eventId);
}

async function searchEvents(args) {
  const { query, ...options } = args;
  return await calendarService.searchEvents(query, options);
} 

async function getUserProfile(cookies) {
  if (!cookies.user_profile) {
    throw new Error('User profile not available. Please log in again.');
  }
  try {
    return JSON.parse(decodeURIComponent(cookies.user_profile));
  } catch (e) {
    throw new Error('Failed to parse stored user profile');
  }
} 