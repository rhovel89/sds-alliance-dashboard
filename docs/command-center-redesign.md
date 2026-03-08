# State Alliance Dashboard — Command Center Redesign (Zombie Ops HQ)

## Goals
- Powerful, smooth, no duplicated flows
- UI-friendly CRUD everywhere (create/edit/delete/assign/export/post)
- Zombie-themed command center (high-end, readable)
- RLS enforced in Supabase (UI only hints roles)

## Information Architecture
- Command Center Shell
  - Top Status Bar
  - Intel Rail (Modules)
  - Main Viewport
  - Action Drawer (CRUD)

## Modules (Draft)
- Player Ops (guided)
- Alliance Ops (guided)
- State Hub (/state/789 primary)
- Achievements (filters + export + Discord send)
- Events Calendar (reminders)
- HQ Map (realtime)
- Discussions
- Mail / Announcements
- Guides / Attachments
- Admin (Access Control, Roles/Perms, Audit)

## Non-negotiables
- Vite + React + TypeScript
- Supabase only (Postgres/Auth/Realtime/RLS)
- No monolithic backend
- Discord roles do not grant permissions (RLS does)
- Multi-state + multi-alliance
- Onboarding required; no auto-assign on OAuth

## UX Standards
- Consistent CRUD pattern
- Drawer-based edit/create
- Confirm destructive actions
- Realtime hints + optimistic UI where safe
- Loading skeletons, no flicker loops

## Technical Standards
- One canonical player_id resolver used everywhere
- Schema-safe selects for drift-prone tables
- Smallest diffs + backup + build gate
