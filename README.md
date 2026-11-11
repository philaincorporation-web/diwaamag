# Magazine DIWAA — DIWA MAG

Magazine en ligne des **DigieWomen Awards Africa (DIWAA)**, porté par Digiewomen School (Angondjé Sherko, Akanda, Gabon) : actualité du numérique au Gabon, en Afrique et dans le monde, avec un regard sur les femmes du numérique.

Ce dépôt réunit le **site public**, le **back-office** (`/admin`) et l'**API** de contenu dans une seule application Next.js, conformément au *Document d'architecture de référence v1.0*.

---

## 1. Démarrage rapide

Prérequis : Node.js 20 ou plus récent, une base PostgreSQL (Neon en production).

```bash
npm install                     # installe les dépendances et génère le client Prisma
cp .env.example .env.local      # puis renseigner les variables (voir §4)
cp .env.local .env              # la CLI Prisma lit .env
npm run db:deploy               # applique les migrations
npm run db:seed                 # super-admin, rubriques, articles du DIWA MAG de décembre 2025
npm run dev                     # http://localhost:3000 (→ /fr ou /en) — back-office : /admin
```

> npm 11 bloque les scripts d'installation par défaut : si Prisma signale un moteur manquant, exécuter
> `npm approve-scripts prisma @prisma/engines esbuild` puis `npm rebuild`.

Scripts utiles : `npm run typecheck`, `npm run lint`, `npm run db:migrate` (nouvelle migration), `npm run db:studio`.

## 2. Pile technique

| Couche | Choix | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) | `cacheComponents` + `partialPrefetching` activés |
| Base de données | PostgreSQL (Neon) | adaptateur `@prisma/adapter-pg` |
| ORM | Prisma 7 | schéma : `prisma/schema.prisma` |
| Authentification | Auth.js v5 (identifiants, bcrypt, JWT) | `auth.ts`, rôles `SUPER_ADMIN` / `ADMIN` |
| Médias | Cloudinary (téléversement signé) | repli `public/uploads` en développement uniquement |
| Éditeur | Tiptap 3 | intertitres, listes, citations, liens, images, vidéos YouTube |
| Interface | Tailwind CSS 4, Lucide React | charte : or `#CDA40E`, encre `#111`, titres en **Antonio** |
| Animations | Motion (Framer Motion) | respect de « réduire les animations » |
| E-mails | Resend | newsletter (double opt-in), alertes de modération, contact |
| PWA | manifeste + service worker `public/sw.js` | hors ligne, installation, notifications push (VAPID) |
| Langues | français / anglais (`lib/i18n.ts`) | URL `/fr/…` et `/en/…`, traductions d'articles en base, DeepL facultatif |
| Thème | clair / sombre | jetons CSS, choix mémorisé, réglage du système par défaut |
| Météo | Open-Meteo (gratuit, sans clé) | chargée dans le navigateur, villes du Gabon et d'Afrique, géolocalisation |

## 3. Organisation du code

```
app/
  [lang]/                 site public bilingue (/fr, /en) : accueil, article, rubrique, mot-clé, recherche,
                          vidéos, numéros, auteur, à propos, contact, mentions légales, confidentialité, hors-ligne
  admin/connexion         page de connexion
  admin/(espace)/         back-office : tableau de bord, articles (+ aperçu, versions, version anglaise), Une, médias,
                          rubriques, mots-clés, commentaires, numéros, newsletter, utilisateurs, journal, compte
  api/                    articles, rubriques, numeros (JSON public), push, cron, admin/upload, admin/abonnes.csv
  rss.xml, sitemap.ts, robots.ts, manifest.ts
components/site|admin|pwa composants réutilisables
lib/
  data.ts                 lectures publiques mises en cache ('use cache' + cacheTag)
  actions/                Server Actions (publiques, articles, gestion, session)
  admin.ts                contrôle d'accès + journal d'activité
  content.ts              outils Tiptap (slug, temps de lecture, import Markdown)
  services.ts             Resend, Turnstile, Web Push
  i18n.ts                 langues, dictionnaire FR/EN de l'interface, dates, liens localisés
  traduction.ts           traduction automatique DeepL (contenu Tiptap, mise en forme conservée)
prisma/
  schema.prisma, migrations/, seed.mts
  data/articles-diwa-mag-decembre-2025.md   articles transcrits du DIWA MAG (PDF de décembre 2025)
public/images/mag/        visuels extraits du magazine ; public/icons/ icônes PWA
proxy.ts                  première barrière d'accès à /admin
```

## 4. Variables d'environnement

Toutes sont décrites dans `.env.example` : aucun secret n'est écrit dans le code. Minimum pour démarrer : `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`. Les services facultatifs (Cloudinary, Resend, Turnstile, VAPID, cron) se désactivent proprement s'ils ne sont pas configurés.

## 5. Règles de gestion implémentées

- **Circuit de publication** : Brouillon → (Aperçu de relecture) → Programmé ou Publié → Mis à jour → Archivé ou Corbeille. Dates de première publication et de dernière mise à jour conservées et affichées.
- **Publier exige** une rubrique, un chapeau, une image de Une **et** son texte alternatif (et une URL pour le type Vidéo).
- **Chaque enregistrement crée une `ArticleVersion`** ; toute version est restaurable.
- **Toute action d'un administrateur alimente `JournalActivite`** (connexion, création, publication, modération, suppression…).
- **Seul le super-administrateur** gère les comptes, consulte le journal, supprime définitivement et vide la corbeille. Tous les administrateurs ont les mêmes droits éditoriaux.
- **Commentaires** : nom, e-mail et message requis ; e-mail jamais affiché ; premier commentaire d'une adresse et tout commentaire avec lien → validation manuelle ; ensuite publication directe ; pot de miel, Turnstile (si configuré), 3 envois maximum par adresse/IP toutes les 10 minutes ; bouton « Signaler » (retrait automatique au 3ᵉ signalement) ; réponses de la rédaction.
- **Rendu et performances (ISR)** : les pages publiques sont pré-rendues et mises en cache par étiquettes (`articles`, `article:<slug>`, `rubriques`, `numeros`, `commentaires:<id>`) ; toute publication ou modification invalide immédiatement les étiquettes concernées.
- **Référencement** : métadonnées dynamiques, Open Graph, `sitemap.xml` (avec correspondances FR/EN), `rss.xml`, données structurées `NewsArticle`, balises `hreflang`.

### 5.1 Version anglaise

- **URL** : chaque page existe en `/fr/…` et `/en/…` (pré-rendues toutes les deux). Une adresse sans préfixe (`/`, `/article/x`) est redirigée vers la langue préférée du navigateur, le français par défaut. Le sélecteur **FR / EN** de l'en-tête ouvre la même page dans l'autre langue.
- **Interface** : tous les libellés du site public sont dans `lib/i18n.ts` (dictionnaires `fr` et `en`). Le back-office reste en français.
- **Contenus** : chaque article peut avoir une version anglaise (`ArticleTraduction`) éditée dans *Articles → Version anglaise*. Avec `DEEPL_API_KEY`, un bouton propose une traduction automatique (mise en forme conservée) et chaque **première publication** crée automatiquement une version anglaise marquée « non relue ». Sur le site, une traduction non relue est signalée au lecteur ; sans traduction, la version française s'affiche avec un lien de traduction Google.
- Rubriques (`nomEn`, `descriptionEn`) et numéros (`titreEn`, `editoEn`) ont leurs champs anglais. Les mots-clés restent en français.
- Les 18 articles initiaux sont livrés **avec leur traduction anglaise** (`prisma/data/*.en.md`), à faire relire.

### 5.2 Thème clair / sombre et météo

- **Thème** : bouton soleil/lune dans la barre de navigation. Le choix est mémorisé sur l'appareil ; sans choix, le réglage du système est suivi. Un script exécuté avant l'affichage évite tout flash. Les couleurs sont des jetons CSS (`app/globals.css`) : `encre` s'inverse, `noir` (navigation, pied de page, texte sur l'or) reste sombre.
- **Météo** : pastille dans la barre supérieure (panneau détaillé) et bloc dans la barre latérale de l'accueil. Conditions actuelles, ressenti, humidité, vent, courbe de température sur 24 h (avec infobulle et tableau des données), risque de pluie heure par heure, prévisions sur 7 jours. Villes : Libreville, Port-Gentil, Franceville, Oyem, Lambaréné, Abidjan, Dakar, Paris, ou « Ma position ». Données Open-Meteo chargées par le navigateur (aucune clé, cache de 30 minutes) : les pages restent statiques.

## 6. Écarts au document d'architecture (justifiés)

| Écart | Raison |
| --- | --- |
| Générateur Prisma `prisma-client` (sortie `lib/generated/prisma`) et URL de connexion dans `prisma.config.ts` | Prisma 7 déprécie `prisma-client-js` et le champ `url` du schéma |
| Ajout de `Article.videoUrl` | stocker la vidéo principale des contenus de type Vidéo (dont l'avatar AFDY) |
| Ajout de `Article.dateMiseAJour` | date de mise à jour **éditoriale** affichée au public (exigée en 4.4), distincte de `modifieLe` qui change à chaque écriture technique (vues, statut) |
| Service worker écrit à la main (`public/sw.js`) au lieu de Serwist | Serwist s'appuie sur webpack, alors que Next 16 compile avec Turbopack ; les stratégies de cache de la section 12.1 sont reproduites à l'identique |
| Étape « Relecture » sans statut dédié | l'énumération `StatutArticle` n'en prévoit pas ; la relecture se fait via la page **Aperçu** du back-office |
| Rubrique « Cybersécurité et IA » | libellé court du seed (8.1) retenu plutôt que la forme longue de 4.2 |
| Ajout de `ArticleTraduction`, `Rubrique.nomEn/descriptionEn`, `Numero.titreEn/editoEn` | version anglaise du magazine pour les lecteurs anglophones (demande du porteur de projet) |

## 7. État d'avancement par phase

| Phase | État |
| --- | --- |
| 1. Socle (Next.js, Prisma, Auth, rôles) | ✅ Fait |
| 2. Back-office (articles, médias, rubriques, Une, commentaires) | ✅ Fait |
| 3. Site public (accueil, rubriques, articles, recherche, design, animations) | ✅ Fait |
| 4. Engagement (commentaires, newsletter, numéros, partage) | ✅ Fait — l'envoi réel des e-mails requiert Resend |
| 5. PWA (manifeste, hors ligne, notifications) | ✅ Fait — push actif dès que les clés VAPID sont renseignées ; audit Lighthouse à réaliser sur l'environnement de préproduction |
| 6. Stores | 🔜 Préparé : `/.well-known/assetlinks.json` (TWA), identifiant `com.diwaamagazine.app`, API JSON ; l'emballage Bubblewrap/Capacitor et les comptes développeur restent à faire |

Vérifications effectuées : `tsc` et ESLint sans erreur, `next build` réussi ; parcours de bout en bout dans un vrai navigateur sur le build de production (commentaire modéré puis approuvé, e-mail jamais affiché, limitation anti-abus, refus de publication sans image, publication et régénération immédiate de l'accueil, mise à jour avec versions, corbeille, suppression définitive, version anglaise, journal, inscription newsletter, bascule de langue, bascule de thème, météo).

## 8. Contenu initial

Les 18 premiers articles proviennent du **DIWA MAG — Le magazine de la femme digitale, décembre 2025** : mot de la marraine, dossiers Gabon Digital et stratégie numérique, interview du président de l'ARCEP, portraits (Annie Chrystel Limbourg Iwenga, Obone AI, Pauline Nambane, Charly Minlang-Bekale), DGPE, GT LAB, SSIGA, start-up à suivre, focus internationaux, brunch des nominées. Les textes ont été transcrits fidèlement, les titres et chapeaux adaptés au web, et les visuels recadrés depuis les pages du magazine. Ils sont signés « Rédaction DIWA MAG » (compte désactivé, sans connexion possible). **À faire relire par la rédaction avant mise en ligne.**

## 9. Mise en ligne (Vercel + OVH + Neon)

1. Créer le projet **Neon** (région Francfort) ; copier l'URL *pooled* dans `DATABASE_URL` et l'URL directe dans `DIRECT_URL`.
2. Créer le compte **Vercel** au nom de Digiewomen School et relier le dépôt GitHub. `vercel.json` déclare une tâche cron **quotidienne** (5 h UTC, soit 6 h à Libreville), seule fréquence autorisée par l'offre gratuite Hobby.
3. Renseigner les variables d'environnement (§4) dans *Settings → Environment Variables*. Le script `build` applique automatiquement les migrations.
4. Lancer une fois le seed depuis un poste : `DATABASE_URL=… DIRECT_URL=… npm run db:seed`.
5. Domaine : *Settings → Domains* dans Vercel, puis dans la zone DNS **OVH** : enregistrement A du domaine racine vers l'IP fournie par Vercel, CNAME `www` vers `cname.vercel-dns.com` (ou CNAME du sous-domaine) ; supprimer les anciens enregistrements de parking ; attendre la propagation (HTTPS automatique).
6. E-mails : vérifier le domaine dans Resend et créer les enregistrements **SPF, DKIM et DMARC** dans la zone OVH.
7. **Publication programmée toutes les 10 minutes (gratuit)** : la tâche quotidienne de Vercel ne suffit pas pour publier un article programmé à l'heure près. Créer un compte gratuit sur **cron-job.org** puis *Create cronjob* :
   - URL : `https://<domaine>/api/cron/publier`, méthode GET ;
   - planification : toutes les 10 minutes ;
   - *Advanced → Headers* : `Authorization` = `Bearer <valeur de CRON_SECRET>` (le même secret que dans Vercel) ;
   - activer les alertes d'échec par e-mail.
   La réponse attendue est `{"publies":0}` (ou le nombre d'articles publiés) ; une réponse 401 signifie que l'en-tête ou le secret est incorrect. Le jour où le compte passe en offre Pro, on peut remettre `*/10 * * * *` dans `vercel.json` et supprimer la tâche cron-job.org.
8. Environnements : `main` → production ; `develop` → préproduction (aperçu Vercel protégé par mot de passe).

## 10. Sécurité

Mots de passe hachés (bcrypt, coût 12) ; sessions JWT signées (8 h) ; contrôle d'accès revérifié dans **chaque** Server Action et route d'API d'administration (le proxy n'est qu'une première barrière) ; compte désactivé = accès coupé immédiatement ; limitation des tentatives de connexion ; en-têtes de sécurité ; rendu du contenu riche sans HTML brut (liens filtrés). La double authentification du super-administrateur reste à ajouter (recommandée en 13).
