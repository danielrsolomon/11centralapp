# MCP (Machine Control Protocol) Documentation

This directory contains documentation related to the Machine Control Protocol (MCP) tooling used to enhance the development workflow in the E11EVEN Central App.

## Contents

| File | Description | Last Updated |
|------|-------------|--------------|
| [mcp_guide.md](./mcp_guide.md) | Main guide to MCP tooling for enhanced development workflow | 2024-03-16 |
| [mcp_supabase_guide.md](./mcp_supabase_guide.md) | Specific guidance for using MCP with Supabase (runs on port 8000) | 2024-03-16 |
| [mcp_websearch_guide.md](./mcp_websearch_guide.md) | Guide for using MCP with web search functionality (runs on port 8100) | 2024-03-16 |
| [MCP_DOCUMENTATION.md](./MCP_DOCUMENTATION.md) | Consolidated documentation for all MCP functionality | 2024-05-24 |

## Key Concepts

- **Automation Tooling**: Tools to automate routine development tasks
- **Supabase Integration**: Special MCP features for working with Supabase
- **Web Search Integration**: Using MCP with web search functionality
- **Workflow Enhancement**: Improving development efficiency through automation

## Related Documentation

- [API Documentation](../api/API_DOCUMENTATION.md)
- [Supabase Integration](../supabase/SUPABASE_INTEGRATION.md)

## Getting Started

If you're new to using MCP, start with [mcp_guide.md](./mcp_guide.md) for a general overview of the tooling, then refer to the specific guides for Supabase and Web Search integration if needed.

## Note

These guides are being consolidated into a single comprehensive MCP_DOCUMENTATION.md file. Please see that file for the most up-to-date information.

### Port Assignments

The MCP servers are configured to run on the following ports:

- **MCP-Supabase**: Port 8000
- **MCP-WebSearch**: Port 8100
- **Future MCPs**: Ports 8200, 8300, etc., as needed

These port assignments are configured in the `.env.local` file at the project root.

### Environment Configuration

The MCP-Supabase server requires specific environment variables to function properly. Ensure your `.env.local` file contains the following:

```
# Standard Supabase variables used by the application
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Variable mappings required for MCP-Supabase server
SUPABASE_URL=${VITE_SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# MCP port configuration
MCP_SUPABASE_PORT=8000
MCP_WEBSEARCH_PORT=8100
```

> **Note**: The variable mappings are required because the MCP-Supabase server expects `SUPABASE_URL` and `SUPABASE_KEY`, while the application uses `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-05-25 | 1.1.0 | Updated with environment variable mappings for MCP-Supabase | Documentation Team |
| 2024-05-24 | 1.0.0 | Created README for MCP documentation directory | Documentation Team |

Last Updated: 2024-05-25 | Version: 1.1.0 | Updated By: Documentation Team 