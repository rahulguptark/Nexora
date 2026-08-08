# Nexora Local Development Guide

This guide provides developers and system architects with instructions to initialize, configure, and maintain the Nexora local environment.

---

## 1. Prerequisites & Environment Setup

Make sure you have **Node.js (v22.x or above)** and **npm** installed on your workstation.

### 1.1 Environment Variables
Create a `.env` file in the root directory (or ensure variables are loaded in your deployment runtime):

```ini
# Database Connection String (used by Prisma)
DATABASE_URL="file:./dev.db"

# JWT Secret Key (Minimum 32 characters for security compliance)
JWT_SECRET="super-secret-key-that-is-at-least-32-characters-long-make-sure-to-change-this-in-production"
```

---

## 2. Database Initialization & Seeding

Prisma manages schema definition mapping and SQLite synchronization.

### 2.1 Install Dependencies
Run the initial dependency load:
```bash
npm install
```

### 2.2 Synchronize Database Schema
Push the Prisma models onto the SQLite `dev.db` file:
```bash
npx prisma db push
```
*Note: During production rollouts, use standard migration scripts (`npx prisma migrate dev --name init`) to generate trackable SQL migration logs.*

### 2.3 Inspect Database Contents (Prisma Studio)
Launch the graphical browser interface to inspect SQLite table data:
```bash
npx prisma studio
```
This starts an inspection server at `http://localhost:5555`.

---

## 3. Launching the Application

Start the local Next.js development server:

```bash
npm run dev
```

*   **Endpoint**: [http://localhost:3000](http://localhost:3000)
*   The system uses hot-reloading. Making modifications inside `src/app` will trigger automatic client-side updates.

---

## 4. Coding Conventions & Code Quality

*   **Linter**: The project uses ESLint. Check code style guidelines:
    ```bash
    npm run lint
    ```
*   **Edge Middleware Constraints**:
    Do not import heavy Node runtime modules (`crypto`, `bcrypt`, or third-party file structures) inside `src/middleware.ts`. Middleware is optimized for Vercel Edge Runtime. Use pure ES modules like `jose` for cryptographics.
*   **Database Client Singleton**:
    Do not instantiate `new PrismaClient()` in dynamic route endpoints. Instead, use the singleton instance exported from [prisma.ts](file:///Users/rahulgupta/Nexora/src/lib/prisma.ts) to prevent resource leaks and database connection depletion:
    ```typescript
    import prisma from "@/lib/prisma"
    ```
*   **Types & Validation**:
    Define route payloads using Zod schemas. Apply `safeParse` on input bodies to gracefully output 400 Bad Request responses before querying database transactions.
