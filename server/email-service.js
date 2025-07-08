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

  // Get inbox emails
  async getInboxEmails(limit = 20, query = null) {
    if (this.activeProvider !== 'gmail') {
      throw new Error('Gmail not authenticated');
    }
    return await this.getGmailInbox(limit, query);
  }

  async getGmailInbox(limit, query) {
    const gmail = google.gmail({ version: 'v1', auth: this.gmailAuth });
    
    // Build the Gmail query
    let gmailQuery = '';
    if (query) {
      // User provided a custom query (e.g., "after:2024/01/01", "is:unread")
      gmailQuery = query;
    } else {
      // Default query: recent emails, excluding only promotions
      gmailQuery = 'newer_than:14d -category:promotions';
    }
    
    console.log('Gmail query:', gmailQuery);
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: limit * 2, // Fetch more to account for filtering
      q: gmailQuery
    });

    const emails = [];
    console.log(`Gmail API returned ${response.data.messages?.length || 0} messages`);
    
    for (const message of response.data.messages || []) {
      try {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });
        
        const headers = email.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        console.log(`Processing email: "${subject}" from "${from}"`);
        
        // Only skip promotional emails (keep everything else)
        if (this.isPromotionalEmail(email.data)) {
          console.log(`  → Skipped: Promotional email`);
          continue;
        }
        
        console.log(`  → Added to results`);
        
        emails.push({
          id: message.id,
          subject,
          from,
          date: date ? this.formatDate(date) : 'Unknown',
          snippet: email.data.snippet,
          unread: email.data.labelIds?.includes('UNREAD') || false,
          body: await this.extractEmailBody(email.data.payload)
        });
        
        // Stop once we have enough personal emails
        if (emails.length >= limit) {
          break;
        }
      } catch (error) {
        console.error(`Error processing email ${message.id}:`, error);
        // Continue processing other emails
        continue;
      }
    }
    
    console.log(`Filter summary: Found ${emails.length} emails from ${response.data.messages?.length || 0} total messages`);
    return emails;
  }

  // Simple promotional email detection - only filters obvious promotional emails
  isPromotionalEmail(emailData) {
    const labelIds = emailData.labelIds || [];
    
    // Only filter emails that Gmail has already categorized as promotions
    return labelIds.includes('CATEGORY_PROMOTIONS');
  }

  // Send email
  async sendEmail(to, subject, body, replyToId = null, cc = null) {
    if (this.activeProvider !== 'gmail') {
      throw new Error('Gmail not authenticated');
    }
    return await this.sendGmailEmail(to, subject, body, replyToId, cc);
  }

  async sendGmailEmail(to, subject, body, replyToId, cc) {
    const gmail = google.gmail({ version: 'v1', auth: this.gmailAuth });
    
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      ...(cc ? [`Cc: ${Array.isArray(cc)? cc.join(', '): cc}`] : []),
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      body
    ].join('\n');
    const encodedEmail = Buffer.from(emailLines).toString('base64url');
    
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
        threadId: replyToId
      }
    });

    return { success: true, messageId: response.data.id };
  }

  // Mark email as read/unread
  async markEmailAsRead(emailId, isRead = true) {
    if (this.activeProvider !== 'gmail') {
      throw new Error('Gmail not authenticated');
    }

    const gmail = google.gmail({ version: 'v1', auth: this.gmailAuth });
    const action = isRead ? 'removeLabelIds' : 'addLabelIds';
    
    await gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        [action]: ['UNREAD']
      }
    });
    
    return { success: true };
  }

  // Delete email
  async deleteEmail(emailId) {
    if (this.activeProvider !== 'gmail') {
      throw new Error('Gmail not authenticated');
    }

    const gmail = google.gmail({ version: 'v1', auth: this.gmailAuth });
    await gmail.users.messages.trash({
      userId: 'me',
      id: emailId
    });
    
    return { success: true };
  }

  // Fetch recently sent emails (used for behavioural profiling)
  async getSentEmails(limit = 300) {
    if (this.activeProvider !== 'gmail') {
      throw new Error('Gmail not authenticated');
    }

    const gmail = google.gmail({ version: 'v1', auth: this.gmailAuth });

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:sent',
      maxResults: limit
    });

    const messages = response.data.messages || [];
    const emails = [];

    for (const message of messages) {
      try {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        const headers = details.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const to = headers.find(h => h.name === 'To')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';

        // Use existing helper to extract plain text body
        const body = await this.extractEmailBody(details.data.payload);

        emails.push({ to, from, subject, body, date });
      } catch (error) {
        console.error(`Error fetching sent message ${message.id}:`, error);
      }
    }

    return emails;
  }
 
  // Get specific email details
  async getEmailDetails(emailId) {
    if (this.activeProvider !== 'gmail') {
      throw new Error('Gmail not authenticated');
    }

    const gmail = google.gmail({ version: 'v1', auth: this.gmailAuth });
    const email = await gmail.users.messages.get({
      userId: 'me',
      id: emailId
    });

    // Check if this email should be filtered out
    if (this.shouldSkipEmail(email.data)) {
      throw new Error('Email not available (filtered out)');
    }

    const headers = email.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    
    // Check if sender should be filtered out
    if (this.isUnwantedSender(from, headers)) {
      throw new Error('Email not available (filtered out)');
    }
    
    return {
      id: emailId,
      subject,
      from,
      date: date ? this.formatDate(date) : 'Unknown',
      body: await this.extractEmailBody(email.data.payload),
      unread: email.data.labelIds?.includes('UNREAD') || false
    };
  }

  // Extract email body from Gmail payload
  async extractEmailBody(payload) {
    let body = '';
    
    if (payload.body?.data) {
      body = Buffer.from(payload.body.data, 'base64').toString();
    } else if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString();
          break;
        }
      }
    }
    
    return body;
  }

  // Format date for display
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return format(date, 'PPp');
    } catch (error) {
      return dateString;
    }
  }

  // Generate email summary
  generateEmailSummary(emails) {
    const unreadCount = emails.filter(e => e.unread).length;
    const totalCount = emails.length;
    
    return {
      totalEmails: totalCount,
      unreadEmails: unreadCount,
      readEmails: totalCount - unreadCount,
      summary: `You have ${unreadCount} unread personal emails out of ${totalCount} total personal emails in your inbox (excluding promotions and newsletters).`
    };
  }

  // Check if authenticated
  isAuthenticated() {
    return this.activeProvider === 'gmail' && this.gmailAuth !== null;
  }

  // Check if email should be skipped (placeholder for future filtering)
  shouldSkipEmail(emailData) {
    // Currently no additional filtering beyond promotional emails
    return this.isPromotionalEmail(emailData);
  }

  // Check if sender should be filtered out (placeholder for future filtering)
  isUnwantedSender(from, headers) {
    // Currently no sender filtering
    return false;
  }
}

export default EmailService; 