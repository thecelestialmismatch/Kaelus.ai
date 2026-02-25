# SYNQRA - AI Agent Platform PRD

## Overview
SYNQRA is a world-class AI Agent Platform like Moltbot/Emergent, designed for rapid acquisition (~$300K valuation target).

## Original Problem Statement
Build "the next moltbot" - a powerful AI agent platform with Claude Opus 4.5 extended thinking capabilities.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Framer Motion + Recharts
- **Backend**: FastAPI (Python) + MongoDB
- **AI Integration**: Claude Opus 4.5 via Emergent LLM Key
- **Payments**: Stripe (Free/Pro $49/Enterprise $299)

## User Personas
1. **Enterprise CTO/CISO** - Security-focused, needs compliance features
2. **Developers** - Want AI-powered coding assistance
3. **Business Owners** - Need workflow automation
4. **M&A Buyers** - Looking for acquisition targets

## Core Features (Implemented)
- [x] Premium Dark UI with Glassmorphism (Syne + Manrope fonts)
- [x] Landing Page with hero, features, pricing, CTA
- [x] User Authentication (JWT-based registration/login)
- [x] Dashboard Overview with stats and activity charts
- [x] AI Chat with Claude Opus 4.5 extended thinking
- [x] Agent Builder with 4 templates (Code, Data, Support, Content)
- [x] Compliance Firewall (PII, SSN, Credit Cards, API Keys detection)
- [x] Analytics Dashboard with Recharts visualizations
- [x] Stripe Payments (3-tier pricing)
- [x] Settings page with profile management

## API Endpoints
- POST /api/auth/register - User registration
- POST /api/auth/login - User login
- GET /api/auth/me - Get current user
- POST /api/chat - Send chat message
- GET/POST/PUT/DELETE /api/agents - Agent CRUD
- POST /api/compliance/scan - Scan text for sensitive data
- GET /api/analytics/stats - Get usage statistics
- POST /api/checkout - Create Stripe checkout
- POST /api/webhook/stripe - Handle Stripe webhooks

## Testing Status
- Backend: 100% pass rate
- Frontend: 95%+ pass rate
- Integration: 98% pass rate

## Tech Stack
- React 19, Tailwind CSS, Framer Motion, Recharts
- FastAPI, MongoDB, JWT, bcrypt
- Claude Opus 4.5 (Emergent LLM Key)
- Stripe Payments
- Phosphor Icons, shadcn/ui components

## Backlog (P1/P2)
- [ ] Agent Marketplace
- [ ] Team Management
- [ ] API Key Management
- [ ] PDF Compliance Report Export
- [ ] Webhook Notifications
- [ ] Embeddable Chat Widget
- [ ] Light Mode Theme

## Implementation Date
February 25, 2026

## Valuation Target
$300,000 - Targeting M&A buyers on Acquire.com
