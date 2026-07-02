# ACROSS — Automated Classroom Reservation & Scheduling System

**ACROSS** is a web-based classroom reservation and scheduling platform built for the **College of Business, Economics and Accountancy (CBEA)** at Mariano Marcos State University (MMSU). It helps faculty, staff, and administrators manage room bookings, avoid scheduling conflicts, and keep classroom usage organized in one place.

🔗 **Live app:** [across-cbea.vercel.app](https://across-cbea.vercel.app)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Developer](#developer)
  
---

## Features

> ✏️ Important Features of the System

- 📅 **Classroom reservation & scheduling** — request and manage room bookings for class schedules
- 🚫 **Conflict detection** — prevents double-booking of rooms and time slots
- 👥 **Role-based access** — different views/permissions for faculty and admins
- 📅 **Import Function** — import excel files to upload schedules directly to the website to edit schedules, resolve conflicts, or add complete information on a schedule
- 📊 **Excel export** — generate schedules/reports for offline use or record-keeping
- 📱 **PWA-ready** — installable and usable on mobile devices
- 🔐 **Secure authentication & data storage** via Supabase

---

## Tech Stack

| Layer                 | Technology                                                                        |
| --------------------- | --------------------------------------------------------------------------------- |
| Framework             | [Next.js](https://nextjs.org/) (TypeScript)                                       |
| Styling               | [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)    |
| Database / ORM        | [Supabase](https://supabase.com/) (PostgreSQL) + [Prisma](https://www.prisma.io/) |
| Forms & Validation    | React Hook Form + Zod                                                             |
| Data Fetching / State | React Query, Zustand                                                              |
| Tooling               | ESLint, Prettier, Husky (pre-commit hooks)                                        |
| Deployment            | [Vercel](https://vercel.com/)                                                     |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (20+ recommended)
- npm (or your package manager of choice)
- A [Supabase](https://supabase.com/) project (for database & auth)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Cesshi/across-cbea.git
cd across-cbea

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# then fill in the values — see below

# 4. Generate the Prisma client & apply migrations
npx prisma generate
npx prisma migrate dev

# 5. Run the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the required values, for example:

```env
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Available Scripts

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the development server |
| `npm run build` | Build the app for production |
| `npm run start` | Start the production server  |
| `npm run lint`  | Run ESLint                   |

> ✏️ _Adjust to match the actual scripts in `package.json`._

---

## Project Structure

```
across-cbea/
├── prisma/          # Prisma schema & migrations
├── public/          # Static assets
├── src/             # Application source code
├── .husky/          # Git hooks
├── components.json  # shadcn/ui config
└── .env.local.example
```

---

## Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## Developer

**Cecilia Marie Invencion** — Lead Developer

**James Russell Cayetano** — UI Design

---
