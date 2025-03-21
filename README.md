# E11EVEN Central App

E11EVEN Central App is a comprehensive workforce management platform designed to centralize employee training, communication, scheduling, and gratuity tracking into a single, cohesive system.

## Features

- **E11EVEN University LMS**: Complete learning management system for staff training
- **Connect (Messaging System)**: Real-time messaging and collaboration tool
- **Scheduling System with AI Integration**: AI-enhanced scheduling with automated floorplan assignment
- **Gratuity Tracking System**: Automated tip pooling and distribution
- **Administrative Dashboard**: Centralized management and reporting hub
- **MCP Integration**: Direct AI-to-database communication through Model Context Protocol

## Project Structure

The project follows a clean, modular architecture:

```
/
├── public/              # Static assets
│   ├── favicon.svg      # App favicon
│   └── logo.svg         # App logo
│
├── src/                 # Source code
│   ├── assets/          # Images, fonts, and other assets
│   ├── components/      # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility libraries and functions
│   ├── mcp/             # Model Context Protocol integration
│   │   ├── tools/       # MCP tool implementations
│   │   ├── server.ts    # MCP server implementation
│   │   ├── types.ts     # MCP type definitions 
│   │   └── index.ts     # MCP server initialization
│   ├── pages/           # Page components
│   │   ├── admin/       # Admin pages
│   │   ├── auth/        # Authentication pages
│   │   ├── connect/     # Messaging pages
│   │   ├── gratuity/    # Gratuity tracking pages
│   │   ├── schedule/    # Scheduling pages
│   │   └── university/  # Training pages
│   ├── providers/       # Context providers
│   ├── styles/          # Global styles and CSS
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main App component
│   └── main.tsx         # Application entry point
│
├── documentation/       # Project documentation
├── .cursor/             # Cursor IDE configuration
├── index.html           # HTML entry point
├── package.json         # Dependencies and scripts
├── mcp-supabase/        # Supabase MCP server for database operations
├── mcp-websearch/       # Web Search MCP for Brave Search integration
├── start-mcp-supabase.sh  # Supabase MCP server startup script
├── start-mcp-services.sh  # Combined script to start all MCP services
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## Tech Stack

- **Frontend**: Vite.js, React, TypeScript, Tailwind CSS, Shadcn UI, React Hook Form with Zod
- **Backend**: Supabase for database, authentication, and real-time features
- **Integrations**: OpenAI API for scheduling, Micros Symphony API for POS integration
- **Development**: Cursor IDE with MCP for AI-assisted development

## Getting Started

### Prerequisites

- Node.js (LTS version)
- npm or yarn
- Cursor IDE (for MCP integration)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/e11even-central-app.git
   cd e11even-central-app
   ```

2. Install dependencies:
   ```bash
   npm install
   npm install tsx dotenv # Required for MCP server
   ```

3. Copy the environment template to create your local config:
   ```bash
   cp .env.example .env.local
   ```
   > **Note**: This project exclusively uses `.env.local` for all environment configuration. Other env files (`.env`, `.env.development`) have been consolidated.

4. Edit `.env.local` with your actual credentials and configuration values.
   > **Important**: Ensure `.env.local` includes the following variable mappings for MCP-Supabase server:
   > ```
   > SUPABASE_URL=${VITE_SUPABASE_URL}
   > SUPABASE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
   > ```

5. Make the MCP server script executable:
   ```bash
   chmod +x start-mcp-supabase.sh
   chmod +x start-mcp-services.sh
   chmod +x mcp-websearch/start-websearch-mcp.sh
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open the project in Cursor IDE:
   The MCP server will start automatically when you open the project in Cursor.

8. Open your browser and navigate to:
   ```
   http://localhost:5173/
   ```

## Model Context Protocol (MCP) Integration

This project includes a Model Context Protocol (MCP) server that enables direct communication between Cursor's AI assistant (Claude) and the project's Supabase database. This integration dramatically accelerates development by allowing the AI to:

1. Read and write data directly to the database
2. Interact with the E11EVEN University LMS
3. Send and receive messages in the chat system
4. Perform database operations with proper authentication

### Available MCP Tools

The MCP server exposes the following tools that Claude can use:

#### Supabase Core Tools
- `queryTable`: Query data from any table with filters and sorting
- `getTableSchema`: Get schema information for tables
- `listTables`: List all tables in the database
- `insertRecord`: Insert new records
- `updateRecord`: Update existing records
- `deleteRecord`: Delete records

#### University/LMS Tools
- `getPrograms`: Get training programs
- `createProgram`: Create new programs
- `getCourses`: Get courses from a program
- `createCourse`: Create new courses
- `getUserProgress`: Get a user's training progress
- `updateProgress`: Update progress in modules/lessons

#### Chat Tools
- `getChatRooms`: Get available chat rooms
- `createChatRoom`: Create new chat rooms
- `getChatMessages`: Get messages from a chat room
- `sendChatMessage`: Send messages to a chat room

### Usage with Cursor

When working with Cursor, you can use natural language to ask Claude to interact with the database:

- "Show me all programs in the University LMS"
- "Create a new chat room called 'Marketing Team' with description 'For marketing team discussions'"
- "Query the users table for all users in the 'Bar Staff' department"
- "Update the status of course with ID '123' to published"

Claude will use the appropriate MCP tools to execute these operations directly on your Supabase database.

### Manual MCP Server Operation

If needed, you can manually start the MCP server:

```bash
# Start in stdio mode (for Cursor integration)
./start-mcp-supabase.sh

# Start in HTTP mode on port 8000 (for remote access)
./start-mcp-supabase.sh 8000
```

For more detailed information about the MCP integration, see [README-MCP.md](./README-MCP.md).

## Development

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and configure environment variables
4. Start the development server: `npm run dev`

### API Server

The project includes a dedicated API server for handling backend operations. The API server:

- Runs on port 3001 by default
- Provides authentication and data access endpoints
- Integrates with Supabase for data storage and auth
- Is proxied through the Vite development server at `/api/*`

**Starting the API Server:**

```bash
# Start the API server
npm run api:start

# In a separate terminal, start the frontend
npm run dev
```

### Troubleshooting

If you encounter issues with the application, check the following:

1. **API Server Connection**
   - Ensure the API server is running on port 3001
   - Verify the API is accessible via `http://localhost:3001/api/health`
   - Check that the frontend is correctly proxying API requests

2. **Authentication Issues** 
   - If the app is stuck on a loading screen, check browser console for auth errors
   - Try clearing your browser cache and localStorage
   - Verify that Supabase environment variables are correctly set
   - The app includes timeout handling to prevent infinite loading states

3. **Blank Screen Issues**
   - Check the browser console for any JavaScript errors
   - Verify that styles are loading correctly
   - The app includes an ErrorBoundary that should display detailed error information

For detailed troubleshooting steps, see [TROUBLESHOOTING.md](./documentation/api/TROUBLESHOOTING.md).

### MCP-Supabase Integration

This project uses MCP-Supabase for enhanced database access and management.

**Starting the MCP-Supabase Server:**

```bash
# Make the script executable (first time only)
chmod +x start-mcp-supabase.sh

# Start the MCP-Supabase server
./start-mcp-supabase.sh

# In a separate terminal, start the development server
npm run dev
```

For detailed instructions, see the [MCP-Supabase Guide](./documentation/mcp/mcp_supabase_guide.md).

## Path Aliases

The project uses path aliases for cleaner imports:

- `@/*` - src directory
- `@components/*` - components directory
- `@pages/*` - pages directory
- `@hooks/*` - hooks directory
- `@lib/*` - lib directory
- `@utils/*` - utils directory
- `@styles/*` - styles directory
- `@assets/*` - assets directory
- `@providers/*` - providers directory
- `@types/*` - types directory

Example usage:
```tsx
import { Button } from '@components/ui/Button';
import { useAuth } from '@hooks/useAuth';
```

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Running the MCP Servers

To start the Supabase MCP server for database operations:

```bash
./start-mcp-supabase.sh
```

You can specify a custom port if needed:

```bash
./start-mcp-supabase.sh 8000
```

To start the Web Search MCP server:

```bash
cd mcp-websearch
./start-websearch-mcp.sh
```

To start both MCP servers at once:

```bash
./start-mcp-services.sh
```

## MCP Servers

E11EVEN Central App includes two MCP (Model Completion Protocol) servers that enhance AI capabilities:

### MCP-Supabase
- **Purpose**: Provides database access to Claude 3.7 Sonnet in Cursor.ai
- **Port**: 8000
- **Start**: `./start-mcp-supabase.sh`
- **Test**: `node test-mcp-supabase-improved.js`
- **Location**: `src/mcp/`

### MCP-WebSearch
- **Purpose**: Enables web search via Brave Search API
- **Port**: 8100
- **Start**: `cd mcp-websearch && npm start`
- **Test**: `cd mcp-websearch && node test-search.js "your search query"`
- **Location**: `mcp-websearch/`

We follow a consistent port numbering scheme for all MCPs: 8000, 8100, 8200, etc.

For detailed information about MCP servers, see [MCP_README.md](./MCP_README.md)

## API Server

The E11EVEN Central app includes a robust API server built on Express and TypeScript. The API server provides all the backend functionality needed by the frontend application.

### Running the API Server

The E11EVEN Central app consists of two main parts:
1. The frontend application (Vite + React)
2. The API server (Express + TypeScript)

### API Server

To start the API server in development mode:

```bash
# Method 1: Using the helper script (recommended)
npm run api:start

# Method 2: Using ts-node-esm directly
npm run dev:api

# Method 3: For production (after building)
npm run build:api
npm run api:start:prod
```

The API server runs on port 3001 by default (can be configured in .env.local) and serves the REST API endpoints needed by the frontend.

### Frontend Application

To start the frontend development server:

```bash
npm run dev
```

The frontend runs on port 5174 by default and proxies API requests to the API server.

### Running Both Together

For convenience, you can start both the frontend and API server together:

```bash
npm run dev:all
```

This command uses concurrently to run both servers in the same terminal window.

### Troubleshooting

If you encounter any issues with the API server:

1. Check that the API server is running on port 3001 (`npm run api:start`)
2. Verify that your `.env.local` file has the correct environment variables
3. If you see module resolution errors, make sure you have the latest code with ESM fixes
4. If you experience a white screen in the frontend:
   - Check for PostCSS configuration errors. If using CommonJS syntax with the `"type": "module"` in package.json, rename configuration files to use `.cjs` extension (e.g., `postcss.config.cjs`)
   - Open browser developer tools to look for errors in the console
   - Verify that all shadcn/ui components are correctly imported and created using the shadcn CLI (e.g., `npx shadcn@latest add card`)
   - Check that the API server port (3001) matches the port in the Vite proxy configuration
   - Add debug components with inline styles to make issues more visible
   - For more detailed solutions, refer to [API Troubleshooting](./documentation/api/TROUBLESHOOTING.md)

## Environment Configuration

### Important Note on Environment Variables

This project requires explicit environment variable values. Variable substitution using `${...}` syntax does not work reliably in this environment.

When setting up your `.env.local` file:

```bash
# INCORRECT - This will not work
SUPABASE_URL=${VITE_SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# CORRECT - Use explicit values
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_URL=https://your-project.supabase.co

SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_KEY=your-service-role-key
```

This is particularly important for the Supabase configuration, as both the frontend (VITE_*) and MCP servers (SUPABASE_*) need access to these values.

### Enhanced Environment Variable Processing

The project now includes enhanced environment variable handling with dotenv-expand for variable substitution support. While explicit values are still recommended, the system now attempts to handle variable substitution more gracefully.

#### Environment Variable Diagnostics

When the API server starts, it performs detailed diagnostics of the environment configuration:

1. Checks for the existence of critical environment variables
2. Detects unresolved variable substitution patterns
3. Provides specific troubleshooting recommendations for configuration issues

If you encounter environment-related errors, the API server will display detailed diagnostic information and suggestions.

### Testing Environment Configuration

The project includes a test script to validate environment variable loading:

```bash
node scripts/test-env-loading.js
```

This script:
- Creates a test environment file with variable substitution
- Tests basic environment loading
- Tests variable substitution with dotenv-expand
- Tests your actual application environment files
- Provides detailed recommendations based on test results

Use this script to verify that your environment configuration is working correctly before starting the application.

## Quick Start

1. Copy the environment template to create your local config:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` with your actual credentials and configuration values, using explicit values (not variable substitution).

3. Run both the frontend and API server concurrently:
   ```bash
   npm run dev:all
   ```

4. Or run only the API server in development mode:
   ```bash
   npm run dev:api
   ```

5. For production, build and run the API server:
   ```bash
   npm run build:api
   npm run start:api
   ```

> **Note**: The API server and MCP servers will load environment variables from `.env.local`. The project no longer uses multiple environment files (.env, .env.development, etc.). For local development, always use `.env.local` to prevent accidental commits of sensitive information.

### Authentication System

The application uses Supabase Authentication for secure user management:

- **JWT-based Authentication**: Secure token-based authentication
- **Server-side Session Management**: Sessions are stored and managed on the server
- **Protected API Endpoints**: Routes require valid authentication tokens
- **Comprehensive Testing**: Unit and integration tests for the auth system

To learn more about the authentication flow, see [Authentication Flow Documentation](documentation/api/AUTHENTICATION_FLOW.md).

### Testing

The project includes comprehensive testing:

- **Unit Tests**: Test individual components and utilities
- **Integration Tests**: Verify API endpoints and services
- **Authentication Tests**: Validate the authentication flow

To run authentication tests:
```bash
# Run all authentication tests
npm run test:auth

# Run only session management unit tests
npm run test:auth:unit

# Run only authentication flow integration tests
npm run test:auth:integration
```
