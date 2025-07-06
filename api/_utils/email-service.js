import { google } from 'googleapis';
import { format, parseISO } from 'date-fns';

class EmailService {
  constructor() {
    this.gmailAuth = null;
    this.activeProvider = null;
  }

  // Gmail Authentication
  async authenticateGmail(tokens) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );
    
    oauth2Client.setCredentials(tokens);
    this.gmailAuth = oauth2Client;
    this.activeProvider = 'gmail';
    return true;
  }

  isAuthenticated() {
    return this.gmailAuth !== null;
  }

  // Get inbox emails
  async getInboxEmails(maxResults = 20) {
    if (!this.gmailAuth) {
      throw new Error('Not authenticated');
    }

    const gmail = google.gmail({ version: 'v1', auth: this.gmailAuth });
    
    // Get list of messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox',
      maxResults
    });

    const messages = response.data.messages || [];
    
    // Get detailed info for each message
    const emails = [];
    for (const message of messages) {
      try {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date', 'To']
        });

        const headers = details.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        const to = headers.find(h => h.name === 'To')?.value || '';

        emails.push({
          id: message.id,
          subject,
          from,
          to,
          date: date ? format(parseISO(date), 'MMM d, yyyy h:mm a') : '',
          isRead: !details.data.labelIds?.includes('UNREAD'),
          snippet: details.data.snippet || ''
        });
      } catch (error) {
        console.error('Error fetching message:', error);
      }
    }

    return emails;
  }

  // Get detailed email content
  async getEmailDetails(messageId) {
    if (!this.gmailAuth) {
      throw new Error('Not authenticated');
    }

    const gmail = google.gmail({ version: 'v1', auth: this.gmailAuth });
    
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const message = response.data;
    const headers = message.payload.headers;
    
    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';

    // Extract body content
    let body = '';
    if (message.payload.body && message.payload.body.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString();
    } else if (message.payload.parts) {
      // Handle multipart messages
      const textPart = message.payload.parts.find(part => part.mimeType === 'text/plain');
      if (textPart && textPart.body && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString();
      }
    }

    return {
      id: messageId,
      subject,
      from,
      to,
      date: date ? format(parseISO(date), 'MMM d, yyyy h:mm a') : '',
      body,
      isRead: !message.labelIds?.includes('UNREAD'),
      snippet: message.snippet || ''
    };
  }

  // Send email
  async sendEmail(to, subject, body, replyToId = null) {
    if (!this.gmailAuth) {
      throw new Error('Not authenticated');
    }

    const gmail = google.gmail({ version: 'v1', auth: this.gmailAuth });
    
    let headers = `To: ${to}\r\nSubject: ${subject}\r\n`;
    
    if (replyToId) {
      // Get original message for reply headers
      const originalMessage = await gmail.users.messages.get({
        userId: 'me',
        id: replyToId,
        format: 'metadata',
        metadataHeaders: ['Message-ID', 'References', 'In-Reply-To']
      });
      
      const originalHeaders = originalMessage.data.payload.headers;
      const messageId = originalHeaders.find(h => h.name === 'Message-ID')?.value;
      const references = originalHeaders.find(h => h.name === 'References')?.value;
      
      if (messageId) {
        headers += `In-Reply-To: ${messageId}\r\n`;
        headers += `References: ${references || ''} ${messageId}\r\n`;
      }
    }
    
    const email = headers + '\r\n' + body;
    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
    
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
        threadId: replyToId
      }
    });

    return response.data;
  }

  // Mark email as read/unread
  async markEmailAsRead(messageId, isRead = true) {
    if (!this.gmailAuth) {
      throw new Error('Not authenticated');
    }

    const gmail = google.gmail({ version: 'v1', auth: this.gmailAuth });
    
    const response = await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: isRead ? ['UNREAD'] : [],
        addLabelIds: isRead ? [] : ['UNREAD']
      }
    });

    return response.data;
  }

  // Delete email
  async deleteEmail(messageId) {
    if (!this.gmailAuth) {
      throw new Error('Not authenticated');
    }

    const gmail = google.gmail({ version: 'v1', auth: this.gmailAuth });
    
    const response = await gmail.users.messages.trash({
      userId: 'me',
      id: messageId
    });

    return response.data;
  }

  // Generate email summary
  generateEmailSummary(emails) {
    const unreadCount = emails.filter(email => !email.isRead).length;
    const totalCount = emails.length;
    
    return {
      unreadCount,
      totalCount,
      summary: `You have ${unreadCount} unread emails out of ${totalCount} total emails in your inbox.`
    };
  }
}

export default EmailService; 