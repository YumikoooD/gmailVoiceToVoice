import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import EmailService from './api/_utils/email-service.js';
import CalendarService from './api/_utils/calendar-service.js';
import fetch from 'node-fetch';

class GmailMCPServer {
  constructor() {
    this.server = new Server({
      name: 'gmail-calendar-mcp-server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.emailService = new EmailService();
    this.calendarService = new CalendarService();
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_emails',
            description: 'List recent emails from inbox with optional filtering',
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
                  description: 'Gmail query syntax for filtering (e.g., "is:unread", "from:example@gmail.com")'
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
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Get authentication tokens from the running server
        const authResponse = await fetch('http://localhost:3000/api/auth/status');
        if (!authResponse.ok) {
          throw new Error('Google authentication required. Please authenticate first.');
        }
        
        const authData = await authResponse.json();
        if (!authData.authenticated) {
          throw new Error('Google authentication required. Please authenticate first.');
        }

        // Authenticate both services
        await this.emailService.authenticateGmail(authData.tokens);
        await this.calendarService.authenticateGoogleCalendar(authData.tokens);

        switch (name) {
          case 'list_emails':
            return await this.listEmails(args);
          case 'get_email_details':
            return await this.getEmailDetails(args);
          case 'send_email':
            return await this.sendEmail(args);
          case 'mark_email_read':
            return await this.markEmailRead(args);
          case 'delete_email':
            return await this.deleteEmail(args);
          case 'create_event':
            return await this.createEvent(args);
          case 'list_events':
            return await this.listEvents(args);
          case 'get_event_details':
            return await this.getEventDetails(args);
          case 'update_event':
            return await this.updateEvent(args);
          case 'delete_event':
            return await this.deleteEvent(args);
          case 'search_events':
            return await this.searchEvents(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });
  }

  async listEmails(args) {
    const { maxResults = 20, query } = args;
    
    try {
      const emails = await this.emailService.getInboxEmails(maxResults);
      const summary = this.emailService.generateEmailSummary(emails);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary,
              emails: emails.map(email => ({
                id: email.id,
                subject: email.subject,
                from: email.from,
                date: email.date,
                isRead: email.isRead,
                snippet: email.snippet
              }))
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to list emails: ${error.message}`);
    }
  }

  async getEmailDetails(args) {
    const { emailId } = args;
    
    try {
      const email = await this.emailService.getEmailDetails(emailId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(email, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get email details: ${error.message}`);
    }
  }

  async sendEmail(args) {
    const { to, subject, body, replyToId } = args;
    
    try {
      const result = await this.emailService.sendEmail(to, subject, body, replyToId);
      
      return {
        content: [
          {
            type: 'text',
            text: `Email sent successfully. Message ID: ${result.id}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async markEmailRead(args) {
    const { emailId, isRead } = args;
    
    try {
      await this.emailService.markEmailAsRead(emailId, isRead);
      
      return {
        content: [
          {
            type: 'text',
            text: `Email marked as ${isRead ? 'read' : 'unread'} successfully`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to mark email: ${error.message}`);
    }
  }

  async deleteEmail(args) {
    const { emailId } = args;
    
    try {
      await this.emailService.deleteEmail(emailId);
      
      return {
        content: [
          {
            type: 'text',
            text: 'Email deleted successfully'
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to delete email: ${error.message}`);
    }
  }

  // Calendar event methods
  async createEvent(args) {
    try {
      const result = await this.calendarService.createEvent(args);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }
  }

  async listEvents(args) {
    try {
      const result = await this.calendarService.listEvents(args);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to list calendar events: ${error.message}`);
    }
  }

  async getEventDetails(args) {
    const { eventId } = args;
    
    try {
      const result = await this.calendarService.getEventDetails(eventId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get event details: ${error.message}`);
    }
  }

  async updateEvent(args) {
    const { eventId, ...updates } = args;
    
    try {
      const result = await this.calendarService.updateEvent(eventId, updates);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to update calendar event: ${error.message}`);
    }
  }

  async deleteEvent(args) {
    const { eventId } = args;
    
    try {
      const result = await this.calendarService.deleteEvent(eventId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to delete calendar event: ${error.message}`);
    }
  }

  async searchEvents(args) {
    const { query, ...options } = args;
    
    try {
      const result = await this.calendarService.searchEvents(query, options);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to search calendar events: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Gmail MCP Server running on stdio');
  }
}

const server = new GmailMCPServer();
server.run().catch(console.error); 