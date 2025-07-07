import { useState, useEffect, useCallback, useRef } from 'react';
import { useSimpleMCPClient } from './SimpleMCPClient';
import { Mail, Check, X, Send, Trash2, AlertCircle } from 'react-feather';

export default function MCPToolPanel({ 
  onToolsUpdate, 
  summary, 
  emails, 
  lastAction 
}) {
  const { tools, connected, error, isLoading, authChecked, getToolsForOpenAI } = useSimpleMCPClient();
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

CRITICAL: You are now using MCP (Model Context Protocol) for Gmail integration. ALL email operations must use MCP tools.

AVAILABLE MCP TOOLS:
${tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

WORKFLOW:
1. When user asks about emails → call list_emails tool
2. When user asks to read specific email → call get_email_details tool 
3. When user asks to send email → call send_email tool
4. When user asks to mark email → call mark_email_read tool
5. When user asks to delete email → call delete_email tool

IMPORTANT RULES:
- NEVER make up email content, IDs, or data
- ALWAYS use MCP tools to get real email information
- ALWAYS confirm actions before executing them
- Provide clear feedback after each tool call
- Use actual email IDs from tool responses, never invent them

Your key responsibilities:
1. Use MCP tools to get REAL email data
2. Read emails aloud with proper emphasis
3. Draft replies based on actual email content
4. Handle email organization using MCP tools
5. Provide clear confirmations of all actions

Always prioritize accuracy and ask for confirmation before sending emails or making changes.`
        }
      };

      console.log('Sending session update with MCP tools:', sessionUpdate);
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

      {summary && <EmailSummary summary={summary} emails={emails} />}
      {lastAction && <EmailAction action={lastAction.action} result={lastAction.result} />}
    </div>
  );
}

function EmailSummary({ summary, emails }) {
  return summary ? (
    <div className="flex flex-col gap-3">
      <div className="bg-blue-50 p-3 rounded-md">
        <h3 className="font-semibold text-blue-800 mb-2">📧 Inbox Summary</h3>
        <p className="text-sm text-blue-700">{summary.summary}</p>
        <div className="flex gap-4 mt-2 text-xs text-blue-600">
          <span>📬 Total: {summary.totalCount}</span>
          <span>📭 Unread: {summary.unreadCount}</span>
          <span>📰 Read: {summary.totalCount - summary.unreadCount}</span>
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
  ) : null;
}

function EmailAction({ action, result }) {
  const icons = {
    send_email: Send,
    mark_email_read: Check,
    delete_email: Trash2,
    list_emails: Mail,
    get_email_details: Mail
  };
  
  const Icon = icons[action] || Mail;
  
  return (
    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
      <Icon size={16} className="text-green-600" />
      <span className="text-sm text-green-700">
        {action.replace('_', ' ')} completed via MCP
      </span>
    </div>
  );
}
