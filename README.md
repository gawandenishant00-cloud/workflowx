# WorkFlowX

WorkFlowX is a unified HR and procurement workflow app with authentication, role-based access, shared approvals, and in-app notifications.

## Stack

- React + Vite
- Express + Node.js
- Supabase Auth and Postgres
- JWT authentication

## Features

- Employee leave requests
- Employee purchase requests
- Manager approval queue
- Admin employee and vendor management
- Request status tracking
- Notification bell with unread count
- Role-protected routes and API endpoints

## Project Structure

```text
workflowx/
├── client/   React frontend
└── server/   Express API
```

## Local Setup

### 1. Install dependencies

```powershell
cd server
npm install
cd ..\client
npm install
```

### 2. Configure environment variables

Copy the example files:

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
```

Fill in the Supabase values. Never commit either `.env` file.

### 3. Configure Supabase

Run the SQL setup in `server/sql/schema.sql` using the Supabase SQL Editor. If profiles already exist or signup profile creation needs repair, run `server/sql/fix_profiles.sql`.

The server uses the Supabase service-role key. Keep it only in `server/.env`; never expose it to the browser.

### 4. Start the application

Terminal 1:

```powershell
cd server
npm run dev
```

Terminal 2:

```powershell
cd client
npm run dev
```

Open the Vite URL shown in the client terminal, usually `http://localhost:5173`.

## Test Accounts

Create the first administrator through Supabase Auth and add a matching `profiles` row with `role = 'admin'`. An administrator can then create employee or manager accounts from the Admin dashboard.

## Checks

Frontend:

```powershell
cd client
npm run build
npm run lint
```

Backend:

```powershell
cd server
npm test
```

## Security

- `.env` files are ignored by Git.
- Use a rotated Supabase service-role key in local and hosted environments.
- Public signup creates employee accounts only.
- Manager and admin access is enforced by the backend role middleware.
- Apply and review Supabase Row Level Security policies before deployment.

## Deployment

Deploy the `server` directory to a Node hosting provider and the `client` directory to a Vite-compatible static host. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on Render, and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_URL` on Vercel. `VITE_API_URL` must be the Render service URL (for example, `https://workflowx-api.onrender.com`) without a trailing slash or `/api`; the frontend calls `/me` and `/api/...` itself. Redeploy the Vercel client after changing any `VITE_` variable because Vite embeds these values at build time.
