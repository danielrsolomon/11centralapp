# E11EVEN Central API Troubleshooting Guide

## Common Issues and Solutions

### API Server Startup Issues

1. **Unknown file extension '.ts' Error**
   - **Issue**: When running the API server, you may encounter `Unknown file extension '.ts'` error.
   - **Solution**: 
     - Set `"type": "module"` in package.json
     - Use `tsx` instead of `ts-node-esm` to run TypeScript files in ESM mode
     - Run the API server with `npm run api:start` which uses the configured startup script

2. **Body-parser Import Error**
   - **Issue**: `The requested module 'body-parser' does not provide an export named 'json'`
   - **Solution**: Use the full import instead:
     ```typescript
     // Instead of:
     import { json, urlencoded } from 'body-parser';
     
     // Use:
     import bodyParser from 'body-parser';
     app.use(bodyParser.json());
     app.use(bodyParser.urlencoded({ extended: true }));
     ```

3. **Module Not Found Errors**
   - **Issue**: When using ESM, relative imports may fail with "Cannot find module"
   - **Solution**: Add the `.js` extension to all local imports in TypeScript files
     ```typescript
     // Instead of:
     import { foo } from './bar';
     
     // Use:
     import { foo } from './bar.js';
     ```

4. **Port Already in Use Error**
   - **Issue**: `Error: listen EADDRINUSE: address already in use :::3001`
   - **Solution**:
     - Check which process is using the port: `lsof -i :3001`
     - Kill the process: `kill -9 <PID>`
     - Update the API server port in `.env.local` if needed: change `PORT=3001` to another port like `PORT=3002`
     - Update the API URL in `.env.local` to match: change `VITE_API_URL=http://localhost:3001` to `VITE_API_URL=http://localhost:3002`
     - Update the Vite proxy configuration in `vite.config.ts` to point to the new port
     - Make sure the startup script respects the PORT environment variable by modifying `start-api-server.js`

### Restarting from Scratch

If you're experiencing persistent authentication issues, networking problems, or undefined behavior, a full system restart can often resolve the issues. Follow these steps in order:

1. **Kill All Running Processes**
   ```bash
   # Check for processes using relevant ports
   lsof -i :3001  # API server port
   lsof -i :5173  # Potential Vite dev server port
   lsof -i :5174  # Potential Vite dev server port
   lsof -i :5175  # Potential Vite dev server port
   
   # Kill the processes if found
   kill -9 <PID>
   ```

2. **Clear Browser Cache and Storage**
   - Open your browser's Developer Tools (F12)
   - Go to Application tab → Storage → Local Storage
   - Delete items with keys containing 'auth' or 'supabase'
   - Alternatively, run this in the browser console:
     ```javascript
     Object.keys(localStorage)
       .filter(key => key.includes('auth') || key.includes('supabase'))
       .forEach(key => localStorage.removeItem(key));
     ```

3. **Verify Environment Variables**
   - Check that `.env.local` exists and contains the correct values
   - Required variables:
     ```
     VITE_API_URL=http://localhost:3002
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```

4. **Start API Server in a Fresh Terminal**
   ```bash
   # Navigate to the project root
   cd /path/to/project
   
   # Start the API server
   npm run api:start
   ```
   - Verify the API server is running by checking for the message: "API server listening on port 3002"
   - Test API health endpoint:
     ```bash
     curl http://localhost:3002/api/health
     ```
   - Expected response: JSON with status "ok"

5. **Start Frontend in a Separate Terminal**
   ```bash
   # Navigate to the project root in a new terminal
   cd /path/to/project
   
   # Start the frontend
   npm run dev
   ```
   - Note the local URL (e.g., http://localhost:5174) and open it in a fresh browser window

6. **Verify API Connectivity**
   - Open DevTools (F12) → Console
   - Check for API connection messages
   - Look for any error messages related to API connectivity

7. **Test Authentication**
   - Try logging in with a test user first if available
   - Monitor the Network tab in DevTools for auth requests
   - Watch both terminal windows for server-side logs

### Testing Specific Components

If after restarting you still experience authentication issues, you can test specific components of the system:

1. **API Server Only**
   ```bash
   # Start only the API server
   npm run api:start
   
   # In a different terminal, test the health endpoint
   curl http://localhost:3002/api/health
   ```

2. **Supabase Connection Only**
   - Use the SupabaseTest component (available at `/supabase-test` route)
   - Click the "Test Supabase Connection" button
   - Check browser console for detailed logs

3. **Frontend Proxy Only**
   ```bash
   # Start the frontend but not the API
   npm run dev
   
   # Check browser console for proxy-related errors
   # You should see errors about failing to connect to the API
   ```

### Frontend Configuration Issues

1. **PostCSS Configuration Error**
   - **Issue**: `Failed to load PostCSS config: module is not defined in ES module scope`
   - **Solution**: 
     - Rename `postcss.config.js` to `postcss.config.cjs` to use CommonJS syntax with ES modules
     - This ensures compatibility between the ESM setup in package.json and the CommonJS syntax in PostCSS config
     - Run `mv postcss.config.js postcss.config.cjs` to rename the file

2. **Other CommonJS Configuration Files**
   - **Issue**: Similar errors may occur with other configuration files when `"type": "module"` is set in package.json
   - **Solution**: 
     - Rename configuration files with CommonJS syntax to use the `.cjs` extension
     - Files that commonly need this change: `.eslintrc.js`, `babel.config.js`, `jest.config.js`

### Frontend Blank Screen Issues

1. **White Screen with No Console Errors**
   - **Issue**: Frontend displays a blank white screen with no visible errors
   - **Solution**:
     - Add debug console logs in the main React initialization (src/main.tsx)
     - Implement a fallback UI component to show basic loading information
     - Check that the API server is accessible via /api/health endpoint
     - Add the debug components to display API connection status
     - Make sure all UI components exist and are properly imported (e.g., Card, Button components)
     - Add emergency fallback components with inline styles to ensure visibility regardless of CSS issues
     - Check that Vite proxy configuration in vite.config.ts is pointing to the correct API port

2. **React Error Boundary Not Catching Issues**
   - **Issue**: React errors occur but aren't visible in the UI
   - **Solution**:
     - Add a more comprehensive ErrorBoundary implementation
     - Add explicit try/catch blocks in key initialization points
     - Use console.log/error statements to track component lifecycles
     - Make sure the ErrorBoundary component provides clear fallback UI

3. **Missing UI Components**
   - **Issue**: Component imports fail due to missing UI library components
   - **Solution**:
     - Ensure all required shadcn/ui components are properly created in src/components/ui/
     - Check for import path issues (e.g., using @/ alias without proper configuration)
     - Verify the cn utility function exists in src/lib/utils.ts
     - Review package.json for missing dependencies related to UI components
     - Use the shadcn CLI to add missing components: `npx shadcn@latest add <component>`

4. **API Proxy Configuration Issues**
   - **Issue**: Frontend cannot connect to the API due to proxy configuration issues
   - **Solution**:
     - Verify that the Vite server port and API port are correctly configured and not in conflict
     - Make sure the proxy target URL matches the API server's port (e.g., http://localhost:3002)
     - Check for CORS issues in the browser's network tab
     - Add robust error handling for API requests with explicit logging
     - Ensure the API endpoints return the expected format (e.g., return empty arrays instead of 404 errors)

5. **CSS Loading Issues**
   - **Issue**: CSS files fail to load or apply, resulting in unstyled components
   - **Solution**:
     - Use inline styles as a fallback for critical UI components
     - Add visible debug components that don't rely on external CSS
     - Check the Network tab in browser dev tools to verify CSS file loading
     - Ensure you're properly importing the CSS in your entry file (e.g., src/main.tsx -> './styles/index.css')
     - For shadcn components, verify the Tailwind configuration is correctly set up

6. **React Not Available Error**
   - **Issue**: Error message "React is not available" appears in console
   - **Solution**:
     - Modern React applications don't expose React as a global variable (window.React)
     - Remove any code that checks for window.React and rely on ES module imports instead
     - Ensure all components import React properly: `import React from 'react'`
     - For code that needs to check if React is loaded, verify component mounting state instead of global variables

### Content Security Policy (CSP) Issues

1. **Content Security Policy Configuration**
   - **Issue**: CSP errors like "Refused to execute inline script because it violates the following Content Security Policy directive..." or "Uncaught EvalError: Refused to evaluate a string as JavaScript" or "Refused to connect because it violates the following Content Security Policy directive: 'connect-src...'"
   - **Solution**:
     - The application uses different CSP configurations for development and production:
     
     **Development CSP** (more permissive to allow HMR and debugging):
     ```
     default-src 'self'; 
     script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
     connect-src 'self' ws: wss: https://vzykvoyanfijphtvmgtu.supabase.co; 
     img-src 'self' data:; 
     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
     font-src 'self' https://fonts.gstatic.com;
     ```
     
     **Production CSP** (more strict for security):
     ```
     default-src 'self'; 
     script-src 'self'; 
     connect-src 'self' https://vzykvoyanfijphtvmgtu.supabase.co; 
     img-src 'self' data:; 
     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
     font-src 'self' https://fonts.gstatic.com;
     ```
     
     **Important**: The Supabase domain (https://vzykvoyanfijphtvmgtu.supabase.co) must be included in the connect-src directive to allow authentication API calls. If you're using a different Supabase project, you'll need to update this URL in the CSP configuration.

2. **CSP Violation Debugging**
   - **Issue**: Need to identify which scripts or styles are causing CSP violations
   - **Solution**:
     - Check browser console for detailed CSP error messages
     - Use the Network tab to identify blocked resources
     - Temporarily enable CSP reporting to collect violations:
       ```javascript
       // Add to vite.config.ts server.headers
       'Content-Security-Policy-Report-Only': "default-src 'self'; report-uri /csp-report"
       ```
     - Look for messages like "Refused to connect because it violates the following Content Security Policy directive: 'connect-src'" which indicate that an external API endpoint needs to be added to the connect-src directive

3. **CSP with Vite Development Server**
   - **Issue**: Vite features like HMR (Hot Module Replacement) require eval and inline scripts
   - **Solution**:
     - For development, we disable the HMR overlay with `hmr: { overlay: false }` in vite.config.ts
     - If HMR is needed, use the development CSP with 'unsafe-eval' and 'unsafe-inline'
     - For production builds, inline scripts are bundled properly and don't need these exemptions

4. **Handling Third-Party APIs with CSP**
   - **Issue**: External APIs like Supabase require specific domains in the connect-src directive
   - **Solution**:
     - Always include your Supabase project URL in the connect-src directive
     - For other third-party APIs, add their domains to the connect-src directive
     - When integrating new external services, check if their domains need to be added to CSP
     - Use browser dev tools to identify blocked requests and update CSP accordingly

5. **React Development with CSP**
   - **Issue**: React Fast Refresh and some development tools use eval()
   - **Solution**:
     - Use the React development build only in development environment
     - Ensure React is properly imported via ES modules rather than global variables
     - Avoid direct DOM manipulation with innerHTML or injecting script tags
     - Use React's built-in mechanisms for dynamic content instead of string evaluation

For more information about Content Security Policy, see the [MDN Web Docs on CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP).

### Database Connection Issues

1. **Missing Column Error**
   - **Issue**: `column modules_3.order does not exist` error when fetching the content hierarchy
   - **Solution**: The API now handles this error gracefully by returning an empty array instead of failing

2. **Supabase Environment Variables Not Loaded**
   - **Issue**: Supabase client fails to initialize due to missing environment variables
   - **Solution**: 
     - Ensure you have a `.env.local` file with the required variables
     - The API server now checks multiple environment files (`.env.local`, `.env.development`, `.env`)
     - Added improved error logging to debug Supabase connection issues

### Frontend Integration Issues

1. **API Proxy Configuration**
   - **Issue**: Frontend cannot connect to the API server
   - **Solution**: Added proper proxy configuration in `vite.config.ts`:
     ```javascript
     server: {
       proxy: {
         '/api': {
           target: 'http://localhost:3002',
           changeOrigin: true,
           secure: false,
           rewrite: (path) => path,
         }
       }
     }
     ```

2. **Blank Screen / No Error Messages**
   - **Issue**: Frontend shows a blank screen without any error messages
   - **Solution**: 
     - Added `ErrorBoundary` component to catch and display React errors
     - Added `ApiStatus` component in development mode to show API connection status
     - Enhanced AuthProvider with better error handling and logging

### Authentication and Loading Issues

1. **App Stuck on Loading Screen**
   - **Issue**: React application gets stuck on a loading spinner with "React did not render within 5 seconds!" message
   - **Solution**: 
     - Updated AuthService with timeout handling for all Supabase auth requests
     - Added better error handling in the AuthProvider component
     - Enhanced the ProtectedRoute component to prevent infinite loading states
     - Added fallback UI that displays when authentication takes too long
     - Improved logging throughout the authentication flow

2. **Authentication Timeout Issues**
   - **Issue**: Authentication requests to Supabase may hang indefinitely
   - **Solution**:
     - Implemented a Promise timeout wrapper around all auth requests with DEFAULT_TIMEOUT_MS (3000ms)
     - Added more detailed error messages for timeouts
     - Improved session storage with better error handling
     - Enhanced debugging by adding logging for all auth state changes

3. **Browser Cache and Session Issues**
   - **Issue**: Stale authentication data in browser localStorage causing login problems
   - **Solution**:
     - Added instructions for users to clear browser cache when persistent auth issues occur
     - Improved session management with better error handling when localStorage is unavailable
     - Added debugging tools to inspect the current session state
     - Updated error boundary to suggest cache clearing when appropriate

4. **"Failed to fetch" Authentication Errors**
   - **Issue**: Login fails with error message "Login failed: Failed to fetch"
   - **Solution**:
     - This typically indicates a network connectivity issue when trying to reach the Supabase authentication API
     - The application now includes automatic retry logic with a fresh Supabase client
     - If the Supabase client fails repeatedly, a fallback mechanism now attempts to sign in using a direct fetch to the Supabase API
     - Common root causes to check:
       - **CORS Issues**: If the API requires requests from specific origins, update CORS settings in Supabase
       - **Network Connectivity**: Check your internet connection and ability to reach the Supabase domain
       - **Environment Variables**: Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correctly set
       - **Supabase Service Status**: Check if Supabase is experiencing any outages
       - **Proxy Configuration**: If using a dev proxy (like Vite's), ensure it's not interfering with direct Supabase API calls
     - Debugging steps:
       - Check browser Network tab for any failed requests to `supabase.co` domains
       - Verify the user exists in the Supabase auth table
       - Try creating a simple test fetch to the Supabase URL to verify connectivity
       - Clear browser cache and localStorage if you suspect stale authentication data
       - For developers: The auth service logs detailed information about each authentication attempt

5. **Login Form Not Appearing (Session Loop Issue)**
   - **Issue**: The login form never appears because the application is stuck in an authentication loop showing "Session missing or expired" errors
   - **Solution**:
     - Made the `/login` and `/supabase-test` routes accessible without a session
     - Modified the default route (`/`) to redirect to `/login` instead of `/dashboard` when no session is available
     - Updated the AuthProvider to only force signOut when a previous session was detected but is now invalid
     - Restructured routes to ensure login is not wrapped in a ProtectedRoute component
     - Improved session detection to prevent unnecessary signOut attempts
   - **Root Causes**:
     - The issue occurs when the app forces a signOut when no session is found, even if the user wasn't logged in
     - This creates a loop: no session → signOut → clear localStorage → redirect → no session → signOut...
     - Protected routes wrapped around public routes like login
   - **Verification**:
     - Check App.tsx to ensure login routes are not inside a ProtectedRoute component
     - Examine the auth-provider.tsx to verify that signOut is only called when an invalid session is detected, not when no session exists
     - Make sure the navigation flow directs users to the login page when no session is found

### Frontend Routing Issues

1. **Nested Router Error**
   - **Issue**: Error message "You cannot render a <Router> inside another <Router>. You should never have more than one in your app."
   - **Solution**:
     - Ensure there is only one `<BrowserRouter>` (or any type of Router) in your application
     - The router should be at the top level of your component hierarchy
     - In our application, the Router is defined in `App.tsx` and wraps all other components
     - Common locations to check for duplicate routers:
       - Entry files (main.tsx, index.tsx)
       - App component (App.tsx)
       - Provider components (like AuthProvider)
       - Layout components
     - If using route components that need react-router hooks, they must be descendants of a Router but should not include another Router

2. **Router Component Structure**
   - **Issue**: Confusion about where to place Router components
   - **Solution**:
     - The correct structure is:
       ```jsx
       <BrowserRouter>
         <App>
           <Routes>
             <Route path="/" element={<Home />} />
             <Route path="/about" element={<About />} />
             {/* etc */}
           </Routes>
         </App>
       </BrowserRouter>
       ```
     - Nested routes should use nested `<Route>` elements, not nested `<Router>` components
     - Use `<Routes>` (plural) as a container for `<Route>` elements

3. **Route Not Rendering**
   - **Issue**: Routes defined but not rendering when URL matches
   - **Solution**:
     - Make sure all routes are defined inside a `<Routes>` component
     - Check that the Router is properly wrapping your application
     - Verify path patterns match exactly what you expect (case-sensitive)
     - Use the `/*` catch-all for nested routes that need their own routing
     - For protected routes, ensure the authentication logic allows the route to render

4. **API URL Configuration**
   - **Issue**: API URL shows as "Not set" in the debug panel
   - **Solution**:
     - Ensure the `VITE_API_URL` environment variable is set in your `.env` or `.env.local` file
     - In development, this should be: `VITE_API_URL=http://localhost:3002`
     - Vite requires environment variables to be prefixed with `VITE_` to be exposed to the client
     - After changing environment variables, restart the development server
     - Verify the URL is correctly loaded using console logs: `console.log(import.meta.env.VITE_API_URL)`

## Authentication and Login Issues

### Using Test Users for Authentication Troubleshooting

If you're experiencing authentication issues and want to isolate whether the problem is with your user account, specific permissions, or the authentication system in general, you can use one of the built-in test users:

1. In development mode, the login page displays a "Developer Test Accounts" section with buttons to sign in as various test users.
2. Click on one of these test accounts to attempt login without manually entering credentials.
3. If test users can log in successfully but your account cannot, the issue may be specific to your user account or permissions.
4. If test users also fail to log in, the issue is likely with the authentication system itself.

For more detailed information about test users, see the [Test Users Documentation](./TEST_USERS.md).

### "Failed to fetch" Authentication Errors

**Issue:** Login attempts fail with the error "Failed to fetch" or "Login failed: Failed to fetch".

This error typically signifies that there was a network connectivity problem with the Supabase authentication API.

**Solutions:**
- The authentication service now implements automatic retry logic with a fresh Supabase client if the login fails due to network issues.
- If the client fails repeatedly, a fallback mechanism now attempts to sign in using a direct fetch to the Supabase API.

**Common root causes to investigate:**
1. **CORS issues**: Supabase may block requests from unauthorized origins.
2. **Network connectivity**: Check if you can reach the Supabase domain from your browser.
3. **Environment variables**: Verify that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correctly set.
4. **Supabase service status**: Check if Supabase is experiencing an outage.
5. **Proxy configuration**: If using a proxy, ensure it correctly forwards requests to Supabase.

**Debugging steps:**
1. Open your browser's DevTools and check the Network tab for failed requests to Supabase.
2. Verify the user exists in the Supabase auth table.
3. Try clearing your browser cache and localStorage.
4. Test with a different browser or network connection.
5. Use one of the test users to verify if the issue is specific to your account.

### "Auth session missing!" Errors

**Issue:** User sees "Auth session missing!" or "Session missing or expired" errors after logging in or when refreshing the page.

**Symptoms:**
- User is redirected to login screen even after successfully logging in
- Console shows "Auth session missing!" error
- Authentication state is lost between page refreshes
- User needs to log in repeatedly, even within the same browsing session
- Login form may not appear if the app is stuck in an authentication loop

**Common Causes:**
1. **LocalStorage Issues:** 
   - The browser's localStorage may be disabled, full, or blocked by privacy settings
   - Private/Incognito browsing mode often blocks persistent storage
   - Browser extensions might block or clear localStorage

2. **Session Storage Configuration:**
   - Mismatch between Supabase's built-in session storage key (`supabase.auth.token`) and custom session storage (`authSession`)
   - Incorrect configuration of the Supabase client's auth storage options
   - Session not being stored after successful login due to custom storage methods failing
   - Session data stored in one format but expected in another

3. **Session Expiration/Validation:**
   - Session token has expired and refresh fails
   - Token validation fails due to incorrect API URL or configuration
   - Token format is invalid or corrupted
   - Expired token not properly refreshed in local storage

4. **Cross-Origin Issues:**
   - CORS restrictions preventing proper communication with auth provider
   - Requests blocked due to cross-domain security policies
   - Proxy configuration issues in development environment

5. **Auth Loop Issues:**
   - The application may force sign-out when no session is found, even if the user wasn't logged in
   - This can create a loop where: no session → sign out → clear localStorage → redirect → no session again
   - Protected routes wrapping public routes (like login) can cause redirection loops

**Solutions:**

1. **Check Browser Storage:**
   - Verify localStorage is accessible in your browser:
     ```javascript
     // In browser console
     localStorage.setItem('test', 'test');
     console.log(localStorage.getItem('test'));
     ```
   - Check for existing auth-related keys:
     ```javascript
     // In browser console
     Object.keys(localStorage).filter(key => 
       key.includes('auth') || key.includes('supabase')
     );
     ```
   - Examine session data format:
     ```javascript
     // In browser console
     console.log(JSON.parse(localStorage.getItem('authSession')));
     console.log(JSON.parse(localStorage.getItem('supabase.auth.token')));
     ```

2. **Ensure Consistent Storage Keys:**
   - The application now uses a consistent set of storage keys:
     - `supabase.auth.token` - The built-in Supabase auth token
     - `authSession` - Our custom session storage
   - Both should be synchronized during login and session operations

3. **Implement Session Restoration Logic:**
   - The application now includes robust session restoration logic:
     - If `authSession` exists but `supabase.auth.token` is missing, we attempt to restore from `authSession`
     - If `supabase.auth.token` exists but `authSession` is missing, we sync it to `authSession`
     - Clear timeout handling ensures auth checks don't hang indefinitely
     - Enhanced error reporting when session restoration fails

4. **Verify Environment Configuration:**
   - Check that the Supabase URL and anon key are correctly set in `.env.local`
   - Ensure the API URL is correctly set and the API server is running
   - Verify the API server can communicate with Supabase

5. **Implement Graceful Auth Failure Handling:**
   - The app now has improved error handling for authentication failures:
     - Error UI with clear instructions for users
     - "Clear Session & Go to Login" button to help recover from invalid session states
     - Protected routes now timeout gracefully if authentication checks take too long
     - Login page is no longer wrapped in a ProtectedRoute to prevent login loops
     - Clearer error messages with more diagnostic information

6. **For Development and Testing:**
   - Clear browser storage before testing:
     ```javascript
     // In browser console
     localStorage.clear();
     sessionStorage.clear();
     ```
   - Try using a test user account (available on the login page in development mode)
   - Access the login page directly at `/login` instead of relying on redirects
   - Use the "DEV: System Status" panel to verify API and auth status

**Recent Fixes:**

1. **Login Form Not Appearing (Session Loop Issue):**
   - Fixed route configuration so the login page is properly accessible without authentication
   - Made the `/login` and `/supabase-test` routes accessible without a session
   - Modified the default route (`/`) to redirect to `/login` instead of `/dashboard` when no session is available
   - Updated the AuthProvider to only force signOut when a previous session was detected but is now invalid
   - Restructured routes to ensure login is not wrapped in a ProtectedRoute component

2. **Session Detection Improvements:**
   - Enhanced session diagnostics to better detect and report storage issues
   - Added explicit error handling for localStorage operations
   - Added fallback mechanisms when session storage cannot be accessed
   - Improved session validation to prevent unnecessary signOut operations

3. **Enhanced User Experience:**
   - Added clearer error messages with specific instructions
   - Improved error UI with action buttons for recovery
   - Better timeout handling for auth operations
   - DEV mode includes detailed diagnostic information for debugging

**When to Reach Out for Help:**
- If you've tried all these steps and still experience authentication issues
- If you see session errors only in specific browsers or environments
- If you've confirmed both localStorage and sessionStorage are working but sessions aren't persisting
- If you see unusual patterns in auth-related network requests

**Example Session Diagnostics:**
When a session is missing, the system now collects detailed diagnostics about the state of localStorage, providing crucial information for debugging. Example diagnostic data:

```json
{
  "localStorage": {
    "totalKeys": 12,
    "authRelatedKeys": 2,
    "authData": {
      "authSession": {
        "type": "json",
        "size": 1423,
        "hasAccessToken": true,
        "hasUser": true,
        "expiresAt": "2023-08-15T18:30:00.000Z"
      },
      "supabase.auth.token": {
        "type": "json",
        "size": 1532,
        "hasAccessToken": true,
        "hasUser": true,
        "expiresAt": "2023-08-15T18:30:00.000Z"
      }
    }
  },
  "url": "http://localhost:5173/dashboard",
  "timestamp": "2023-08-15T12:30:00.000Z",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)..."
}
```

## Complete Restart Procedure

If all the above solutions don't resolve your authentication or API issues, follow this comprehensive restart procedure:

### 1. Check & Update Environment Files

First, ensure your `.env.local` file has the correct configuration:

```
# API URL for the frontend to connect to
VITE_API_URL=http://localhost:3002

# Supabase configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Kill All Processes

Close all terminal windows and ensure no leftover processes are running:

```bash
# For macOS/Linux:
pkill -f node
pkill -f npm

# Alternative: Check and kill specific port usage
lsof -i :3002 | grep LISTEN | awk '{print $2}' | xargs kill -9
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9
lsof -i :5174 | grep LISTEN | awk '{print $2}' | xargs kill -9
lsof -i :5175 | grep LISTEN | awk '{print $2}' | xargs kill -9
lsof -i :5176 | grep LISTEN | awk '{print $2}' | xargs kill -9
lsof -i :5177 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### 3. Clear Browser State

Open a new browser window in private/incognito mode, or clear your browser's storage:

```javascript
// Run in browser console
localStorage.clear();
sessionStorage.clear();
```

### 4. Start API Server

In a fresh terminal:

```bash
# Navigate to project root
cd /path/to/project

# Start API server
npm run api:start
# or the appropriate command for your project
```

Wait until you see the "API server listening on port 3002" message.

### 5. Verify API Health

In another terminal:

```bash
# Test API health endpoint
curl http://localhost:3002/api/health
```

Expected response: JSON with `{"success":true,"data":{"status":"ok"}}` or similar.

### 6. Start Frontend

In another fresh terminal:

```bash
# Navigate to project root
cd /path/to/project

# Start frontend
npm run dev
```

Verify you see the Vite startup message with a Local URL.

### 7. Debug Authentication

In the browser:
1. Open the URL provided by the Vite dev server (e.g., http://localhost:5174)
2. Open DevTools (F12) → Network tab
3. Try logging in with a test user account
4. Look for auth-related requests in the Network tab 
5. Check for detailed logs in the Console tab (look for `[AUTH-DEBUG]` and `[SUPABASE-DEBUG]` tags)

### 8. Fix Session Sync Issues

If login succeeds but you still see "Session missing" errors:

1. Check for synchronization between storage methods:
   ```javascript
   // In browser console
   const authSession = localStorage.getItem('authSession');
   const supabaseToken = localStorage.getItem('supabase.auth.token');
   console.log('Auth session exists:', Boolean(authSession));
   console.log('Supabase token exists:', Boolean(supabaseToken));
   ```

2. Test if API connectivity is working post-login:
   ```bash
   # With appropriate credentials
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3002/api/protected-route
   ```

### 9. Monitor Both Terminals

Keep an eye on both terminal windows (API server and frontend) for any error messages that might indicate the root cause of authentication issues.

### Utility Scripts

We've added two utility scripts to help streamline this process:

```bash
# Make scripts executable
chmod +x scripts/check-ports.sh
chmod +x scripts/verify-api.js

# Check for processes using required ports
./scripts/check-ports.sh

# Verify API and Supabase connectivity
node scripts/verify-api.js
```

See [STARTUP_CHECKLIST.md](../STARTUP_CHECKLIST.md) for a step-by-step guide to starting the application from scratch.

## Quick Start Guide

1. **Start the API server**:
   ```bash
   npm run api:start
   ```

2. **Start the frontend**:
   ```bash
   npm run dev
   ```

3. **Test the API**:
   ```bash
   curl http://localhost:3002/api/health
   ```
   Should return:
   ```json
   {
     "success": true,
     "data": {
       "status": "ok",
       "message": "API server is running",
       "version": "1.0.0",
       "timestamp": "..."
     }
   }
   ```

## Debugging Tips

1. **Check API server logs**:
   - Look for startup errors in the console
   - API endpoints log detailed information about requests and responses
   - The error handler captures and formats all errors consistently

2. **Inspect frontend console errors**:
   - The AuthProvider logs authentication state in development mode
   - API response errors are displayed in the console
   - The ErrorBoundary component catches and displays React errors

3. **Check environment variables**:
   - The API server looks for variables in `.env.local`, `.env.development`, and `.env`
   - Required Supabase variables: `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - The API server now logs the list of available environment variables for debugging

4. **Test with curl or Postman**:
   - Test basic API endpoints independently of the frontend
   - Verify response formats match the expected structure
   - Check for proper CORS headers if making cross-origin requests 

## Server-Side localStorage Errors

### "localStorage is not defined" Errors in Server Logs

**Symptoms:**
- Error logs showing `ReferenceError: localStorage is not defined`
- These errors often appear during Supabase operations
- Usually seen with autoRefreshTokenTick, \_useSession or other Supabase auth methods
- Authentication may fail even with valid tokens

**Root Cause:**
Supabase's auth library is designed for browser environments and attempts to use browser-specific APIs like localStorage. When running in Node.js, these APIs don't exist, causing errors.

**Solutions:**

1. **Use the Polyfilled API Server**
   - The most reliable solution is to always start the API server using the polyfilled entry point:
   ```
   npm run api:start
   ```
   - This will load the global localStorage polyfill before any other modules

2. **Manual Server Start with Polyfills (if npm run api:start doesn't work)**
   ```bash
   # Run these commands
   node src/api/fixGlobalStorage.js
   node src/api/fixSupabaseAutoRefresh.js
   NODE_ENV=development PORT=3001 node dist/api/server.js
   ```

3. **Check Polyfill Installation**
   - Ensure the following files exist:
     - `src/api/fixGlobalStorage.js`
     - `src/api/fixSupabaseAutoRefresh.js`
     - `src/api/api-server.js`
   - If any are missing, recreate them from the documentation

4. **Verify the Fix is Working**
   - When starting the server, you should see:
     - `[Global Storage] localStorage polyfill loaded and ready`
     - `[FixStorage] Supabase localStorage fix applied`
     - No more localStorage errors in the logs

**Prevention:**
- Always use the API service layer in the frontend, never direct Supabase calls
- Always start the API server using `npm run api:start` which includes the polyfills
- Don't modify the polyfill files unless absolutely necessary

**Note:** These errors are harmless from a security perspective, but they can cause authentication to fail and flood logs with errors. The polyfill approach ensures Supabase works correctly in the Node.js environment without any changes to its internal code. 