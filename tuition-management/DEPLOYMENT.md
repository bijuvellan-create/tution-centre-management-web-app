# Deployment guide

Two things need hosting: the **API** (a long-running Node process) and the
**frontend** (static files). The database is MongoDB Atlas.

```
Browser → Static frontend (CDN/host) → API (Node server) → MongoDB Atlas
```

---

## 1. Prepare MongoDB Atlas

1. Create a free cluster at https://www.mongodb.com/atlas.
2. **Database Access** → add a user with a strong password.
3. **Network Access** → allow your server's IP (use `0.0.0.0/0` only if you must,
   e.g. on a host with dynamic IPs).
4. Copy the connection string and add the database name, e.g.
   `.../smart_tuition?retryWrites=true&w=majority`.

---

## 2. Deploy the backend

Any Node host works (Render, Railway, Fly.io, a VPS, etc.). General steps:

1. Set the environment variables (see the table in the main README). At minimum:

   ```
   NODE_ENV=production
   PORT=5000            # or whatever the host injects
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=<long random string>
   FRONTEND_URL=https://your-frontend-domain
   TZ=Asia/Kolkata
   ```

2. Install and start:

   ```bash
   npm ci --omit=dev
   npm start
   ```

3. Create the first administrator **once**:

   ```bash
   npm run seed:admin
   ```

   The script refuses to run if an administrator already exists, so it is safe to
   leave in your runbook.

> Build step: there is none for the backend — it runs the source directly with
> Node 20+.

### Notes

- `FRONTEND_URL` is the CORS allow-list. Add every origin that should call the
  API, comma-separated (e.g. your production domain and a preview domain).
- The server retries the database connection automatically if Atlas is briefly
  unreachable, and shuts down cleanly on `SIGINT`/`SIGTERM`.
- Health check endpoint for load balancers: `GET /api/health` (returns `200`
  when the database is connected, `503` otherwise).

---

## 3. Deploy the frontend

1. Set the API URL **before** building (Vite bakes it in at build time):

   ```
   VITE_API_URL=https://your-api-domain/api
   VITE_APP_NAME=Smart Tuition Manager
   ```

2. Build the static files:

   ```bash
   npm ci
   npm run build      # output in dist/
   ```

3. Upload `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, S3 +
   CloudFront, Nginx...).

### SPA routing

This is a single-page app, so the host must fall back to `index.html` for
unknown paths. For example, on **Netlify** add a `public/_redirects` file:

```
/*  /index.html  200
```

On **Nginx**:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## 4. Checklist

- [ ] `NODE_ENV=production` on the API
- [ ] `MONGODB_URI` points at Atlas with a least-privilege database user
- [ ] `JWT_SECRET` is long, random and **not** committed anywhere
- [ ] `FRONTEND_URL` lists the real frontend origin(s)
- [ ] `VITE_API_URL` points at the deployed API
- [ ] `npm run seed:admin` has been run once
- [ ] HTTPS is enabled on both the API and the frontend
- [ ] Database backups enabled in Atlas
