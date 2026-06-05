import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// On GitHub Pages the app is served from /<repo>/, so derive the base path
// from GITHUB_REPOSITORY (owner/repo). Locally / on Netlify / Vercel it's "/".
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = repo ? `/${repo}/` : "/";

export default defineConfig({
  base,
  plugins: [react()],
});
