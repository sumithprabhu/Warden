# Warden - Development Checklist

## Foundation & Setup
- [x] Next.js 16 project setup with App Router
- [x] Tailwind CSS 4.1 + ShadCN UI components (59 primitives)
- [x] MongoDB / Mongoose ODM setup with connection caching
- [x] AES-256-GCM encryption for mnemonic storage
- [x] Unlink SDK client factory
- [x] ENS name resolution utility (viem)
- [x] Environment variables configuration (.env.example)
- [x] Vercel Analytics integration
- [x] Custom fonts (Instrument Sans, Instrument Serif, JetBrains Mono)

## Authentication & Onboarding
- [x] Privy server-auth integration (token verification, user lookup)
- [x] Privy react-auth client integration (PrivyProvider, login modal)
- [x] Auth verify API route (`POST /api/auth/verify`)
- [x] Auth onboard API route (`POST /api/auth/onboard`) — admin + employee flows
- [x] `useAuth` hook (verify, redirect, role-based routing)
- [x] API client helper (`lib/api.ts`) — typed wrapper for all endpoints
- [x] Client providers wrapper (Privy + Toaster, SSR-safe dynamic import)
- [x] `/login` page — Privy sign-in with split layout, auto-redirect on auth
- [x] `/onboard` page — role selection (admin/employee), org creation form, invite acceptance
- [x] `/invite/[token]` page — redirect to onboard with invite token

## Landing Page
- [x] Navigation with sticky scroll + mobile menu
- [x] Hero section
- [x] Features section
- [x] How it works section
- [x] Infrastructure section
- [x] Metrics section
- [x] Integrations section
- [x] Security section
- [x] Developers section
- [x] Testimonials section
- [x] Pricing section
- [x] CTA section
- [x] Footer section
- [x] 3D animations (Three.js sphere, tetrahedron, wave)

## API Routes (Backend)
- [x] `POST /api/auth/verify` — verify Privy token, return user + onboard status
- [x] `POST /api/auth/onboard` — create admin (org + user) or employee (via invite)
- [x] `GET /api/org` — get current user's organization
- [x] `PUT /api/org` — update organization settings
- [x] `GET /api/employees` — list employees with user population
- [x] `POST /api/employees/invite` — create invite with ENS support
- [x] `PUT /api/employees/[id]` — update employee salary/frequency/department
- [x] `DELETE /api/employees/[id]` — deactivate employee
- [x] `GET /api/departments` — list departments
- [x] `POST /api/departments` — create department
- [x] `DELETE /api/departments/[id]` — delete department
- [x] `POST /api/payroll/run` — execute payroll or submit for DAO approval
- [x] `POST /api/payroll/[id]/approve` — DAO approver signs off
- [x] `GET /api/payroll` — list payroll history with pagination
- [x] `GET /api/payroll/[id]` — payroll details + payments
- [x] `GET /api/payroll/upcoming` — preview next payroll
- [x] `GET /api/treasury/balance` — Unlink pool + EVM wallet balance
- [x] `POST /api/treasury/deposit` — deposit into privacy pool
- [x] `POST /api/treasury/withdraw` — withdraw from pool
- [x] `GET /api/treasury/transactions` — Unlink transaction history
- [x] `GET /api/vesting` — list vesting schedules
- [x] `POST /api/vesting` — create vesting schedule
- [x] `POST /api/vesting/[id]/release` — trigger vested token release
- [x] `GET /api/me/balance` — employee's Unlink balance
- [x] `GET /api/me/payments` — employee payment history
- [x] `POST /api/me/withdraw` — employee withdraw to EVM/ENS
- [x] `GET /api/me/vesting` — employee vesting schedules
- [x] `GET /api/ens/resolve` — resolve ENS name to address

## Admin Dashboard (Frontend)
- [x] Dashboard layout with sidebar navigation (desktop + mobile)
- [x] Role-based route protection (ADMIN only, redirects)
- [x] `/dashboard` — overview with stats cards, quick actions, recent payrolls
- [x] `/dashboard/employees` — employee table, invite dialog (email/ENS, salary, frequency, type, dept)
- [x] `/dashboard/departments` — department cards grid, create/delete
- [x] `/dashboard/payroll` — run payroll dialog, upcoming preview, history table, DAO approval button
- [x] `/dashboard/treasury` — balance cards (pool + EVM), deposit/withdraw dialogs, transaction history
- [x] `/dashboard/vesting` — vesting cards with progress bars, create schedule dialog, release button
- [x] `/dashboard/settings` — org name/logo edit, token management, admin list, DAO approver management
- [x] `/dashboard/logs` — activity log table with pagination, action badges, timestamps

## Smart Contracts
- [x] MockUSDC contract (free-mint ERC-20, 6 decimals) — deployed to Base Sepolia at `0x81A36EB4CebEEA49C868932Cd60f6e6e90977164`
- [x] Hardhat project setup (`contracts/`) with deploy script

## Token & Faucet
- [x] `/get-test-tokens` page — select token, enter amount, mint via wallet (MetaMask)
- [x] `GET /api/token?address=` — fetch ERC-20 name/symbol/decimals from RPC
- [x] Contract ABI + address constants (`lib/contracts.ts`)

## Multi-Token Support
- [x] Organization model updated — `tokens[]` array instead of single token
- [x] Onboard form — USDC default + "Add token" with address lookup
- [x] Settings page — add/remove tokens from organization
- [x] Token validation via RPC (name, symbol, decimals fetched on-chain)

## Multi-Admin Access
- [x] Organization model — `admins[]` array of user ObjectIds
- [x] Admin list displayed in settings
- [x] Creator auto-added as first admin on org creation

## Audit Logging
- [x] AuditLog model (orgId, userId, userName, action, details, metadata)
- [x] `logAction()` helper for easy logging from any API route
- [x] `GET /api/audit` — paginated audit logs for org
- [x] Org creation, token add/remove, admin add actions all logged
- [x] `/dashboard/logs` page with full activity history

## Employee Portal (Frontend)
- [x] Portal layout with sidebar navigation (desktop + mobile)
- [x] Role-based route protection (EMPLOYEE only, redirects)
- [x] `/portal` — overview with balance, payments count, active vesting, recent payments
- [x] `/portal/payments` — payment history table with pagination
- [x] `/portal/withdraw` — balance display, withdraw form (amount + destination address/ENS)
- [x] `/portal/vesting` — vesting cards with progress bars, stats (vested/released/locked), cliff tracking

## Database Models
- [x] User model (privyId, email, name, role, ENS, encrypted mnemonic, Unlink address)
- [x] Organization model (name, logo, orgType, tokens[], encrypted EVM key, approvers[], admins[])
- [x] Employee model (userId, orgId, deptId, type, salary, frequency, isActive)
- [x] Department model (name, orgId)
- [x] Payroll model (orgId, deptId, status, totalAmount, employeeCount, approvals)
- [x] Payment model (payrollId, employeeUserId, amount, status)
- [x] Vesting model (orgId, employeeUserId, totalAmount, cliff, duration, released, status)
- [x] Invite model (orgId, email/ENS, token, salary, frequency, type, dept, expiry)
- [x] AuditLog model (orgId, userId, userName, action, details, metadata, timestamps)

## Future Tasks
- [ ] Email notifications via Resend (payroll executed, low treasury, vesting unlock, invite)
- [ ] AI-generated PDF payslips (`@react-pdf/renderer`)
- [ ] Anomaly detection — flag unusual payroll patterns
- [ ] Budget forecasting — AI-powered runway calculator
- [ ] Dark mode support
- [ ] Real-time payroll status polling (after run)
- [ ] Retry logic for failed payroll transfers
- [ ] Employee profile page (update name, view addresses)
- [ ] Manual/ad-hoc payments (bonus, reimbursement)
- [ ] Department-filtered payroll preview
- [ ] Payroll detail page (individual payment breakdown)
- [ ] Invite link expiry display + resend
- [ ] Multi-sig approval threshold configuration for DAOs
- [ ] Treasury runway calculator (months of payroll remaining)
- [ ] Low treasury balance warning banner
- [ ] CSV export for payroll history
- [ ] Mobile-native app (React Native / Expo)
- [ ] Log more actions (employee invite, payroll run, vesting create, settings update)
- [ ] Rate limiting on API routes
- [ ] Input validation with Zod on all API routes
- [ ] E2E tests (Playwright)
- [ ] Unit tests for API routes
