# ZENIT

ZENIT is a centralized analytics workspace for digital products, websites, applications, commerce and marketing performance.

## Stack
- Next.js App Router + TypeScript
- Supabase Auth + PostgreSQL + Row Level Security
- Custom responsive design system and motion
- Render Web Service deployment

## Local development
1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and publishable key.
3. Run `npm install`.
4. Run `npm run dev`.

## Initial scope
- Public landing page
- Email/password signup and login
- Auth callback and sign out
- Protected workspace dashboard
- Workspace creation with automatic owner membership
- Core multi-tenant analytics schema

## Security
Never place Supabase service-role or secret keys in browser environment variables. Public clients use only the publishable key; row access is enforced with RLS.

The first schema migration is applied to the Supabase project Winner. The canonical SQL migration source will be kept in `supabase/migrations` as part of the next repository pass.
