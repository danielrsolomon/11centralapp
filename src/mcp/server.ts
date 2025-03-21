import * as http from 'http';
import { z } from 'zod';

// Type definitions for MCP tools
export interface MCPToolSchema {
  properties: Record<string, any>;
  required?: string[];
  type: string;
}

export interface MCPTool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  handler: (params: any) => Promise<MCPResponse>;
}

export interface MCPServerInterface {
  registerTool: (tool: MCPTool) => void;
  getTools: () => MCPTool[];
  start: () => Promise<void>;
  getConfig: () => Readonly<MCPServerConfig>;
}

export interface MCPResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export interface MCPServerConfig {
  port: number;
  cors: boolean;
  name: string;
  description: string;
  models: string[];
  defaultContextLength: number;
  logging: boolean;
}

export class MCPServer implements MCPServerInterface {
  private tools: MCPTool[] = [];
  private server: http.Server;
  private config: MCPServerConfig;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  registerTool(tool: MCPTool): void {
    this.tools.push(tool);
    if (this.config.logging) {
      console.log(`Registered tool: ${tool.name}`);
    }
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  getConfig(): Readonly<MCPServerConfig> {
    return Object.freeze({ ...this.config });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        console.log(`MCP Server started on port ${this.config.port}`);
        resolve();
      });
    });
  }

  private logRequest(req: http.IncomingMessage, body: any) {
    console.log(`[MCP-Supabase] Received request: ${req.method} ${req.url}`);
    console.log(`[MCP-Supabase] Headers: ${JSON.stringify(req.headers)}`);
    console.log(`[MCP-Supabase] Body: ${JSON.stringify(body)}`);
  }

  async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      res.setHeader('Content-Type', 'application/json');

      try {
        let parsedBody;
        try {
          parsedBody = JSON.parse(body);
          this.logRequest(req, parsedBody);
        } catch (err) {
          console.error('Error parsing request body:', err);
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
          return;
        }

        if (parsedBody.prompt !== undefined) {
          console.log('[MCP-Supabase] Detected Cursor-style request');
          res.end(JSON.stringify({ 
            error: 'Cursor-style requests not supported by this MCP. Please use JSON-RPC format.' 
          }));
          return;
        }

        if (parsedBody.jsonrpc === '2.0') {
          const { method, params, id } = parsedBody;
          
          if (method === 'rpc.methodCall') {
            console.log(`[MCP-Supabase] Processing RPC method call with params: ${JSON.stringify(params)}`);
            try {
              const response = await this.handleMethodCall(params);
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                result: response,
                id
              }));
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : String(err);
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: { message: errorMessage },
                id
              }));
            }
          } else if (method === 'tools/list') {
            console.log('[MCP-Supabase] Processing tools/list request');
            const tools = this.getTools().map(tool => ({
              name: tool.name,
              description: tool.description,
              schema: tool.schema ? JSON.stringify(tool.schema) : null
            }));
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              result: { tools },
              id
            }));
          } else if (method === 'tools/call') {
            console.log(`[MCP-Supabase] Processing tools/call request with params: ${JSON.stringify(params)}`);
            if (!params || !params.name) {
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: { message: 'Missing tool name' },
                id
              }));
              return;
            }
            
            const tool = this.findTool(params.name);
            if (!tool) {
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: { message: `Tool '${params.name}' not found` },
                id
              }));
              return;
            }
            
            try {
              const result = await tool.handler(params.arguments || {});
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                result,
                id
              }));
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : String(err);
              console.error(`Error executing ${params.name}:`, err);
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: { message: `Error executing tool: ${errorMessage}` },
                id
              }));
            }
          } else {
            const tool = this.findTool(method);
            if (tool) {
              console.log(`[MCP-Supabase] Processing direct tool call to ${method}`);
              try {
                const result = await tool.handler(params || {});
                res.end(JSON.stringify({
                  jsonrpc: '2.0',
                  result,
                  id
                }));
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.error(`Error executing ${method}:`, err);
                res.end(JSON.stringify({
                  jsonrpc: '2.0',
                  error: { message: `Error executing tool: ${errorMessage}` },
                  id
                }));
              }
            } else {
              console.error(`[MCP-Supabase] Invalid method: ${method}`);
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: { message: `Invalid method: ${method}` },
                id
              }));
            }
          }
        } else {
          console.error('[MCP-Supabase] Invalid request format: not JSON-RPC 2.0');
          res.statusCode = 400;
          res.end(JSON.stringify({ 
            error: 'Invalid request format. Expected JSON-RPC 2.0 format.' 
          }));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Error handling request:', err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: `Internal server error: ${errorMessage}` }));
      }
    });
  }

  private findTool(name: string): MCPTool | undefined {
    return this.tools.find(tool => tool.name === name);
  }

  async handleMethodCall(params: any): Promise<any> {
    const { name, args } = params || {};
    
    if (!name) {
      throw new Error("Function name is required");
    }
    
    const tool = this.findTool(name);
    if (!tool) {
      throw new Error(`Function ${name} not found`);
    }
    
    try {
      const validatedArgs = tool.schema ? tool.schema.parse(args) : args;
      return await tool.handler(validatedArgs);
    } catch (error) {
      console.error(`Error executing ${name}:`, error);
      throw error;
    }
  }
} 