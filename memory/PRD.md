# PRD — PATSI.ID Landing Page

## Original Problem Statement
Build a landing page for patsi.id (PATSI — Perkumpulan Asosiasi Telekomunikasi Indonesia / Asosiasi Perusahaan Content Provider dan Telekomunikasi Indonesia), with the official logo and a showcase of 17 member company logos (GMC, AMC, Lingua Asiatic, Plasma, KSS, Elang, Iguana, ITM, Mitra Mobi Indo, TKI, Max Mobile Media, Arita, Kaliba, KMB, TOG, DMF, Mocoplus). Full spec provided in attached agent(2).md: static site, 4 pages, Bahasa Indonesia, brand colors navy/blue with red accent.

## User Decisions (confirmed)
- 4 pages per spec: Home, About PATSI, Membership, Contact
- Language: Bahasa Indonesia
- Member logos: user uploaded real logo files (daftar logo.zip) — all 17 integrated
- Contact form: functional, sends to pengurus@patsi.id

## Architecture
- Static site (HTML/CSS/vanilla JS + GSAP/Lenis via CDN) served from `/app/frontend/public/` via the frontend dev server (root URL)
- FastAPI backend: `POST /api/contact` — validates, stores message in MongoDB `contact_messages`, sends email via Resend to CONTACT_RECIPIENT (env)
- Backend env: RESEND_API_KEY (empty — pending), SENDER_EMAIL, CONTACT_RECIPIENT=pengurus@patsi.id
- React entry (src/index.js) intentionally blank; React app not used

## User Personas
- Prospective member companies (content provider/telecom) evaluating membership
- Existing members & industry stakeholders seeking org info
- Regulators/partners seeking official contact channel

## Implemented (2026-08-11)
- Home: kinetic masked line-by-line hero, parallax network visual + floating logo card, slow editorial marquee of all 17 member logos, short About, 4 blueprint "Peran PATSI" cards, navy membership CTA, contact CTA
- About: page hero, ecosystem content + framed telecom image, Visi navy quote block, 5 numbered Misi rows, 4 Values cards
- Membership: intro + note box, 6 numbered benefit cards, eligibility, 3-step join process + CTA
- Contact: address/email/phone cards + working form (nama, perusahaan, email, telepon, pesan) with validation and success/error states
- Sticky glassmorphism nav, mobile hamburger full-screen menu, reduced-motion support, data-testid attributes throughout, favicon, SEO meta
- Verified: all 4 pages desktop + mobile (390px), form submission end-to-end (stored in DB)

## Known Limitations / Pending
- Email delivery to pengurus@patsi.id NOT yet active — RESEND_API_KEY is empty in backend/.env. Messages are safely stored in MongoDB (`contact_messages` collection). Add the key + restart backend to activate delivery.
- Note: logo file for "Elang" was provided as Logo_EMS.png — mapped to the Elang slot.

## Backlog
- P0: Activate Resend email delivery (add RESEND_API_KEY to backend/.env)
- P1: News/Events/Blog/Publications pages (explicitly deferred by spec)
- P1: Member logo grid/detail pages with company profiles
- P2: English language toggle
- P2: Admin view for contact messages

## Test Credentials
- No authentication on this site. See /app/memory/test_credentials.md.
