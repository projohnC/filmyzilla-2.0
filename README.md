# Filmyzilla Movie App

A modern movie browsing and streaming web application built with Next.js.

## Features
- **Browse Movies:** Search and explore the latest movies.
- **Watch Online:** Stream movies directly in the browser with a premium HLS/MKV video player.
- **Auto-Resolve:** Automatically resolves complex download links (like Filmyzilla) to direct streamable links.
- **Responsive Design:** Works beautifully on desktop and mobile.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS / Shadcn UI
- **Scraping/API:** Axios, Cheerio
- **Video Player:** HLS.js, Custom React Components

---

## Deployment Instructions

### 1. Deploying to Vercel (Recommended)

Vercel is the easiest way to deploy Next.js apps.

1.  **Push to GitHub:** Ensure your code is in a GitHub repository.
2.  **Import to Vercel:** Go to [Vercel](https://vercel.com/new), login with GitHub, and select your `filmyzilla` repository.
3.  **Configure Build:**
    *   **Framework Preset:** Next.js
    *   **Build Command:** `npm run build`
    *   **Output Directory:** `.next`
4.  **Environment Variables:** Add any required variables (if any) in the Vercel dashboard.
5.  **Deploy:** Click "Deploy". Vercel will automatically handle Serverless Functions for the API routes.

> [!TIP]
> Vercel automatically sets up CI/CD, so every push to your main branch will trigger a new deployment.

---

### 2. Deploying to Render

Render is a great alternative for full-stack applications.

1.  **Create a New Web Service:** Connect your GitHub repo on [Render](https://dashboard.render.com).
2.  **Configure Service:**
    *   **Runtime:** `Node`
    *   **Build Command:** `npm install && npm run build`
    *   **Start Command:** `npm start`
3.  **Environment Variables:** Add `NODE_VERSION: 20` or higher to ensure compatibility.
4.  **Auto-Deploy:** Keep "Auto-Deploy" on for continuous integration.

> [!IMPORTANT]
> Render's free tier services "spin down" after inactivity. The first request after a spin-down might take a few seconds to respond.

---

## Local Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
