<p align="center">
  <img src="web/public/logo.png" alt="Warden" width="80" />
</p>

<h1 align="center">Warden</h1>

<p align="center">
  Private payroll powered by zero knowledge proofs. Pay your team without exposing salaries on chain.
</p>

<p align="center">
  <a href="https://try-warden.vercel.app">Live Demo</a> &middot;
  <a href="https://try-warden.vercel.app/docs">Documentation</a>
</p>

---

## What is Warden

Warden is a private payroll platform that uses zero knowledge proofs to make salary payments completely confidential. Organizations deposit USDC into a shielded privacy pool where funds become indistinguishable. When payroll runs, transfers happen inside the pool so no external observer can see who paid whom or how much. Deposits going in and withdrawals coming out are cryptographically unlinkable.

## Features

**Private Payroll**
- Batch salary payments through a zero knowledge privacy pool
- No one can see individual amounts, recipients, or link payments to the employer
- Supports weekly, biweekly, and monthly pay frequencies

**Treasury Management**
- Deposit USDC directly from your connected wallet into the privacy pool
- Withdraw to any EVM wallet address at any time
- Full audit trail of all treasury operations

**Earn (Yield Vault)**
- Put idle funds to work in DeFi without breaking privacy
- Uses disposable burner wallets to interact with vault contracts
- Deposit USDC, receive lpUSD as proof, withdraw anytime back to the privacy pool
- Burner keys encrypted and stored securely, destroyed after use

**Token Vesting**
- Cliff based linear vesting schedules
- Configurable cliff period and total vesting duration
- Private token release through the zero knowledge pool

**Employee Portal**
- Private balance and payment history
- PDF payslip download for each payment
- Withdraw to any personal wallet
- Earn feature to put private funds into yield vaults

**Team Management**
- Invite employees via email with one click links
- Department organization with member visibility
- Role based access for admins and employees

**Authentication**
- Email, Google, or wallet login via Privy
- Embedded wallets auto created for non crypto users
- No seed phrases or wallet setup required for employees

## Upcoming Features

- Mainnet deployment on Base
- Multi token payroll support beyond USDC
- Real DeFi yield strategies (Aave, Compound, Morpho) via burner wallets
- DAO multi sig approval flow for payroll runs
- Recurring automated payroll scheduling
- Gas sponsorship so employees never need ETH
- Mobile app for employee portal
- Compliance reporting with selective disclosure proofs
- Cross chain payroll support
