import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/** Writes sitemap.xml and robots.txt into the build using VITE_SITE_URL from .env */
function seoFiles(siteUrl: string): Plugin {
  const today = new Date().toISOString().slice(0, 10)
  return {
    name: 'seo-files',
    apply: 'build',
    generateBundle() {
      if (siteUrl) this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`,
      })
    },
  }
}

/** Fills __SITE_URL__ in index.html; drops absolute-URL tags if no address is known yet. */
function siteUrlHtml(siteUrl: string): Plugin {
  return {
    name: 'site-url-html',
    transformIndexHtml(html) {
      if (siteUrl) return html.replaceAll('__SITE_URL__', siteUrl)
      return html
        .split('\n')
        .filter((l) => !/rel="canonical"|property="og:url"/.test(l))
        .join('\n')
        .replaceAll('__SITE_URL__', '')
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // 1) VITE_SITE_URL from .env / Netlify settings, 2) Netlify's own site address (URL), 3) none.
  const siteUrl = (env.VITE_SITE_URL || process.env.URL || '').replace(/\/$/, '')
  if (!siteUrl) console.warn('[seo] No VITE_SITE_URL set — canonical/og:url omitted and sitemap uses relative paths.')
  return {
    plugins: [react(), siteUrlHtml(siteUrl), seoFiles(siteUrl)],
    build: { target: 'es2020', cssCodeSplit: false },
  }
})
