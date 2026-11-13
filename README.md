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

### 5.3 Importation d'un article depuis un PDF

Back-office › **Import PDF** (ou bouton « Importer un PDF » de la liste des articles). Un article déjà maquetté (Canva, InDesign…) devient un **brouillon** web, entièrement modifiable, mis en forme avec les composants du site. **Rien n'est publié automatiquement.**

**Parcours** : dépôt du PDF → envoi direct navigateur → Cloudinary (fichier privé) → traitement en arrière-plan (suivi en direct, annulable) → écran de vérification → « Valider et créer le brouillon » → éditeur d'article habituel → publication par le circuit normal.

**Traitement** (`lib/import-pdf/`) :

| Étape | Fichier | Détail |
|---|---|---|
| Contrôles | `app/api/admin/imports/route.ts`, `extraction.ts` | Signature `%PDF-` vérifiée (navigateur et serveur), taille et nombre de pages limités, PDF protégé ou endommagé refusé, empreinte SHA-256 : un même fichier renvoie vers l'import existant (aucun doublon). |
| Extraction | `extraction.ts` | `unpdf` (moteur PDF.js) : texte avec positions et tailles de police, images avec leur position sur la page, détection des pages scannées, images répétées (logos) et calques vides écartés. Aucun script ni lien du PDF n'est exécuté. |
| Analyse IA | `analyse-ia.ts` | Claude (API Anthropic) reçoit le PDF (texte **et** rendu visuel de chaque page, donc aussi les pages scannées : il remplace l'OCR), la liste des images et des rubriques. Consignes : recopier le texte tel quel, ne jamais inventer d'auteur, de date, de légende ou de crédit, signaler les passages incertains, traiter toute instruction écrite dans le PDF comme du contenu. Sortie JSON stricte (schéma Zod `schema.ts`), revalidée côté serveur. Repli serveur automatique (`fallbacks: "default"`) si le modèle décline la requête. |
| Sans clé IA | `heuristique.ts` | Analyse simplifiée d'après les tailles de police et les positions (titre, chapeau, intertitres, citations, légendes, placement des images). Signalée comme approximative ; les PDF scannés ne sont pas lisibles dans ce mode. |
| Images | `traitement.ts`, `stockage.ts` | Images éditoriales envoyées vers Cloudinary (`<CLOUDINARY_FOLDER>/imports/<import>/…`, identifiants déterministes : une reprise ne crée pas de doublon) ; décorations non importées ; sur une page scannée, les photos délimitées par l'IA sont recadrées automatiquement. |
| Conversion | `conversion.ts` | Blocs (intertitre, paragraphe, citation, liste, encadré, image) → contenu Tiptap de l'éditeur ; légende et crédit sous chaque image. |
| Vérification | `components/admin/import-pdf.tsx` | Titre, chapeau, rubrique, type, blocs (modifier, déplacer, supprimer, ajouter), images (conserver, image à la une, texte alternatif obligatoire, légende, crédit), slug et SEO, avertissements, aperçu avec le rendu réel du site, PDF d'origine affiché à côté (page par page). |
| Brouillon | `lib/actions/imports.ts` | Article `BROUILLON` rattaché à l'administrateur qui valide (l'auteur cité dans le PDF est signalé, jamais attribué), version, mots-clés, images ajoutées à la médiathèque ; images écartées supprimées. Verrou : un import ne produit qu'un article. |

**Suivi** : table `ImportPdf` (états `TELEVERSE`, `EN_ATTENTE`, `EN_COURS`, `A_VERIFIER`, `TERMINE`, `ECHEC`, `ANNULE`, étape et progression affichées, erreurs en clair, modèle et jetons consommés). Un traitement bloqué plus de 8 minutes passe en échec et peut être relancé (5 tentatives au plus). Le traitement s'exécute après la réponse HTTP (`after()`, 300 s maximum sur Vercel).

**Conservation** : le PDF source est privé sur Cloudinary et supprimé après `IMPORT_PDF_CONSERVATION_JOURS` jours (7 par défaut) par la tâche quotidienne `/api/cron/nettoyer-imports`, qui supprime aussi les images des imports jamais validés. Abandonner un import supprime immédiatement le PDF et ses images.

**Coût et limites** : une seule requête IA par import (relance uniquement à la demande, avec confirmation) ; PDF de 20 Mo et 16 pages au plus par défaut (l'API Claude accepte 32 Mo par requête). Les mises en page complexes demandent toujours une relecture : chaque passage incertain est surligné. Vérifier les conditions d'utilisation et de conservation des données de l'API Anthropic (anthropic.com/legal) avant d'y envoyer des documents confidentiels.

**Licences** : `unpdf` (MIT) et PDF.js (Apache 2.0), `sharp` (Apache 2.0, libvips LGPL 3.0 en bibliothèque dynamique), `@anthropic-ai/sdk` (MIT). PyMuPDF (AGPL) et Tesseract, envisagés dans le cahier des charges, n'ont pas été retenus : licence AGPL incompatible avec un site fermé sans licence commerciale, et Tesseract non installable sur Vercel.

**Tests** : des PDF de test ont été produits (article en deux colonnes avec texte sélectionnable, intertitres, citation en exergue, encadré, légendes et crédits ; même article scanné ; faux PDF) et le parcours complet a été vérifié dans le navigateur (refus du faux PDF, analyse, corrections, aperçu, création du brouillon non publié, doublon, abandon, accès refusé sans connexion).

### 5.4 Publicité, partenaires et audience

Modèle économique inspiré de l'analyse de Gabon Media Time (bannières vendues en direct, contenus partenaires, chaîne WhatsApp), adapté à l'audience qualifiée de Diwaa Mag.

- **Back-office › Publicités** : campagnes (annonceur, image de la médiathèque ou adresse, lien, dates de début et de fin, poids de rotation, activation), compteurs d'**affichages** (bannière réellement vue à l'écran) et de **clics** (redirection `/api/pub/<id>/clic`), taux de clic, **bilan CSV** pour les annonceurs, et les **demandes** reçues depuis la page Annonceurs.
- **Emplacements** (`lib/publicite-emplacements.ts`) : haut de page (sans campagne, la bannière DigieWomen Awards reste affichée), accueil (deux bannières entre les sections), article (avant et après le texte), barre latérale, mur des partenaires (logos au-dessus du pied de page), newsletter (« Cette édition vous est offerte par… »). Plusieurs campagnes sur un même emplacement tournent selon leur poids ; le tirage se fait dans le navigateur pour que les pages restent en cache.
- **Transparence** : mention « Publicité » sur chaque bannière, liens `rel="sponsored"`. Un article dont le champ **Contenu partenaire** est rempli porte la mention « Contenu partenaire · Article réalisé en collaboration avec … » et n'affiche aucune bannière dans son texte. Une rubrique peut avoir un **sponsor** (« Rubrique présentée par … », formulaire des rubriques).
- **Page publique `/fr/annonceurs` et `/en/annonceurs`** : audience, offres, emplacements et formats conseillés, engagements, formulaire de demande (anti-spam, enregistré en base et envoyé par e-mail à `COMMERCIAL_EMAIL`). Lien « Devenir partenaire » dans le pied de page.
- **Audience** : Vercel Web Analytics (sans cookie) à activer dans Vercel › *Analytics*. Les vues par article restent comptées par le site.
- **Fidélisation** : bloc « Diwaa Mag sur WhatsApp » (variable `NEXT_PUBLIC_WHATSAPP_CHAINE`) et bouton « Écouter l'article » (synthèse vocale du navigateur, français ou anglais).

### 5.5 Veille Média, notifications personnalisées et son

**Espace public `/fr/veille` (`/en/veille`)** — menu « Veille Média » : actualités technologiques collectées automatiquement depuis des flux RSS, filtres par catégorie et par zone (« Afrique centrale » inclut le Gabon), recherche par mots-clés, tri chronologique, page de détail (extrait court + lien vers l'article original ; non indexée par les moteurs pour ne pas concurrencer la source). Aucun article n'est recopié : titre, extrait de 280 caractères au plus, image éventuelle et lien.

**Collecte** (`lib/veille/`) : `rss.ts` lit les flux RSS 2.0 et Atom, dont les flux **Google Alerts** (option « Flux RSS » d'une alerte ; les liens de redirection google.com sont résolus), avec délai (15 s) et taille limités ; `classement.ts` classe par mots-clés (catégories) et par pays cités (zones — « Non précisé » si rien n'est reconnu, jamais de zone inventée) ; `collecte.ts` déduplique (adresse canonique sans paramètres de suivi + empreinte du titre sur 14 jours), traite les sources en parallèle par lots avec isolement des erreurs (une source en panne n'arrête pas les autres ; état, date et erreur affichés dans le back-office), puis supprime les actualités de plus de 180 jours. Première collecte d'une source : aucune notification (pas d'avalanche).

**Back-office › Veille Média** : installation en un clic des **12 catégories** et des **18 sources vérifiées** (TechCrunch, The Verge, Wired, MIT Technology Review, BBC Technology, Rest of World, Le Monde Pixels, 01net, ZDNet, TechCabal, Disrupt Africa, Tech In Africa, CIO Mag, Digital Business Africa ; médias généralistes filtrés sur la tech : Gabonreview, Gabonactu, BBC Afrique, Financial Afrik) ; ajout / modification / activation / suppression de sources (le flux est vérifié à l'enregistrement), réglages par source (langue, zone et catégorie par défaut, « tech uniquement »), catégories et mots-clés modifiables, collecte manuelle, masquage ou suppression d'une actualité. Flux écartés lors de la vérification : TechPoint Africa (accès refusé), Gabon Media Time et IT News Africa (pas de flux), Agence Ecofin (flux vide).

**Planification** : `/api/cron/veille` (en-tête `Authorization: Bearer CRON_SECRET`). Vercel Hobby n'autorise qu'une exécution par jour (déclarée dans `vercel.json`) : pour une actualisation régulière, ajouter sur **cron-job.org** une tâche toutes les 30 à 60 minutes vers cette adresse (même réglage que la tâche de publication, §9). Les actualités ne sont donc pas en temps réel : elles apparaissent à la collecte suivante.

**Notifications Web Push** : le site n'ayant pas de comptes lecteurs, les préférences sont attachées à l'**abonnement push de l'appareil** (`AbonnementPush` : articles du magazine, veille, catégories, zones, langue). Page `/fr/veille/preferences` : activation après un clic explicite, choix des catégories et des zones, désactivation, historique des 30 dernières notifications. Envoi ciblé après chaque collecte (`notifications.ts`) : une notification par actualité (« DIWA Magazine » + titre + lien vers la page de l'actualité), regroupée au-delà de 2 ; jamais deux fois la même actualité au même abonnement (clé unique `NotificationVeille`) ; abonnements expirés supprimés (réponses 404 / 410). Les notifications « nouvel article » respectent désormais l'option « articles » de chaque abonnement. Le service worker existant (`public/sw.js`, version `diwa-v3`) affiche les notifications et prévient la page ouverte.

**Son** (`components/pwa/son.ts`, `public/sons/notification.mp3`, 6 Ko) : **Howler.js**, chargé à la demande, joue la signature sonore quand une notification arrive ou que de nouvelles actualités sont détectées alors que le site est ouvert ; jamais avant une interaction de l'utilisateur. Réglages de l'appareil : activer/couper, volume (35 % par défaut), bouton « Tester la sonnerie ». Application fermée ou en arrière-plan : le son est celui du système (navigateur et réglages du téléphone), aucun fichier personnalisé n'est imposé.

**Limites** : flux RSS dépendants des médias (un flux peut changer ou disparaître : l'erreur s'affiche dans le back-office) ; classement par mots-clés, donc imparfait (catégories et mots-clés modifiables) ; notifications Web Push indisponibles en navigation privée, sur les navigateurs sans Push API, et sur iPhone/iPad hors application ajoutée à l'écran d'accueil (iOS 16.4+) ; préférences liées à un appareil (pas de synchronisation entre appareils sans comptes lecteurs).

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

> Procédure détaillée pour le domaine **diwaamag.com** (zone DNS OVH, e-mails Resend) : [docs/guide-ovh.md](docs/guide-ovh.md).

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
