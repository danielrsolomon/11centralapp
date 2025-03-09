This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## E11EVEN Central - App Features

### User Profile Section

The E11EVEN Central app includes a comprehensive user profile section with the following features:

- **Personal Information**: View and edit basic profile details
- **Notification Preferences**: Manage email, text, and app notification settings
- **Display Settings**: Customize language, theme, font size, and accessibility options
- **Security Settings**: Change password and manage two-factor authentication
- **Account Settings**: Export data, sign out, and account deletion options

### Admin Settings

The application includes an admin panel accessible only to users with the admin role. The admin settings include:

- **User Management**: Manage users, roles, permissions, and departments
- **Venue Management**: Configure venues, locations, floor plans, and venue-specific settings
- **System Settings**: Configure application branding, notifications, and integrations
- **Security & Compliance**: Access security settings, audit logs, and compliance tools

The application's navigation structure features expandable sections:

- **E11EVEN University**: Contains dashboards, training portals, achievements, and content management (admin only)
- **Scheduling Hub**: Contains schedules, schedule swaps, time off requests, floor plans, and content management (admin only)
- **Guardian Hub**: Security and compliance features
- **Admin Settings**: Centralized administrative functions (admin users only)

Content management features are integrated within their respective sections rather than being centralized, allowing for more intuitive editing and management.

To set up an admin user, you can use the included Supabase function:

```sql
SELECT make_user_admin('user-uuid-here');
```

Or directly update the role in the users table:

```sql
UPDATE users SET role = 'admin' WHERE id = 'user-uuid-here';
```

### Supabase Integration

This application uses Supabase for authentication and database functionality. To apply the database migrations:

1. Make sure you have the Supabase CLI installed:
   ```bash
   npm install -g supabase
   ```

2. Login to your Supabase account:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Apply migrations:
   ```bash
   supabase db push
   ```

5. Generate TypeScript types (optional):
   ```bash
   supabase gen types typescript --local > types/supabase.ts
   ```
