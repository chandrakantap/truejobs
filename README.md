# CLAUDE.md — truejobs.tech

## Project Overview

**truejobs.tech** is a high-signal, anti-ghost tech job aggregator and alerting platform. It directly indexes company ATS portals (Greenhouse, Lever, Ashby, Workday) for tech hubs (Bengaluru, Hyderabad, Pune, Gurugram, and Global Remote), bypassing third-party recruitment agency spam and stale listings.

- **Primary Goal:** Provide verified, direct-from-source tech jobs with zero consultancy noise.
- **Monetization Model:** B2C SaaS. Free preview tier + Paid Pro subscription ($19/mo or ₹499/mo) for instant WhatsApp/Telegram alerts and direct ATS application URLs.

---

## Technical Stack

| Layer               | Technology                                                               |
| :------------------ | :----------------------------------------------------------------------- |
| **Framework**       | Next.js 15+ (App Router, Server Actions, TypeScript)                     |
| **Styling & UI**    | Tailwind CSS v4, Shadcn UI, Lucide Icons                                 |
| **Database & Auth** | PostgreSQL                                                               |
| **Auth**            | BetterAUth                                                               |
| **Scraping Engine** | Node.js / TypeScript, Firecrawl API (Public ATS endpoints & JSON boards) |
| **Alert Systems**   | Twilio WhatsApp API, Telegram Bot API                                    |

---

## Core System Architecture & Business Logic
