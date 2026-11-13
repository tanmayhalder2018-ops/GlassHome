import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Writes sitemap.xml and robots.txt into the build for the canonical domain
 * (VITE_SITE_URL). The site is a single page, so the sitemap lists one URL,
 * plus the portfolio photos as image entries for Google Images.
 */
function seoFiles(siteUrl: string): Plugin {
  const today = new Date().toISOString().slice(0, 10)
  return {
    name: 'seo-files',
    apply: 'build',
    generateBundle() {
      if (siteUrl) {
        const manifest = JSON.parse(readFileSync(new URL('./src/data/image-manifest.json', import.meta.url), 'utf8')) as Record<
          string,
          { sizes: number[] }
        >
        const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        const images = [
          `${siteUrl}/images/trisha-portrait.jpg`,
          ...Object.entries(manifest).map(([slug, m]) => `${siteUrl}/images/work/${slug}-${Math.max(...m.sizes)}.webp`),
        ]
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${esc(siteUrl)}/</loc>
    <lastmod>${today}</lastmod>
${images.map((u) => `    <image:image><image:loc>${esc(u)}</image:loc></image:image>`).join('\n')}
  </url>
</urlset>
`,
        })
      }
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
  if (!siteUrl) console.warn('[seo] No VITE_SITE_URL set — canonical/og:url and sitemap.xml are omitted.')
  else if (!/^https:\/\/[^/]+$/.test(siteUrl)) throw new Error(`[seo] VITE_SITE_URL must be https://host with no path: ${siteUrl}`)
  return {
    plugins: [react(), siteUrlHtml(siteUrl), seoFiles(siteUrl)],
    build: { target: 'es2020', cssCodeSplit: false },
  }
})
