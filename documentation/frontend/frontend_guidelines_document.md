# Frontend Guideline Document

## Introduction

The frontend of the E11EVEN Central App plays a crucial role in delivering a seamless and engaging user experience. This application is designed to centralize workforce management across various hospitality venues, providing modules such as learning management, internal messaging, AI-powered scheduling, gratuity tracking, and an administrative dashboard. From training and certification to real-time communication and performance tracking, the frontend is the face of the entire system. The design and functionality focus on making every interaction intuitive, fast, and secure, ensuring a modern experience for all user levels from SuperAdmin to Staff.

## Frontend Architecture

Our frontend is built using Vite.js along with React and TypeScript, which ensures that the application is fast, scalable, and highly maintainable. We use a modern component-based approach with a clear separation of concerns:

1. **UI Components**: Reusable interface elements built with Shadcn UI and Tailwind CSS
2. **Service Layer**: Provides APIs for interacting with backend data through centralized services
3. **State Management**: React hooks and context for local and global state
4. **Form Handling**: Uses React Hook Form and Zod for validation

All data operations now flow through the service layer, which communicates with our custom API endpoints instead of making direct Supabase calls. This approach enhances security, maintainability, and testability.

### Service Layer Architecture

The service layer consists of:

- `apiService.ts`: Central service that handles all HTTP requests to the backend
- Domain-specific services (e.g., `programService.ts`, `courseService.ts`, `lessonService.ts`)
- `storageService.ts`: Manages file uploads and retrievals
- `baseDataService.ts`: Provides common CRUD operations for entities

These services abstract away the details of API communication, allowing components to focus on rendering and user interaction rather than data fetching logic.

### Example of Service Layer Integration

Here's an example of how a component might use the service layer to fetch data:

```tsx
// Before (direct Supabase calls):
const { data: programs, error } = await supabase
  .from('programs')
  .select('*')
  .order('created_at', { ascending: false });

// After (service layer approach):
const { data: programs, error } = await programService.getAll({
  orderBy: { column: 'created_at', ascending: false }
});
```

The service layer approach provides several advantages:
- Consistent error handling
- Type safety with TypeScript
- Abstraction of API details
- Easier testing with mocks
- Future-proofing against backend changes

## Design Principles

The design principles that guide our frontend development include simplicity, accessibility, and responsiveness. Using a minimalist and modern UI, we focus on ensuring that every user interaction is straightforward and predictable. The design emphasizes mobile-first responsive layouts, ensuring smooth navigation on any device. Usability and accessibility remain at the forefront, meaning interfaces are designed to serve all users, including those with disabilities, and are continuously refined for better performance and ease of use.

## Styling and Theming

For styling, we adopt a Tailwind CSS-based approach which facilitates a clean and efficient design system. Custom UI components are crafted using Shadcn UI to maintain consistency and a unified look throughout the app. The styling approach allows us to quickly develop and adapt layouts while meeting strict design criteria. Theming, including light and dark modes, is managed using the next-themes library, ensuring that users enjoy a consistent visual experience no matter their preference or time of day. This system supports our brand identity including the gold primary color (#AE9773), complementary color scales, and the Geist Sans font family.

## Component Structure

The frontend is organized into modular, reusable components that work together like building blocks. Each component is designed to focus on presentation and user interaction, delegating data operations to the service layer. This separation of concerns makes components easier to develop, test, and maintain.

### Key Component Types:

1. **Form Components**: Handle user input with validation (e.g., `ProgramForm.tsx`, `CourseForm.tsx`)
2. **List Components**: Display collections of items (e.g., `ProgramList.tsx`, `CourseList.tsx`)
3. **Detail Components**: Show detailed information about a single item
4. **Layout Components**: Structure the overall page layout
5. **UI Components**: Reusable UI elements from Shadcn UI

Each component typically follows this pattern:
- Import necessary services
- Define component props and state
- Handle data fetching through service calls
- Render the UI based on the data and state

## Data Access Pattern

All data operations now follow a consistent pattern:

1. Components never make direct Supabase calls
2. Components use domain-specific services (e.g., `programService`, `lessonService`)
3. Services use the central `apiService` to make HTTP requests
4. Responses follow a consistent format with proper error handling

Example:
```typescript
// Component
const { data, isLoading, error } = useFetchPrograms();

// Hook
function useFetchPrograms() {
  const [data, setData] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await programService.getAll();
        if (response.error) throw new Error(response.error.message);
        setData(response.data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);
  
  return { data, isLoading, error };
}
```

## Working with Files and Storage

File operations (uploads, downloads, etc.) should also be handled through the service layer rather than direct Supabase calls:

```typescript
// Before (direct Supabase storage calls):
const { data, error } = await supabase.storage
  .from('media')
  .upload(`thumbnails/${file.name}`, file);

// After (service layer approach):
const { url, error } = await storageService.uploadFile(
  'media',
  `thumbnails/${file.name}`,
  file
);
```

This ensures consistent error handling and abstracts away the details of the storage provider.

## State Management

State management within the app is handled using React's built-in state mechanisms along with context where needed to share data between components. Local component state is managed with `useState` and `useReducer`, while global application state is managed through React Context providers. API data is typically fetched and managed by the components that need it, using hooks that encapsulate the data fetching logic.

The service layer abstracts away the complexity of API calls, allowing components to focus on state management and rendering. This approach helps maintain a consistent state across various modules such as content updates in the LMS, real-time messaging updates, or scheduling changes.

## Routing and Navigation

Navigation in the E11EVEN Central App is designed to be fluid and user-friendly. We use React Router for routing, with routes defined in the `src/routes/` directory. The routing system supports nested views and dynamic route changes, ensuring users can easily access detailed content such as interactive assessments or scheduling calendars with a minimal number of clicks.

Protected routes use the `useAuth` hook to verify user authentication and authorization before rendering sensitive content.

## Performance Optimization

Performance is a key focus for our frontend. Techniques such as lazy loading and code splitting are employed to ensure that pages load quickly and only the necessary code is delivered to the user. Our service layer helps improve performance by:

1. **Centralized caching**: Common data can be cached at the service level
2. **Optimized requests**: Services can batch or combine requests when appropriate
3. **Error boundaries**: Failed requests are handled gracefully without crashing the UI

By using modern build tools like Vite.js, we also ensure that the overall frontend performance is kept at a high standard, even as the complexity of the app grows.

## Testing and Quality Assurance

To maintain the quality and reliability of our frontend, we implement a comprehensive testing strategy:

1. **Unit Tests**: Test individual components and services in isolation
2. **Integration Tests**: Verify that components work together correctly
3. **End-to-End Tests**: Simulate real user interactions across the entire app

The service layer architecture makes testing easier by allowing components to be tested with mocked service responses instead of requiring actual API calls. This approach leads to more reliable and faster tests.

## Legacy Components and Future Refactoring

While most of the application has been refactored to use the new service layer approach, a few legacy components still use direct Supabase calls:

1. **MinimalProgramDialog.tsx**: Still used in ContentManagement.tsx for creating new programs with minimal UI flickering. It directly uses Supabase for database operations and file uploads.

The following component was previously using direct Supabase calls but has been refactored:
- **fix-order-columns**: Previously made direct Supabase RPC calls to fix database column issues, now refactored to use the API layer through `adminService.fixOrderColumns()`.

These components are documented more extensively in the [Legacy Components](./legacy_components.md) document, including plans for future refactoring to align with the new service layer approach.

### Identifying Legacy Components

Legacy components can be identified by their imports and usage patterns:

```typescript
// Legacy component using direct Supabase calls
import { supabase } from '../../services/supabase';

// ...

const { data, error } = await supabase
  .from('programs')
  .select('*');
```

When working with legacy components:
1. Avoid adding new direct Supabase calls
2. When modifying these components, consider refactoring to use the service layer
3. Document any technical debt related to these components

## Developer Guidelines

When building new features or modifying existing ones, follow these guidelines:

1. **Never make direct Supabase calls** from components; always use the appropriate service
2. **Implement proper error handling** for all service calls
3. **Use TypeScript types** for all data structures and API responses
4. **Keep components focused** on presentation and delegate data operations to services
5. **Follow the established patterns** for forms, lists, and detail views

### Creating a New Feature

When creating a new feature:

1. Define the API endpoints in the appropriate module (e.g., `/src/api/routes/university/*.ts`)
2. Implement or update the corresponding service (e.g., `/src/services/programService.ts`)
3. Create React components that use the service to interact with the API
4. Add appropriate routes in the router configuration

### Error Handling Best Practices

Always implement proper error handling for service calls:

```typescript
try {
  const { data, error } = await programService.getById(programId);
  
  if (error) {
    // Handle service-level error
    console.error('Service error:', error);
    setErrorMessage(error.message);
    return;
  }
  
  // Process data...
} catch (err) {
  // Handle unexpected errors
  console.error('Unexpected error:', err);
  setErrorMessage('An unexpected error occurred');
}
```

## Conclusion and Overall Frontend Summary

The frontend of the E11EVEN Central App is built upon modern, scalable technologies with a clear separation between presentation and data access through our service layer architecture. By using custom API services instead of direct database calls, we've created a more secure, maintainable, and flexible system. The design emphasizes an accessible, intuitive, and visually consistent user experience across various modules such as the LMS, messaging platform, scheduling system, gratuity tracker, and administrative dashboard. This architecture provides a solid foundation for the application to grow and evolve while maintaining high standards of performance, security, and user experience.
