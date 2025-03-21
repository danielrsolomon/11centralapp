# E11EVEN Central App Glossary

This glossary provides definitions for terms, acronyms, and concepts used throughout the E11EVEN Central App documentation and codebase.

*Last Updated: 2024-05-24 | Version: 1.0.0 | Updated By: Documentation Team*

## How to Use This Glossary

Terms are organized alphabetically within categories and include:
- A concise definition
- Context for how the term is used in the project
- Links to relevant documentation where applicable

## Project-Specific Terms

### E11EVEN Central App
**Definition**: A fully integrated, enterprise-grade platform that centralizes all key aspects of workforce management into one cohesive system, including training, communication, scheduling, and gratuity tracking.  
**Context**: The core application this documentation is describing.

### Gratuity Tracking Module
**Definition**: The component of the E11EVEN Central App responsible for recording, calculating, and distributing tips among staff.  
**Context**: Ensures compliance with IRS tip reporting requirements and FLSA.  
**See**: [Architecture Overview](./project/ARCHITECTURE_OVERVIEW.md)

### Scheduling Module
**Definition**: The component responsible for staff scheduling, shift management, and time tracking.  
**Context**: Includes AI-powered schedule optimization and integration with point-of-sale systems.  
**See**: [Architecture Overview](./project/ARCHITECTURE_OVERVIEW.md)

### University Module
**Definition**: The Learning Management System (LMS) component of the E11EVEN Central App.  
**Context**: Provides training materials, courses, and skill tracking for employees.  
**See**: [Architecture Overview](./project/ARCHITECTURE_OVERVIEW.md)

## Technical Terms and Acronyms

### API
**Application Programming Interface**  
**Context**: The E11EVEN Central App uses a REST API to enable communication between the frontend and backend services.  
**See**: [API Documentation](./api/API_DOCUMENTATION.md)

### LMS
**Learning Management System**  
**Context**: The University module functions as an LMS, delivering educational courses and training programs.  
**See**: [Architecture Overview](./project/ARCHITECTURE_OVERVIEW.md)

### MCP
**Machine Control Protocol**  
**Context**: A tooling framework for enhancing development workflow, including database operations and web search capabilities.  
**See**: [MCP Documentation](./mcp/MCP_DOCUMENTATION.md)

### RLS
**Row Level Security**  
**Context**: A Supabase/PostgreSQL feature used to implement data access control in our database.  
**See**: [Supabase Integration](./supabase/SUPABASE_INTEGRATION.md)

### Service Layer
**Definition**: An architectural pattern that places a service layer between controllers and repositories to handle business logic.  
**Context**: The E11EVEN Central App uses a service layer pattern to separate business logic from API route handlers.  
**See**: [Service Layer Usage](./frontend/service_layer_usage.md)

## Framework and Library Terms

### React
**Definition**: A JavaScript library for building user interfaces with a component-based architecture.  
**Context**: The foundation of our frontend implementation.  
**See**: [Frontend Guidelines](./frontend/frontend_guidelines_document.md)

### Shadcn UI
**Definition**: A collection of reusable UI components built on Radix UI and Tailwind CSS.  
**Context**: Used to maintain a consistent design system throughout the application.  
**See**: [Frontend Guidelines](./frontend/frontend_guidelines_document.md)

### Supabase
**Definition**: An open-source Firebase alternative providing PostgreSQL database, authentication, instant APIs, and realtime subscriptions.  
**Context**: Our primary backend-as-a-service platform.  
**See**: [Supabase Integration](./supabase/SUPABASE_INTEGRATION.md)

### Tailwind CSS
**Definition**: A utility-first CSS framework for rapidly building custom user interfaces.  
**Context**: Used for styling components throughout the application.  
**See**: [Frontend Guidelines](./frontend/frontend_guidelines_document.md)

### TypeScript
**Definition**: A strongly typed programming language that builds on JavaScript.  
**Context**: Used throughout the codebase to provide type safety and improved developer experience.  
**See**: [Express TypeScript Guide](./api/EXPRESS_TYPESCRIPT_GUIDE.md)

### Vite
**Definition**: A frontend build tool that significantly improves the development experience.  
**Context**: Used for bundling and serving our application during development.  
**See**: [Architecture Overview](./project/ARCHITECTURE_OVERVIEW.md)

### Zod
**Definition**: A TypeScript-first schema validation library with static type inference.  
**Context**: Used for form validation and data validation throughout the application.  
**See**: [API Documentation](./api/API_DOCUMENTATION.md)

## Business Domain Terms

### Director
**Definition**: A management role responsible for overseeing multiple departments or venues.  
**Context**: One of the user roles in the application with specific permissions and access levels.

### FLSA
**Fair Labor Standards Act**  
**Context**: A U.S. law that establishes minimum wage, overtime pay, and other employment standards, relevant to the Gratuity Tracking module.

### IRS Tip Reporting
**Definition**: The legal requirement for employees to report all tip income to their employers, and for employers to withhold taxes.  
**Context**: A compliance requirement addressed by the Gratuity Tracking module.

### Lead
**Definition**: A floor supervisor role responsible for managing staff during a shift.  
**Context**: One of the user roles in the application with specific permissions and access levels.

### Manager
**Definition**: A role responsible for day-to-day operations of a specific department.  
**Context**: One of the user roles in the application with specific permissions and access levels.

### Senior Manager
**Definition**: A role that oversees multiple managers within a venue.  
**Context**: One of the user roles in the application with specific permissions and access levels.

### SuperAdmin
**Definition**: The highest level administrative role with full system access.  
**Context**: Has complete access to all features and administrative functions.

### Training Manager
**Definition**: A role specifically focused on employee training and development.  
**Context**: Has special permissions related to the University module.

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-05-24 | 1.0.0 | Created initial glossary | Documentation Team | 