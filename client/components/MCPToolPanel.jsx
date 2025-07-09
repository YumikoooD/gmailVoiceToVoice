import { useState, useEffect, useCallback, useRef } from 'react';
import { useSimpleMCPClient } from './SimpleMCPClient';
import { Mail, Check, X, AlertCircle } from 'react-feather';

const currentYear = new Date().getFullYear();
const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
const currentDay = String(new Date().getDate()).padStart(2, '0');

export default function MCPToolPanel({ 
  onToolsUpdate
}) {
  const { tools, connected, error, isLoading, getToolsForOpenAI } = useSimpleMCPClient();
  const [mcpStatus, setMcpStatus] = useState('disconnected');
  const sessionUpdateSent = useRef(false);

  // Update status based on connection state
  useEffect(() => {
    if (isLoading) {
      setMcpStatus('connecting');
    } else if (error) {
      if (error.includes('not authenticated')) {
        setMcpStatus('auth_required');
      } else {
        setMcpStatus('error');
      }
    } else if (connected && tools.length > 0) {
      setMcpStatus('connected');
    } else {
      setMcpStatus('disconnected');
    }
  }, [isLoading, error, connected, tools.length]);

  // Send session update only once when tools are loaded
  useEffect(() => {
    if (connected && tools.length > 0 && !sessionUpdateSent.current && onToolsUpdate) {
      const openAITools = getToolsForOpenAI();
      
      const sessionUpdate = {
        type: "session.update",
        session: {
          tools: openAITools,
          tool_choice: "auto",
          instructions: `You are an AI Email and Calendar Assistant helping the user manage their inbox and schedule through voice commands.

🚨 CRITICAL RULE - NEVER VIOLATE THIS:
You MUST use MCP tools for ALL email and calendar operations. You are FORBIDDEN from describing, listing, or mentioning ANY email/calendar content without first calling the appropriate MCP tool. If you don't call a tool when discussing emails or calendar events, you are HALLUCINATING and providing false information.

📧 MANDATORY EMAIL TOOL USAGE:
- ANY question about emails → IMMEDIATELY call list_emails
- User asks "what are my emails" → call list_emails  
- User asks "show me recent emails" → call list_emails
- User asks "what are my last 5 emails" → call list_emails with maxResults: 5
- User asks "any unread emails" → call list_emails with query: "is:unread"
- User asks "emails from today" → call list_emails with query: "newer_than:1d"
- User asks "emails from this week" → call list_emails with query: "newer_than:7d"
- User asks "emails from January" → call list_emails with query: "after:${currentYear}/01/01 before:${currentYear}/02/01"
- User asks "emails after December 1st" → call list_emails with query: "after:${currentYear}/12/01"
- User asks "emails before last Monday" → call list_emails with query: "before:${currentYear}${currentMonth} ${currentDay}"
- User asks "emails from July 5" → call list_emails with query: "after:${currentYear}/07/05 before:${currentYear}/07/06"
- User asks "catch emails from 5 July" → call list_emails with query: "after:${currentYear}/07/05 before:${currentYear}/07/06"
- User asks "emails on March 15th" → call list_emails with query: "after:${currentYear}/03/15 before:${currentYear}/03/16"
- When the user asks for emails from a person (e.g. "Marie"), always search emails with query: "from:Marie". Try different variations of the name until you find the correct person. Then confirm with the user that this is the correct person before continuing with the precise query.
- User asks about specific email → call get_email_details with emailId
- User wants to send email → call send_email
- User wants to mark email → call mark_email_read  
- User wants to delete email → call delete_email

📅 MANDATORY CALENDAR TOOL USAGE:
- ANY question about calendar/events → IMMEDIATELY call list_events
- User asks "what's on my calendar" → call list_events
- User asks "what are my upcoming events" → call list_events
- User asks "what do I have today" → call list_events with timeMax set to end of today
- User asks "what's next week" → call list_events with timeMin/timeMax for next week
- User asks "schedule a meeting" → call create_event (ASK FOR CONFIRMATION FIRST)
- User asks "create an event" → call create_event (ASK FOR CONFIRMATION FIRST) 
- User asks "book a meeting with [person]" → call create_event with attendees (ASK FOR CONFIRMATION FIRST)
- User asks "schedule a call at [time]" → call create_event (ASK FOR CONFIRMATION FIRST)
- User asks "cancel my [event]" → call delete_event (ASK FOR CONFIRMATION FIRST)
- User asks "move my meeting" → call update_event (ASK FOR CONFIRMATION FIRST)
- User asks "find my meeting about [topic]" → call search_events with query
- User asks about specific event → call get_event_details with eventId

👤 SELF-PROFILE ACCESS:
If the user asks questions like "What do you know about me?", "Show my profile", "Describe my writing style", etc. → FIRST call **get_user_profile** (no arguments), then answer using that data. It is allowed to share the stored profile with the user.

🚨 CRITICAL: ANY mention of specific dates (like "July 5", "5 July", "March 15th", etc.) MUST trigger appropriate list_emails or list_events with proper date parameters!

🔥 AVAILABLE MCP TOOLS:
${tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

⚡ RESPONSE RULES:
1. BEFORE discussing ANY emails → Call list_emails first
2. NEVER say "you have 3 emails from..." without calling list_emails first
3. NEVER describe email subjects, senders, or content without tool data
4. ALWAYS wait for tool results before responding about emails
5. If a tool call fails, say "I couldn't access your emails" - don't make up data

🎯 WORKFLOW:
1. User mentions emails → STOP → Call appropriate tool → Wait for results → Then respond
2. ALWAYS use real data from tool responses
3. NEVER invent email IDs, subjects, senders, or dates
4. Speak naturally about the REAL email data you receive

📅 DATE QUERY CONVERSION:
When users mention dates, convert to Gmail query syntax:
- "today" → "newer_than:1d"
- "yesterday" → "older_than:1d newer_than:2d"  
- "this week" → "newer_than:7d"
- "last week" → "older_than:7d newer_than:14d"
- "this month" → "newer_than:1m"
- "January 2025" → "after:2025/01/01 before:2025/02/01"
- "after January 15" → "after:2025/01/15"
- "before December 1" → "before:2025/12/01"
- "last 3 days" → "newer_than:3d"
- "July 5th" or "5 July" → "after:${currentYear}/07/05 before:${currentYear}/07/06"
- "emails from July 5" → "after:${currentYear}/07/05 before:${currentYear}/07/06"
- "emails on December 25" → "after:${currentYear}/12/25 before:${currentYear}/12/26"
- "emails from March 15th" → "after:${currentYear}/03/15 before:${currentYear}/03/16"
- "emails from the 10th" → "after:${currentYear}/${currentMonth}/10 before:${currentYear}/${currentMonth}/11"

🔥 IMPORTANT: ANY mention of dates should trigger list_emails with appropriate query parameter!

🛡️ SAFETY:
- Ask for confirmation before sending emails or making changes
- Use actual email IDs from tool responses only
- If unsure which tool to use, call list_emails first`
        }
      };

      console.log('📤 Sending session update with MCP tools:', sessionUpdate);
      console.log('📤 Tools being sent:', openAITools);
      onToolsUpdate(sessionUpdate);
      sessionUpdateSent.current = true;
    }
  }, [connected, tools.length, onToolsUpdate, getToolsForOpenAI, tools]);



  // Reset session update flag when disconnected
  useEffect(() => {
    if (!connected) {
      sessionUpdateSent.current = false;
    }
  }, [connected]);

  const getStatusColor = () => {
    switch (mcpStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'auth_required': return 'bg-orange-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (mcpStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting';
      case 'auth_required': return 'Auth Required';
      case 'error': return 'Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">MCP Gmail Integration</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <span className="text-sm text-gray-600 capitalize">{getStatusText()}</span>
        </div>
      </div>

      {mcpStatus === 'auth_required' && (
        <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-orange-700">Gmail Authentication Required</span>
          </div>
          <p className="text-xs text-orange-600 mt-1">
            Please refresh the page or log in again to authenticate with Gmail
          </p>
        </div>
      )}

      {error && mcpStatus !== 'auth_required' && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">MCP Connection Error</span>
          </div>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      {connected && tools.length > 0 && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700">MCP Connected</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              {tools.length} tools discovered: {tools.map(t => t.name).join(', ')}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Available MCP Tools:</h4>
            <div className="grid grid-cols-2 gap-2">
              {tools.map((tool) => (
                <div key={tool.name} className="bg-gray-50 rounded-md p-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-medium">{tool.name.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{tool.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-yellow-700">Loading MCP Tools...</span>
          </div>
        </div>
      )}


    </div>
  );
}


