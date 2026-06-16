import { onRequestGet as __dr__slug__js_onRequestGet } from "/Users/doctor_strange/vyasa/functions/dr/[slug].js"
import { onRequestGet as __sitemap_xml_js_onRequestGet } from "/Users/doctor_strange/vyasa/functions/sitemap.xml.js"

export const routes = [
    {
      routePath: "/dr/:slug",
      mountPath: "/dr",
      method: "GET",
      middlewares: [],
      modules: [__dr__slug__js_onRequestGet],
    },
  {
      routePath: "/sitemap.xml",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [__sitemap_xml_js_onRequestGet],
    },
  ]