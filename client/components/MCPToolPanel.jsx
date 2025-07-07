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
          instructions: `You are an AI Email Assistant helping the user manage their inbox through voice commands.

🚨 CRITICAL RULE - NEVER VIOLATE THIS:
You MUST use MCP tools for ALL email operations. You are FORBIDDEN from describing, listing, or mentioning ANY email content without first calling the appropriate MCP tool. If you don't call a tool when discussing emails, you are HALLUCINATING and providing false information.

📧 MANDATORY TOOL USAGE:
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
- User asks "emails from John" → first call list_emails with query: "from:john", if a result is found, ask the user "Do you mean John [email]?", confirm the identity, and only then proceed with the accurate query using the confirmed address.
- User asks about specific email → call get_email_details with emailId
- User wants to send email → call send_email
- User wants to mark email → call mark_email_read  
- User wants to delete email → call delete_email

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


