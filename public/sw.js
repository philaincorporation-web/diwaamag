/* Service worker DIWA MAG — stratégies de cache (section 12.1 du document d'architecture) :
 *  - pages et articles : réseau d'abord, repli sur le cache, puis sur /hors-ligne ;
 *  - images : cache d'abord, expiration 30 jours ;
 *  - ressources statiques Next.js : cache d'abord (fichiers versionnés).
 * Le back-office (/admin) et l'API ne sont jamais mis en cache. */
const VERSION = "diwa-v3";
const CACHE_PAGES = `${VERSION}-pages`;
const CACHE_IMAGES = `${VERSION}-images`;
const CACHE_STATIQUE = `${VERSION}-statique`;
const PAGES_HORS_LIGNE = { fr: "/fr/hors-ligne", en: "/en/hors-ligne" };
const pageHorsLigne = (url) => (new URL(url).pathname.startsWith("/en") ? PAGES_HORS_LIGNE.en : PAGES_HORS_LIGNE.fr);
const TRENTE_JOURS = 30 * 24 * 60 * 60 * 1000;
const MAX_PAGES = 60;
const MAX_IMAGES = 150;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_PAGES)
      .then((cache) => cache.addAll([PAGES_HORS_LIGNE.fr, PAGES_HORS_LIGNE.en, "/fr", "/en"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => !c.startsWith(VERSION)).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

async function limiter(nomCache, max) {
  const cache = await caches.open(nomCache);
  const cles = await cache.keys();
  for (let i = 0; i < cles.length - max; i++) await cache.delete(cles[i]);
}

async function reseauDabord(requete) {
  const cache = await caches.open(CACHE_PAGES);
  try {
    const reponse = await fetch(requete);
    if (reponse.ok && reponse.type === "basic") {
      cache.put(requete, reponse.clone()).then(() => limiter(CACHE_PAGES, MAX_PAGES));
    }
    return reponse;
  } catch {
    const enCache = await cache.match(requete, { ignoreVary: true });
    if (enCache) return enCache;
    if (requete.mode === "navigate") return (await cache.match(pageHorsLigne(requete.url))) || Response.error();
    return Response.error();
  }
}

async function imageCacheDabord(requete) {
  const cache = await caches.open(CACHE_IMAGES);
  const enCache = await cache.match(requete);
  if (enCache) {
    const date = Number(enCache.headers.get("sw-date") || 0);
    if (Date.now() - date < TRENTE_JOURS) return enCache;
  }
  try {
    const reponse = await fetch(requete);
    if (reponse.ok || reponse.type === "opaque") {
      const corps = await reponse.clone().blob();
      const entetes = new Headers(reponse.headers);
      entetes.set("sw-date", String(Date.now()));
      cache.put(requete, new Response(corps, { status: reponse.status || 200, headers: entetes })).then(() => limiter(CACHE_IMAGES, MAX_IMAGES));
    }
    return reponse;
  } catch {
    return enCache || Response.error();
  }
}

async function statiqueCacheDabord(requete) {
  const cache = await caches.open(CACHE_STATIQUE);
  const enCache = await cache.match(requete);
  if (enCache) return enCache;
  const reponse = await fetch(requete);
  if (reponse.ok) cache.put(requete, reponse.clone());
  return reponse;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) return;

  if (request.destination === "image" || url.pathname.startsWith("/_next/image")) {
    event.respondWith(imageCacheDabord(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(statiqueCacheDabord(request));
    return;
  }
  if (request.mode === "navigate" || request.headers.get("RSC") === "1") {
    event.respondWith(reseauDabord(request));
  }
});

/* Notifications push : nouveaux articles du magazine et actualités de la Veille Média.
 * Le son de la notification système est géré par le navigateur et l'appareil ; si une page du site
 * est ouverte, elle est prévenue et joue elle-même la signature sonore (selon les réglages du lecteur). */
self.addEventListener("push", (event) => {
  let donnees = {};
  try {
    donnees = event.data ? event.data.json() : {};
  } catch {
    donnees = { title: "DIWA Magazine", body: event.data ? event.data.text() : "" };
  }
  const url = donnees.url || "/";
  const affichage = self.registration.showNotification(donnees.title || "DIWA Magazine", {
    body: donnees.body || "Un nouvel article vient de paraître.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    image: donnees.image || undefined,
    tag: donnees.tag || undefined,
    data: { url },
    lang: url.startsWith("/en") ? "en" : "fr",
  });
  const prevenirPages = self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((fenetres) => fenetres.filter((f) => f.visibilityState === "visible").forEach((f) => f.postMessage({ type: "diwa-notification", genre: donnees.type || "article", titre: donnees.body, url })));
  event.waitUntil(Promise.all([affichage, prevenirPages]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      for (const f of fenetres) {
        if ("focus" in f) {
          f.navigate(cible);
          return f.focus();
        }
      }
      return self.clients.openWindow(cible);
    }),
  );
});
