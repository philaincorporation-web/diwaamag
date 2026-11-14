# Encarts publicitaires — suite du déploiement et administration des campagnes

Proposition séparée demandée par le cahier des charges (§12, livrable 6). Rien de ce qui suit n'est encore codé.

## Point de départ (phase 1, livrée)

La gestion des campagnes existe déjà en base et dans le back-office : table `Publicite` (annonceur, emplacement, image ordinateur et mobile, textes alternatifs FR / EN, langue de diffusion, lien, dates, poids, activation, compteurs d'affichages et de clics), écran **Publicités**, bilan CSV, demandes reçues depuis la page Annonceurs. La phase 3 enrichit cet existant plutôt que de le remplacer.

## Phase 2 — Enrichissement

| Emplacement | Travail | Base de données |
|---|---|---|
| HP-03, HP-06, HP-08, HP-09, RUB-01 (parrainages) | Brancher `SponsorBadge` dans les en-têtes Météo, Femmes du numérique, Innovation, Espace vidéo, Newsletter et rubriques | Nouvel emplacement `PARRAINAGE` + champ `cible` (ex. `meteo`, `rubrique:cybersecurite-et-ia`) ; les rubriques ont déjà un champ sponsor, à réutiliser |
| HP-04, ART-03 (half-page 300 × 600, ordinateur) | Encart dans la colonne latérale (sticky sur l'article) | Nouvel emplacement `DEMI_PAGE` |
| HP-07 | Déplacer la 2e bannière d'accueil entre « Femmes du numérique » et « Innovation » | Emplacement `ACCUEIL` existant (décalage 1) |
| RUB-02 | Bannière après le 6e article des pages rubriques, exclusivité du sponsor de la rubrique | Champ `cible` ci-dessus |

Chaque ajout d'emplacement = une valeur d'énumération (migration additive) + une entrée dans `config/ads.config.ts` (le champ `emplacement` passe de `null` au nouvel emplacement).

## Phase 3 — Professionnalisation

### 1. Annonceurs et contrats

- Table `Annonceur` (raison sociale, contact, e-mail, téléphone, logo) reliée aux campagnes, au lieu du simple texte actuel.
- Table `Contrat` (annonceur, emplacements vendus, période, montant, statut de paiement `IMPAYE` / `PAYE`, bon de commande en PDF stocké sur Cloudinary, en privé).
- Statut de campagne conforme au cahier : `EN_ATTENTE` → `VALIDEE` (relue par la rédaction) → `EN_COURS` → `TERMINEE`. Une campagne n'est diffusée qu'une fois validée et payée (ou sur dérogation du super-administrateur).

### 2. Validation des créations

- Contrôles automatiques au dépôt : dimensions par emplacement (`SOURCES` dans `components/ads/cadres.ts`), poids (250 Ko pour une image, 1 Mo pour un GIF), formats acceptés.
- Circuit de validation par la rédaction (case « création validée », nom du validateur, date), inscrit au journal d'activité.

### 3. Mesure et rapports

- Remplacer les deux compteurs cumulés par une table journalière `StatPublicite` (campagne, jour, appareil, langue, affichages, clics). Cela permet des courbes par jour et des bilans par période.
- Rapport annonceur automatique (PDF ou page privée partageable) en fin de campagne, et envoi hebdomadaire par e-mail (Resend) pendant la diffusion.
- Tableau de bord du back-office : taux de remplissage de chaque emplacement, campagnes qui se terminent dans les 7 jours, chiffre d'affaires du mois.

### 4. Points à décider avant la phase 3

- Outil de mesure d'audience officiel communiqué aux annonceurs (Vercel Analytics, déjà prévu, ou un autre outil) et mise à jour de la politique de confidentialité.
- Tarifs : grille publique ou « sur devis » uniquement.
- Plafond de rotation sur le billboard HP-01 (2 annonceurs plus le visuel Awards, comme aujourd'hui).
