// SEO middleware for public doctor profiles (/dr/:slug).
// Fetches the doctor from the backend and injects per-doctor <title>, meta
// description, canonical URL, Open Graph tags and Physician JSON-LD into the
// built SPA shell before serving it. The React app hydrates unchanged — if
// anything fails, the untouched index.html is served exactly as before.
const BACKEND = 'https://vyasa-os-backend.onrender.com';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function buildDescription(d) {
  const parts = [];
  const spec = d.specialty ? `${d.specialty}` : 'Doctor';
  const clinic = d.clinics?.[0];
  const place = [clinic?.city || '', clinic?.state || ''].filter(Boolean).join(', ');
  parts.push(`Book an appointment with Dr. ${d.name}, ${spec}${place ? ` in ${place}` : ''}.`);
  if (d.yearsExperience) parts.push(`${d.yearsExperience}+ years experience.`);
  if (d.qualification) parts.push(`${d.qualification}.`);
  if (d.consultationFee) parts.push(`Consultation fee ₹${d.consultationFee}.`);
  parts.push('Online booking via Vyasa Health.');
  const full = parts.join(' ');
  if (full.length <= 158) return full;
  const cut = full.slice(0, 158);
  return cut.slice(0, cut.lastIndexOf(' '));
}

function buildJsonLd(d, pageUrl) {
  const clinic = d.clinics?.[0];
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: `Dr. ${d.name}`,
    url: pageUrl,
    medicalSpecialty: d.specialty || undefined,
    description: d.bio ? String(d.bio).slice(0, 300) : undefined,
    image: d.profilePhotoUrl || undefined,
    priceRange: d.consultationFee ? `₹${d.consultationFee}` : undefined,
  };
  if (clinic?.address || clinic?.city) {
    ld.address = {
      '@type': 'PostalAddress',
      streetAddress: clinic.address || undefined,
      addressLocality: clinic.city || undefined,
      addressRegion: clinic.state || undefined,
      postalCode: clinic.pincode || undefined,
      addressCountry: 'IN',
    };
  }
  if (clinic?.lat != null && clinic?.lng != null) {
    ld.geo = { '@type': 'GeoCoordinates', latitude: clinic.lat, longitude: clinic.lng };
  }
  return JSON.stringify(ld).replace(/</g, '\\u003c');
}

function injectMeta(html, d, pageUrl) {
  const title = esc(`Dr. ${d.name} — ${d.specialty || 'Doctor'} | Book Appointment | Vyasa Health`);
  const desc = esc(buildDescription(d));

  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(pageUrl)}$2`)
    .replace(/(<meta property="og:type" content=")[^"]*(")/, '$1profile$2')
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${desc}$2`);

  const extra =
    `<link rel="canonical" href="${esc(pageUrl)}" />\n` +
    (d.profilePhotoUrl ? `    <meta property="og:image" content="${esc(d.profilePhotoUrl)}" />\n` : '') +
    `    <script type="application/ld+json">${buildJsonLd(d, pageUrl)}</script>\n  `;
  return html.replace('</head>', `${extra}</head>`);
}

export async function onRequestGet({ request, env, params }) {
  const url = new URL(request.url);
  const shell = await env.ASSETS.fetch(new URL('/index.html', url.origin));
  let html = await shell.text();

  try {
    const r = await fetch(`${BACKEND}/public/doctor/${encodeURIComponent(params.slug)}`, {
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (r.status === 404) {
      // Unknown slug: serve the shell as a real 404 so crawlers drop it
      return new Response(html, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
      });
    }
    if (r.ok) {
      const doctor = await r.json();
      html = injectMeta(html, doctor, `https://app.vyasaa.com/dr/${encodeURIComponent(params.slug)}`);
    }
  } catch {
    // Backend unreachable — fall through and serve the plain shell
  }

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
