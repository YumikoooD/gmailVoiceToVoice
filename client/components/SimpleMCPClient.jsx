import { useState, useEffect, useMemo, useCallback } from 'react';

export function useSimpleMCPClient() {
  const [tools, setTools] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // First check authentication status
    const checkAuthAndInitialize = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is authenticated
        const authResponse = await fetch('/api/auth/status', {
          credentials: 'include'
        });
        
        if (!authResponse.ok) {
          throw new Error('Failed to check authentication');
        }
        
        const authData = await authResponse.json();
        
        if (!authData.authenticated) {
          if (isMounted) {
            setError('User not authenticated - please log in through the web interface');
            setConnected(false);
            setIsLoading(false);
          }
          return;
        }

        // User is authenticated, now load MCP tools
        const listToolsEndpoint = import.meta.env.DEV ? '/api/mcp/list-tools' : '/api/mcp?action=list-tools';
        const toolsResponse = await fetch(listToolsEndpoint, {
          credentials: 'include'
        });
        
        if (toolsResponse.ok) {
          const data = await toolsResponse.json();
          if (isMounted) {
            setTools(data.tools || []);
            setConnected(true);
            setError(null);
          }
        } else {
          const errorData = await toolsResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load MCP tools');
        }
      } catch (err) {
        console.error('Failed to initialize MCP:', err);
        if (isMounted) {
          setError(err.message);
          setConnected(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuthAndInitialize();

    return () => {
      isMounted = false;
    };
  }, []);

  // Memoize the tools for OpenAI to prevent infinite re-renders
  const toolsForOpenAI = useMemo(() => {
    if (!connected || tools.length === 0) return [];
    
    return tools.map(tool => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }));
  }, [connected, tools]);

  // Memoize the getToolsForOpenAI function to prevent infinite re-renders
  const getToolsForOpenAI = useCallback(() => {
    return toolsForOpenAI;
  }, [toolsForOpenAI]);

  return {
    tools,
    connected,
    error,
    isLoading,
    getToolsForOpenAI
  };
} 