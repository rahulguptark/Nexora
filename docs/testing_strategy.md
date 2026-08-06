# Nexora Platform Enterprise Testing Strategy

This manual outlines the testing protocols, environments, tools, security parameters, and sample test cases executed to guarantee the quality, performance, and security of the Nexora platform.

---

## 1. Automated Testing Architecture

The platform uses a layered testing approach to ensure regression-free execution across code packages:

| Testing Tier | Scope | Frameworks & Tools | Execution Command |
| :--- | :--- | :--- | :--- |
| **Unit Testing** | Cryptography, password hashing, Zod validations, template compilers. | Jest / ts-jest | `npm run test:unit` |
| **Integration Testing** | Database transactions, cart merges, warehouse inventory updates. | Jest / Prisma Client | `npm run test:integration` |
| **E2E Testing** | Complete multi-step browser user scenarios (Cart adds -> Checkout -> Confirmation receipt). | Playwright | `npx playwright test` |
| **Load Testing** | Request latencies, DB pool limits under concurrent virtual users spike. | k6 | `k6 run src/tests/load/k6-checkout.js` |

---

## 2. Security Testing Protocols

### SQL Injection Protection
*   **Prisma Query Escaping**: All database operations use **Prisma Client ORM** which automatically parameterized queries, eliminating direct SQL string concatenation vulnerabilities.
*   **Request Sanitization**: All endpoint controllers parse payloads using **Zod** schema schemas, discarding undeclared attributes and enforcing strict types mapping (e.g. numbers, strings, email validation).

### RBAC Boundaries Verification
*   **Endpoint Access Checks**: Admin routes use `checkCatalogWriteAccess(req)` to check session cookies, verifying if the user has `admin` or `super_admin` role profiles.
*   **Seller Scoped Queries**: Seller dashboard queries automatically filter data by resolves merchant ID based on the logged-in email. No seller can view or modify other sellers' orders or product inventories.
*   **Audit Logging**: Every mutation administrative action is recorded inside the `AuditLog` table capturing the actor, target coordinates, and diff values (`oldValues`, `newValues`).

---

## 3. Accessibility (a11y) & Performance Audits

### WCAG 2.1 Accessibility Checklist
To comply with global accessibility standards (WCAG 2.1 AA):
1.  **Tab Navigation Focus**: Ensure interactive forms (checkout address fields, dropdown selectors) have visible `:focus` borders and logical tab indexing sequences.
2.  **Semantic Elements**: Maintain proper HTML5 semantic structures (e.g. single `<h1>` per page, `<header>`, `<main>`, `<footer>`).
3.  **Color Contrast**: Maintain a minimum contrast ratio of **4.5:1** for standard text and **3.0:1** for large text components against background shades.
4.  **ARIA Tags**: Form inputs must have descriptive `<label>` elements or explicit `aria-label` tags for screen reader compatibility.

### Web Vitals Telemetry Metrics
Platform interfaces are validated against Google Lighthouse targets:
*   **Largest Contentful Paint (LCP)**: Must render under **2.5 seconds** (optimized via Next.js `<Image>` formats and NGINX gzip compression).
*   **Interaction to Next Paint (INP)**: Must respond under **200 milliseconds** (optimized by handling search autocomplete and state mutations asynchronously).
*   **Cumulative Layout Shift (CLS)**: Must stay under **0.1** by defining explicit dimensions for layout containers.
