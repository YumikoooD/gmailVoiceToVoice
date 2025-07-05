import { useEffect, useState } from "react";
import { Mail, Send, Archive, Trash2, Check, X } from "react-feather";

const emailTools = [
  {
    type: "function",
    name: "get_inbox_summary",
    description: "Get a summary of the user's email inbox including unread count and recent emails",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of emails to fetch (default: 20)",
          default: 20
        }
      }
    }
  },
  {
    type: "function", 
    name: "read_email",
    description: "Read the full content of a specific email",
    parameters: {
      type: "object",
      properties: {
        emailId: {
          type: "string",
          description: "The ID of the email to read"
        }
      },
      required: ["emailId"]
    }
  },
  {
    type: "function",
    name: "send_email",
    description: "Send an email or reply to an existing email",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Recipient email address"
        },
        subject: {
          type: "string", 
          description: "Email subject"
        },
        body: {
          type: "string",
          description: "Email body content"
        },
        replyToId: {
          type: "string",
          description: "ID of email being replied to (optional)"
        }
      },
      required: ["to", "subject", "body"]
    }
  },
  {
    type: "function",
    name: "mark_email_read",
    description: "Mark an email as read or unread",
    parameters: {
      type: "object",
      properties: {
        emailId: {
          type: "string",
          description: "The ID of the email"
        },
        isRead: {
          type: "boolean",
          description: "Whether to mark as read (true) or unread (false)"
        }
      },
      required: ["emailId", "isRead"]
    }
  },
  {
    type: "function",
    name: "delete_email",
    description: "Delete or archive an email",
    parameters: {
      type: "object",
      properties: {
        emailId: {
          type: "string",
          description: "The ID of the email to delete"
        }
      },
      required: ["emailId"]
    }
  },
  {
    type: "function",
    name: "draft_email_reply",
    description: "Generate a draft reply to an email based on the content and user's instructions",
    parameters: {
      type: "object",
      properties: {
        emailId: {
          type: "string",
          description: "The ID of the email being replied to"
        },
        replyType: {
          type: "string",
          description: "Type of reply: 'accept', 'decline', 'request_info', 'schedule_meeting', 'custom'",
          enum: ["accept", "decline", "request_info", "schedule_meeting", "custom"]
        },
        instructions: {
          type: "string",
          description: "Specific instructions for the reply"
        }
      },
      required: ["emailId", "replyType"]
    }
  }
];

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: emailTools,
    tool_choice: "auto",
    instructions: `You are an AI Email Assistant helping the user manage their inbox through voice commands. 

Your key responsibilities:
1. Provide inbox summaries and triaging
2. Read emails aloud with proper emphasis
3. Draft replies based on user instructions
4. Handle email organization (mark as read, delete, etc.)
5. Help achieve "Inbox Zero" through efficient email processing

Always prioritize safety and ask for confirmation before sending emails or making major changes.
When reading emails, focus on the most important information first (sender, subject, key points).
For replies, match the user's communication style and be professional.`
  },
};

function EmailSummaryDisplay({ summary, emails }) {
  if (!summary) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-blue-50 p-3 rounded-md">
        <h3 className="font-semibold text-blue-800 mb-2">📧 Inbox Summary</h3>
        <p className="text-sm text-blue-700">{summary.summary}</p>
        <div className="flex gap-4 mt-2 text-xs text-blue-600">
          <span>📬 Total: {summary.totalEmails}</span>
          <span>📭 Unread: {summary.unreadEmails}</span>
          <span>📰 Read: {summary.readEmails}</span>
        </div>
      </div>
      
      {emails && emails.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Recent Emails:</h4>
          {emails.slice(0, 5).map((email, index) => (
            <div key={email.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
              <div className={`w-2 h-2 rounded-full ${email.unread ? 'bg-blue-500' : 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{email.subject}</p>
                <p className="text-gray-600 truncate">{email.from}</p>
              </div>
              <span className="text-gray-500 text-xs">{email.date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmailAction({ action, result }) {
  const icons = {
    send_email: Send,
    mark_email_read: Check,
    delete_email: Trash2,
    draft_email_reply: Mail
  };
  
  const Icon = icons[action] || Mail;
  
  return (
    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
      <Icon size={16} className="text-green-600" />
      <span className="text-sm text-green-700">
        {action.replace('_', ' ')} completed successfully
      </span>
    </div>
  );
}

function FunctionCallOutput({ functionCallOutput }) {
  const { name, arguments: args } = functionCallOutput;
  
  try {
    const parsedArgs = JSON.parse(args);
    
    switch (name) {
      case 'get_inbox_summary':
        return <EmailSummaryDisplay summary={parsedArgs.summary} emails={parsedArgs.emails} />;
      
      case 'send_email':
      case 'mark_email_read':
      case 'delete_email':
      case 'draft_email_reply':
        return <EmailAction action={name} result={parsedArgs} />;
      
      default:
        return (
          <div className="bg-gray-50 p-2 rounded-md">
            <p className="text-sm font-medium">{name}</p>
            <pre className="text-xs bg-gray-100 rounded-md p-2 mt-1 overflow-x-auto">
              {JSON.stringify(parsedArgs, null, 2)}
            </pre>
          </div>
        );
    }
  } catch (error) {
    return (
      <div className="bg-red-50 p-2 rounded-md">
        <p className="text-sm text-red-700">Error displaying result</p>
      </div>
    );
  }
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [toolsRegistered, setToolsRegistered] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);
  const [emailSummary, setEmailSummary] = useState(null);

  // Register email tools when session starts
  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!toolsRegistered && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setToolsRegistered(true);
    }

    // Handle email function calls
    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach(async (output) => {
        if (output.type === "function_call") {
          await handleEmailFunction(output);
        }
      });
    }
  }, [events]);

  // Handle email function calls
  const handleEmailFunction = async (functionCall) => {
    const { name, arguments: args } = functionCall;
    
    try {
      const parsedArgs = JSON.parse(args);
      let result = null;

      switch (name) {
        case 'get_inbox_summary':
          result = await fetchInboxSummary(parsedArgs.limit);
          break;
        case 'send_email':
          result = await sendEmail(parsedArgs);
          break;
        case 'mark_email_read':
          result = await markEmailAsRead(parsedArgs.emailId, parsedArgs.isRead);
          break;
        case 'delete_email':
          result = await deleteEmail(parsedArgs.emailId);
          break;
        case 'read_email':
          result = await readEmail(parsedArgs.emailId);
          break;
        case 'draft_email_reply':
          result = await draftEmailReply(parsedArgs);
          break;
      }

      // Send function result back to AI
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCall.call_id,
          output: JSON.stringify(result)
        }
      });

      setFunctionCallOutput({
        ...functionCall,
        result
      });

    } catch (error) {
      console.error('Email function error:', error);
      // Send error back to AI
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCall.call_id,
          output: JSON.stringify({ error: error.message })
        }
      });
    }
  };

  // Email API functions
  const fetchInboxSummary = async (limit = 20) => {
    const response = await fetch(`/api/emails?limit=${limit}`);
    const data = await response.json();
    setEmailSummary(data);
    return data;
  };

  const sendEmail = async ({ to, subject, body, replyToId }) => {
    const response = await fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body, replyToId })
    });
    return await response.json();
  };

  const markEmailAsRead = async (emailId, isRead) => {
    const response = await fetch(`/api/emails/${emailId}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead })
    });
    return await response.json();
  };

  const deleteEmail = async (emailId) => {
    const response = await fetch(`/api/emails/${emailId}`, {
      method: 'DELETE'
    });
    return await response.json();
  };

  const readEmail = async (emailId) => {
    // Fetch specific email details from the server
    const response = await fetch(`/api/emails/${emailId}`);
    if (response.ok) {
      return await response.json();
    } else {
      return { error: 'Failed to fetch email details' };
    }
  };

  const draftEmailReply = async ({ emailId, replyType, instructions }) => {
    const email = emailSummary?.emails?.find(e => e.id === emailId);
    if (!email) return { error: 'Email not found' };

    // This would be handled by the AI to generate the reply
    return {
      emailId,
      replyType,
      instructions,
      originalEmail: email
    };
  };

  // Reset state when session ends
  useEffect(() => {
    if (!isSessionActive) {
      setToolsRegistered(false);
      setFunctionCallOutput(null);
      setEmailSummary(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold">Email Assistant</h2>
        </div>
        
        {!isSessionActive ? (
          <div className="text-center text-gray-600">
            <p>🎤 Start the session to begin managing your emails with voice commands</p>
            <div className="mt-4 text-sm">
              <p>Try saying:</p>
              <ul className="list-disc text-left max-w-xs mx-auto mt-2 space-y-1">
                <li>"Check my inbox"</li>
                <li>"Read my unread emails"</li>
                <li>"Send an email to..."</li>
                <li>"Reply to the last email"</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {functionCallOutput && (
              <FunctionCallOutput functionCallOutput={functionCallOutput} />
            )}
            
            {emailSummary && (
              <EmailSummaryDisplay 
                summary={emailSummary.summary} 
                emails={emailSummary.emails} 
              />
            )}
            
            {!functionCallOutput && !emailSummary && (
              <p className="text-gray-600">
                🎯 Ready to help with your emails! Try asking about your inbox or specific email tasks.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
