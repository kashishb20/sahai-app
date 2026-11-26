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

# SahAI — Multilingual AI Retail Co-Pilot (Prototype)

A full-stack MVP built to explore AI-assisted inventory, POS billing, and credit (*Udhar*) management for Indian neighborhood Kirana stores.

🔗 **Live Demo:** [https://sahai-app-five.vercel.app/](https://sahai-app-five.vercel.app/)

---

## Overview
Neighborhood Kirana stores often manage daily sales, inventory restocking, and customer credit (*Udhar*) across fragmented paper registers or complex accounting tools. **SahAI** is a lightweight, mobile-responsive retail co-pilot prototype designed around a store owner's natural workflow and local language.

## Key Features
- **POS Billing & Real-Time Net Profit:** Itemized checkout that automatically deducts SKU stock and calculates daily gross revenue, net profit, and margin percentages.
- **Inventory & Automated Restock Alerts:** Live SKU tracking with low-stock threshold alerts and quick restock workflows.
- **Udhar Ledger & One-Click WhatsApp Recovery:** Tracks customer credit balances and generates pre-filled WhatsApp payment reminders in one tap.
- **Trilingual AI Co-Pilot (English, हिन्दी, ਪੰਜਾਬੀ):** Voice- and text-enabled assistant powered by the Gemini API with deterministic intent parsing and human-in-the-loop confirmation cards before writing changes to the database.
- **Smart Combo Offer Generator:** Analyzes SKU sales velocity to pair top-selling products with slow-moving inventory into localized, shareable WhatsApp promo cards.

## Tech Stack
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide Icons
- **Backend & Database:** Next.js API Routes, PostgreSQL (Supabase)
- **AI & Voice:** Google Gemini API (`@google/genai`), Web Speech API
- **Deployment:** Vercel

## Local Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/kashishb20/sahai-app.git](https://github.com/kashishb20/sahai-app.git)
   cd sahai-app
