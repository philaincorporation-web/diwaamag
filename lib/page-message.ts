import { echapper } from "@/lib/services";

/** Petite page HTML autonome pour les routes de confirmation (newsletter…). */
export function pageMessage(titre: string, message: string, status = 200, accueil = "/", en = false) {
  const html = `<!doctype html><html lang="${en ? "en" : "fr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${echapper(titre)} — DIWA MAG</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111;color:#fff;font-family:system-ui,sans-serif;padding:16px}main{max-width:480px;text-align:center}h1{font-size:28px;text-transform:uppercase;letter-spacing:.02em;margin:16px 0 8px}p{color:#ffffffcc;line-height:1.6}.logo{font:700 44px Impact,sans-serif}.logo span{color:#cda40e}a{display:inline-block;margin-top:24px;background:#cda40e;color:#111;padding:12px 20px;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:13px}</style></head>
<body><main><div class="logo">DIW<span>A</span></div><h1>${echapper(titre)}</h1><p>${echapper(message)}</p><a href="${accueil}">${en ? "Back to the magazine" : "Retour au magazine"}</a></main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
