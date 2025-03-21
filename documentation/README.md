# E11EVEN Central App Documentation

<!-- 
  This document serves as the central index for all documentation related to the E11EVEN Central App.
  
  Last Updated: 2024-05-23
-->

This document serves as the main index for all documentation related to the E11EVEN Central App. It provides links to various documentation files organized by category.

## Quick Start

- [Startup Checklist](./STARTUP_CHECKLIST.md) - Quick start guide for new developers
- [Feature Flags](./FEATURE_FLAGS.md) - Feature flags explanation for the whole project

## Core Architecture & Design

- [Architecture Overview](./project/ARCHITECTURE_OVERVIEW.md) - Comprehensive overview of the application architecture including frontend, backend, service layer, and API routes
- [Service Layer Architecture](./frontend/service_layer_usage.md) - Guide for using the service layer pattern to interact with the backend API
- [Documentation Cleanup Summary](./DOCUMENTATION_CLEANUP_SUMMARY.md) - Summary of the documentation cleanup and reorganization effort
- [Documentation Restructure Summary](./DOCUMENTATION_RESTRUCTURE_SUMMARY.md) - Summary of the documentation restructuring with merged files and new organization

## API Documentation

- [API Documentation](./api/API_DOCUMENTATION.md) - Comprehensive guide to the API endpoints, request/response formats, and usage examples. Recently updated with service layer implementation details, performance optimizations for the university module, progress tracking updates, and thumbnail handling.
- [Authentication Flow](./api/AUTHENTICATION_FLOW.md) - Detailed documentation of the authentication system architecture and flow
- [Authentication Troubleshooting](./api/AUTH_TROUBLESHOOTING.md) - Solutions for common authentication-related issues
- [Express TypeScript Guide](./api/EXPRESS_TYPESCRIPT_GUIDE.md) - Guide for handling TypeScript compatibility issues with Express
- [Troubleshooting Guide](./api/TROUBLESHOOTING.md) - Solutions for common API-related issues
- [TypeScript Fix Report](./api/TYPESCRIPT_FIX_REPORT.md) - Report on TypeScript compatibility fixes
- [Test Users](./api/TEST_USERS.md) - Information about test user accounts

## Supabase Integration

- [Supabase Integration](./supabase/SUPABASE_INTEGRATION.md) - Comprehensive guide to Supabase implementation including authentication, database, storage, and realtime features
- [Supabase Integration Report](./supabase/SUPABASE_INTEGRATION_REPORT.md) - Consolidated report on Supabase integration, audit findings, and API-first architecture implementation

## Frontend Implementation

- [Frontend Guidelines](./frontend/frontend_guidelines_document.md) - Standards and best practices for frontend development
- [Legacy Components](./frontend/legacy_components.md) - Documentation for remaining legacy components and migration plans
- [Dialog Implementation Fixes](./frontend/dialog_implementation_fixes.md) - Solutions for dialog-related UI issues and implementation details

## Developer Guidelines

- [API Integration](./dev/api_integration.md) - Guide for integrating with the API from frontend components
- [Error Handling](./dev/error_handling.md) - Strategies and patterns for error handling across the application

## Project Management

- [Pending Tasks](./project/pending_tasks.md) - Tracking document for pending development tasks and priorities
- [Tech Stack](./project/tech_stack_document.md) - Overview of the technology stack used in the application

## MCP Tooling

- [MCP Guide](./mcp/mcp_guide.md) - Main guide to MCP (Machine Control Protocol) tooling for enhanced development workflow
- [MCP Supabase Guide](./mcp/mcp_supabase_guide.md) - Specific guidance for using MCP with Supabase
- [MCP WebSearch Guide](./mcp/mcp_websearch_guide.md) - Guide for using MCP with web search functionality

## Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| README (Main Index) | Current | 2024-05-23 |
| Documentation Cleanup Summary | Current | 2024-05-23 |
| Documentation Restructure Summary | Current | 2024-05-23 |
| Architecture Overview | Current | 2024-05-15 |
| Service Layer Usage | Current | 2024-05-22 |
| API Documentation | Current | 2024-05-22 |
| Authentication Flow | Current | 2024-05-25 |
| Authentication Troubleshooting | Current | 2024-05-25 |
| Express TypeScript Guide | Current | 2024-05-20 |
| Supabase Integration | Current | 2024-05-22 |
| Supabase Integration Report | Current | 2024-05-23 |
| Frontend Guidelines | Current | 2024-03-17 |
| Legacy Components | Current | 2024-03-17 |
| Dialog Implementation Fixes | Current | 2024-03-17 |
| API Integration | Current | 2024-03-17 |
| Error Handling | Current | 2024-03-17 |
| Feature Flags | Current | 2024-05-22 |
| Startup Checklist | Current | 2024-05-22 |
| Pending Tasks | Current | 2024-03-16 |
| MCP Guide | Current | 2024-03-16 |
| MCP Supabase Guide | Current | 2024-03-16 |
| MCP WebSearch Guide | Current | 2024-03-16 |

**Note about deprecated documentation**: All files in the `./old/` directory are considered deprecated and may contain outdated information. The information from these files has been incorporated into the current documentation files listed in this index. If you find information in the deprecated folders that isn't in the current documentation, please report it to the documentation team.

## Documentation Structure

The documentation follows this structure:
- **documentation/** - Root directory containing high-level docs and this index
  - **api/** - API-specific documentation
  - **dev/** - Developer guidelines and best practices
  - **frontend/** - Frontend implementation details
  - **mcp/** - MCP tooling documentation
  - **project/** - Project architecture and planning
  - **supabase/** - Supabase integration documentation
    - **examples/** - Example code for Supabase integration
    - **sql/** - SQL scripts and database schema
  - **old/** - Archived documentation files

## Additional Resources

- [Supabase Documentation](https://supabase.io/docs)
- [Vite Documentation](https://vitejs.dev/guide/)
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

**Note**: All documentation should be kept up-to-date as the project evolves. If you find any discrepancies or outdated information, please update the relevant documents or notify the documentation team.

## Recent Documentation Changes

A recent documentation cleanup and reorganization has:

1. Consolidated Supabase-related documentation into a comprehensive report
2. Moved redundant files to the old directory
3. Restructured the documentation to follow a more intuitive organization
4. Renamed the main index to README.md for better discoverability

## Previously Consolidated Documentation

The following documents have been previously merged into consolidated files:

1. **API Documentation**: The following files have been merged into [API_DOCUMENTATION.md](./api/API_DOCUMENTATION.md):
   - API_ROUTES.md
   - API_ROUTES_SUMMARY.md
   - API_PROGRESS_SUMMARY.md

2. **Supabase Integration**: The following files have been merged into [SUPABASE_INTEGRATION.md](./supabase/SUPABASE_INTEGRATION.md):
   - supabase_implementation_guide.md
   - supabase_realtime.md
   - supabase_testing_guide.md
   - supabase_rls_policies.md

3. **Supabase Integration Report**: The following files have been merged into [SUPABASE_INTEGRATION_REPORT.md](./supabase/SUPABASE_INTEGRATION_REPORT.md):
   - SUPABASE_INTEGRATION_AUDIT_REPORT.md 
   - DOCUMENTATION_ALIGNMENT_REPORT.md
   - CONCLUSION.md

4. **Architecture Overview**: The architecture information has been consolidated into [ARCHITECTURE_OVERVIEW.md](./project/ARCHITECTURE_OVERVIEW.md)
   - backend_structure_document.md
   - Various architecture sections from other documents 