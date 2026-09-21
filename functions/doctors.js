// SEO middleware for the doctor directory (/doctors).
// Injects a rich <title>, meta description, canonical URL, Open Graph, and
// JSON-LD MedicalOrganization schema into the SPA shell before Cloudflare
// serves it. React hydrates normally — failure falls back to bare index.html.
const BACKEND = 'https://vyasa-os-backend.onrender.com';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function buildDirectoryJsonLd(doctors, pageUrl) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Doctors in India — Vyasa Health',
    url: pageUrl,
    description: 'Browse verified doctors across India. Book appointments online with zero commission.',
    numberOfItems: doctors.length,
    itemListElement: doctors.slice(0, 10).map((d, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Physician',
        name: `Dr. ${d.name}`,
        url: `https://app.vyasaa.com/dr/${d.profileSlug}`,
        medicalSpecialty: d.specialty || undefined,
        image: d.profilePhotoUrl || undefined,
        address: d.city || d.state ? {
          '@type': 'PostalAddress',
          addressLocality: d.city || undefined,
          addressRegion: d.state || undefined,
          addressCountry: 'IN',
        } : undefined,
      },
    })),
  };
  return JSON.stringify(ld).replace(/</g, '\\u003c');
}

function injectDirectoryMeta(html, doctors, pageUrl) {
  const specialties = [...new Set(doctors.slice(0, 30).map(d => d.specialty).filter(Boolean))].slice(0, 6).join(', ');
  const cities = [...new Set(doctors.slice(0, 30).map(d => d.city).filter(Boolean))].slice(0, 5).join(', ');

  const title = esc('Find a Doctor in India — Book Appointment Online | Vyasa Health');
  const desc = esc(
    `Browse ${doctors.length > 0 ? doctors.length + '+ ' : ''}NMC-verified doctors in India${cities ? ` — ${cities}` : ''}.` +
    (specialties ? ` Specialties include ${specialties}.` : '') +
    ' Book doctor appointments online with zero commission. Real-time slot availability.'
  );

  const keywords = esc(
    'find doctor online India, book doctor appointment, NMC verified doctor, ' +
    (specialties ? specialties + ', ' : '') +
    (cities ? 'doctor in ' + cities.split(', ').join(', doctor in ') + ', ' : '') +
    'online OPD, consult doctor India, Vyasa Health'
  );

  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${esc(pageUrl)}$2`)
    .replace(/(<meta property="og:type" content=")[^"]*(")/, '$1website$2')
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${desc}$2`);

  const extra =
    `<link rel="canonical" href="${esc(pageUrl)}" />\n` +
    `    <link rel="alternate" hreflang="en-IN" href="${esc(pageUrl)}" />\n` +
    `    <meta name="keywords" content="${keywords}" />\n` +
    `    <meta name="geo.region" content="IN" />\n` +
    `    <meta name="geo.placename" content="India" />\n` +
    `    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />\n` +
    `    <script type="application/ld+json">${buildDirectoryJsonLd(doctors, pageUrl)}</script>\n  `;
  return html.replace('</head>', `${extra}</head>`);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const shell = await env.ASSETS.fetch(new URL('/index.html', url.origin));
  let html = await shell.text();

  try {
    const r = await fetch(`${BACKEND}/public/doctors?limit=50`, {
      cf: { cacheTtl: 1800, cacheEverything: true },
    });
    if (r.ok) {
      const data = await r.json();
      const doctors = data.doctors || [];
      html = injectDirectoryMeta(html, doctors, 'https://app.vyasaa.com/doctors');
    }
  } catch {
    // Backend unreachable — serve plain shell
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  });
}
