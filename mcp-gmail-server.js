import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import EmailService from './api/_utils/email-service.js';
import fetch from 'node-fetch';

class GmailMCPServer {
  constructor() {
    this.server = new Server({
      name: 'gmail-mcp-server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.emailService = new EmailService();
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
          throw new Error('Gmail authentication required. Please authenticate first.');
        }
        
        const authData = await authResponse.json();
        if (!authData.authenticated) {
          throw new Error('Gmail authentication required. Please authenticate first.');
        }

        // Authenticate the email service
        await this.emailService.authenticateGmail(authData.tokens);

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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Gmail MCP Server running on stdio');
  }
}

const server = new GmailMCPServer();
server.run().catch(console.error); 