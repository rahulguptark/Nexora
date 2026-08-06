# Nexora Production Deployment Operations Manual

This guide documents the procedures for packaging, deploying, monitoring, and scaling the Nexora application inside a production environment.

---

## 1. Containerization & Orchestration

The platform uses **Docker** and **Docker Compose** to containerize the Next.js frontend/backend web application, PostgreSQL database, Redis caching, NGINX reverse proxy, and monitoring suites (Prometheus/Grafana).

### Build and Launch Instructions
To build and spin up the complete platform in detached mode:
```bash
docker-compose up --build -d
```
This automatically:
1. Builds the multi-stage Next.js application image.
2. Boots a PostgreSQL database instance mapping data to a persistent volume.
3. Launches a Redis caching instance.
4. Starts NGINX reverse-proxy, binding ports `80` (redirects to HTTPS) and `443` (terminates SSL and routes to web container).
5. Boots Prometheus and Grafana telemetry monitors.

---

## 2. NGINX Reverse Proxy & SSL

The reverse proxy is defined inside [nginx.conf](file:///Users/rahulgupta/Nexora/nginx.conf). It terminates SSL connections and proxies requests back to the Next.js container:
*   **SSL Certs Location**: Mounts `/etc/nginx/certs/` container path pointing to `/etc/nginx/certs/nexora.crt` and `nexora.key`.
*   **Assets Caching**: Intercepts requests for static assets (`/_next/static/` and `/images/`) and applies aggressive caching:
    ```nginx
    expires 365d;
    add_header Cache-Control "public, max-age=31536000, immutable";
    ```

---

## 3. Database Engine Migration (SQLite to PostgreSQL)

To switch the active database from SQLite to PostgreSQL for production workloads:
1. In `prisma/schema.prisma`, update the datasource block:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Configure the production `DATABASE_URL` environment key inside the `.env.production` file.
3. Execute schema generation and migrate:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

---

## 4. Automated Database Backups

Database backups are executed by the shell script at [backup-db.sh](file:///Users/rahulgupta/Nexora/scripts/backup-db.sh):
*   **Dump Utility**: Executes `pg_dump` to capture complete database schema and row records.
*   **AWS S3 Synchronization**: Uploads zipped backup files (`.sql.gz`) to the designated S3 bucket using the `aws s3 cp` utility.
*   **Local Purge Policy**: Automatically removes files older than 14 days locally to preserve disk space.
*   **Cron Scheduler Configuration**: Configure a cron task on the host server to trigger backups daily at 2:00 AM:
    ```cron
    0 2 * * * /app/scripts/backup-db.sh >> /var/log/db_backups.log 2>&1
    ```

---

## 5. Telemetry & Monitoring (Prometheus & Grafana)

*   **Prometheus**: Configured in [prometheus.yml](file:///Users/rahulgupta/Nexora/prometheus.yml) to scrape metrics at `/api/metrics` from the Next.js web application every 10 seconds.
*   **Grafana**: Exposes dashboards at port `3001` (proxied from internal Grafana port `3000`). Developers can configure queries to plot CPU utilization, DB sync latency, and HTTP response distributions.
