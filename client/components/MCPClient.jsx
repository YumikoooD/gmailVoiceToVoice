import { useState, useEffect } from 'react';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPClient {
  constructor() {
    this.client = null;
    this.transport = null;
    this.tools = [];
    this.connected = false;
  }

  async connect() {
    if (this.connected) return;

    try {
      // Create stdio transport for MCP communication
      this.transport = new StdioClientTransport({
        command: 'node',
        args: ['/Users/yumikooo/project/Email-AI-Voice/mcp-gmail-server.js'],
        cwd: '/Users/yumikooo/project/Email-AI-Voice'
      });

      this.client = new Client({
        name: 'email-ai-voice-client',
        version: '1.0.0',
      }, {
        capabilities: {
          tools: {},
        },
      });

      await this.client.connect(this.transport);
      this.connected = true;
      
      // Discover available tools
      await this.discoverTools();
      
      console.log('Connected to MCP server with tools:', this.tools);
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      throw error;
    }
  }

  async discoverTools() {
    if (!this.client) return;

    try {
      const response = await this.client.request({
        method: 'tools/list',
        params: {}
      });

      this.tools = response.tools || [];
      return this.tools;
    } catch (error) {
      console.error('Failed to discover tools:', error);
      return [];
    }
  }

  async callTool(name, args) {
    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      const response = await this.client.request({
        method: 'tools/call',
        params: {
          name,
          arguments: args
        }
      });

      return response;
    } catch (error) {
      console.error(`Failed to call tool ${name}:`, error);
      throw error;
    }
  }

  getToolSchema(toolName) {
    const tool = this.tools.find(t => t.name === toolName);
    return tool ? tool.inputSchema : null;
  }

  getToolsForOpenAI() {
    return this.tools.map(tool => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }));
  }

  disconnect() {
    if (this.transport) {
      this.transport.close();
      this.transport = null;
    }
    this.client = null;
    this.connected = false;
  }
}

// React hook for using MCP client
export function useMCPClient() {
  const [mcpClient, setMcpClient] = useState(null);
  const [tools, setTools] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const client = new MCPClient();
    
    const connectToMCP = async () => {
      try {
        await client.connect();
        setMcpClient(client);
        setTools(client.tools);
        setConnected(true);
      } catch (err) {
        console.error('Failed to connect to MCP:', err);
        setError(err.message);
      }
    };

    connectToMCP();

    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, []);

  const callTool = async (name, args) => {
    if (!mcpClient) {
      throw new Error('MCP client not connected');
    }
    return await mcpClient.callTool(name, args);
  };

  const getToolsForOpenAI = () => {
    return mcpClient ? mcpClient.getToolsForOpenAI() : [];
  };

  return {
    mcpClient,
    tools,
    connected,
    error,
    callTool,
    getToolsForOpenAI
  };
} 