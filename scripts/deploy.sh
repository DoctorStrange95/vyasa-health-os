#!/bin/bash
# Cloudflare Pages deploy — called by the Cloudflare build pipeline
# Uses `wrangler pages deploy` which correctly deploys a Pages project
# (NOT `wrangler deploy` which deploys a Worker)
echo "✅ Build output ready — deploying to Cloudflare Pages"
npx wrangler pages deploy dist --project-name vyasa-health-os
