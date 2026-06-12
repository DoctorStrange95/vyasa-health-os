// Proxies the dynamically generated sitemap from the backend so it is served
// on app.vyasaa.com (same origin as the doctor profile URLs it lists).
const BACKEND = 'https://vyasa-os-backend.onrender.com';

export async function onRequestGet() {
  try {
    const r = await fetch(`${BACKEND}/public/sitemap.xml`, {
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!r.ok) return new Response('Sitemap unavailable', { status: 503 });
    return new Response(await r.text(), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Sitemap unavailable', { status: 503 });
  }
}
