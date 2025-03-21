// MCP Protocol Types
export type MCPRequest = {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: object;
};

export type MCPResponse = {
  jsonrpc: "2.0";
  id: number | string;
  result?: object;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

export type MCPToolContentPart = {
  type: "text" | "image" | "resource";
  text?: string;
  url?: string;
  mime_type?: string;
};

export type MCPToolResult = {
  content: MCPToolContentPart[];
  isError?: boolean;
};

export type MCPToolDefinition = {
  name: string;
  description: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
};

export type MCPToolHandler = (args: any) => Promise<MCPToolResult>;

export type MCPTool = MCPToolDefinition & {
  handler: MCPToolHandler;
}; 