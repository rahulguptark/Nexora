# Nexora Implementation & System Architecture Documentation

Welcome to the Nexora Technical Documentation Library. This repository of documents is compiled to provide senior architects, database administrators, and developers with complete system visibility.

---

## Document Index

1.  **[Architecture Overview](file:///Users/rahulgupta/Nexora/docs/architecture_overview.md)**
    *   Technical stack composition.
    *   Directory structures & architectural pattern separations.
    *   Design choices (Edge middleware, SQLite limitations).

2.  **[Database Schema Design](file:///Users/rahulgupta/Nexora/docs/database_design.md)**
    *   Entity Relationship Diagram (ERD).
    *   Table definitions, column mapping details.
    *   Multi-seller inventory model design, RBAC permission specifications, and Audit Log tracking schemas.

3.  **[Authentication & Session Flow](file:///Users/rahulgupta/Nexora/docs/auth_flow.md)**
    *   Registration, OTP, and Multi-factor Authentication sequence maps.
    *   JWT cryptographic designs (`access_token` & `refresh_token` HTTP-Only cookie schemas).
    *   Refresh cycle logic and token revocation mechanics.

4.  **[REST API Specification](file:///Users/rahulgupta/Nexora/docs/api_specification.md)**
    *   Endpoint pathways, request structures, payload configurations, and successful JSON outputs.
    *   Scope tables: Authentication, Catalog Queries, Profiles, Addresses, and Administration actions.

5.  **[Data Import & Database Integrity](file:///Users/rahulgupta/Nexora/docs/data_import_and_integrity.md)**
    *   Custom quote-safe CSV string parser explanation.
    *   Database transaction guarantees (`prisma.$transaction`) and automated rollbacks to preserve database consistency.

6.  **[Local Development Guide](file:///Users/rahulgupta/Nexora/docs/development_guide.md)**
    *   Local setup walkthrough: package installation, DB synchronization, environmental variables, and utility CLI commands.

7.  **[Production Deployment Operations Manual](file:///Users/rahulgupta/Nexora/docs/production_deployment.md)**
    *   Production containerization (Docker, docker-compose), SSL reverse proxying (NGINX), automated S3 database backups, and monitoring (Prometheus, Grafana).

8.  **[Platform Testing Strategy](file:///Users/rahulgupta/Nexora/docs/testing_strategy.md)**
    *   Testing hierarchy (unit, integration, E2E, load testing scripts), security parameters (SQL injections, RBAC), and accessibility audits (WCAG 2.1).

9.  **[Platform Performance Optimization Manual](file:///Users/rahulgupta/Nexora/docs/optimization_guide.md)**
    *   Core Web Vitals optimizations, fallback-ready query caching utility templates (Redis), bundle splits parameters (lazy loading), list virtualizations, and dynamic sitemaps (SEO).
