# Guide — Relier diwaamag.com (OVH) au site hébergé sur Vercel

Ce guide explique, étape par étape, comment faire pointer le nom de domaine **diwaamag.com**, acheté chez OVH, vers le site DIWA MAG hébergé sur Vercel, puis comment configurer les e-mails du domaine.

> **Principe** : OVH reste le *registrar* (le domaine est acheté et renouvelé chez OVH) et garde la **zone DNS**. On y ajoute simplement les enregistrements qui indiquent à Internet que le site se trouve chez Vercel. Rien n'est à transférer.

---

## Sommaire

1. [Avant de commencer](#1-avant-de-commencer)
2. [Valider le domaine chez OVH](#2-valider-le-domaine-chez-ovh)
3. [Ouvrir la zone DNS](#3-ouvrir-la-zone-dns)
4. [Supprimer les enregistrements par défaut](#4-supprimer-les-enregistrements-par-défaut)
5. [Ajouter les enregistrements Vercel](#5-ajouter-les-enregistrements-vercel)
6. [Vérifier les redirections et le CAA](#6-vérifier-les-redirections-et-le-caa)
7. [Valider dans Vercel](#7-valider-dans-vercel)
8. [Adapter la configuration du site](#8-adapter-la-configuration-du-site)
9. [Configurer les e-mails (Resend)](#9-configurer-les-e-mails-resend)
10. [Vérifications finales](#10-vérifications-finales)
11. [Problèmes fréquents](#11-problèmes-fréquents)

---

## 1. Avant de commencer

Il vous faut :

- un accès à l'**espace client OVH** qui a acheté diwaamag.com ;
- un accès au projet **Vercel** `diwaamag` (équipe PHILA TECH) ;
- les domaines `diwaamag.com` et `www.diwaamag.com` **déjà ajoutés** dans Vercel › *Settings › Domains* (c'est le cas).

Valeurs à utiliser (affichées par Vercel, page *Domains*) :

| Type | Sous-domaine | Cible |
|---|---|---|
| A | *(vide)* | `216.198.79.1` |
| CNAME | `www` | `d86e865210277ad5.vercel-dns-017.com.` |

> Si Vercel affiche un jour d'autres valeurs (après suppression et nouvel ajout du domaine par exemple), ce sont **celles de Vercel** qui font foi.

---

## 2. Valider le domaine chez OVH

1. Attendre l'e-mail de confirmation de commande OVH : le domaine doit apparaître dans l'espace client (cela peut prendre de quelques minutes à quelques heures).
2. **Important** — OVH envoie aussi un e-mail « **Vérification de vos coordonnées** » (obligation ICANN pour les .com). Cliquer sur le lien qu'il contient. **Sans cette validation sous 15 jours, le domaine est suspendu** et le site devient inaccessible.
3. Vérifier que les coordonnées du titulaire sont celles de la structure (Digiewomen School / PHILA TECH), avec une adresse e-mail consultée régulièrement : c'est elle qui recevra les avis de renouvellement.
4. Recommandé : activer le **renouvellement automatique** (*Noms de domaine › diwaamag.com › Informations générales › Renouvellement*).

---

## 3. Ouvrir la zone DNS

1. Se connecter sur **https://www.ovh.com/manager/**.
2. Cliquer sur **Web Cloud** dans le menu du haut.
3. Colonne de gauche : **Noms de domaine** › **diwaamag.com**.
4. Ouvrir l'onglet **Zone DNS**.

La liste des enregistrements existants s'affiche (colonnes *Domaine*, *TTL*, *Type*, *Cible*).

> Astuce : avant toute modification, utiliser **Changer en mode textuel** pour copier le contenu de la zone dans un fichier. Cela permet de revenir en arrière en cas d'erreur.

---

## 4. Supprimer les enregistrements par défaut

À l'achat, OVH crée des enregistrements qui pointent vers sa page « parking ». Ils entrent en conflit avec Vercel et doivent être supprimés.

Pour chaque ligne ci-dessous : bouton **…** au bout de la ligne › **Supprimer l'entrée** › **Confirmer**.

| Domaine affiché | Type | Action |
|---|---|---|
| `diwaamag.com.` | **A** | Supprimer |
| `diwaamag.com.` | **AAAA** | Supprimer |
| `www.diwaamag.com.` | **A**, **AAAA** ou **CNAME** | Supprimer |

**Ne pas toucher** aux lignes suivantes :

- **NS** (serveurs DNS du domaine) ;
- **MX** et leurs **TXT/SPF** associés, si une offre e-mail OVH est utilisée ;
- tout autre enregistrement dont vous ne connaissez pas l'usage (en cas de doute, demander avant).

> Pourquoi supprimer le **AAAA** ? C'est l'adresse IPv6 de la page parking d'OVH. Si elle reste, une partie des visiteurs (ceux qui ont l'IPv6, fréquent sur mobile) arrivera sur la page OVH au lieu du site.

---

## 5. Ajouter les enregistrements Vercel

### 5.1 Domaine principal (A)

1. Cliquer sur **Ajouter une entrée** (au-dessus de la liste, à droite).
2. Choisir **A**.
3. **Sous-domaine** : laisser **vide**.
4. **TTL** : par défaut.
5. **Cible** : `216.198.79.1`
6. **Suivant** › vérifier le récapitulatif (`diwaamag.com. IN A 216.198.79.1`) › **Valider**.

### 5.2 Sous-domaine www (CNAME)

1. Cliquer sur **Ajouter une entrée**.
2. Choisir **CNAME**.
3. **Sous-domaine** : `www`
4. **TTL** : par défaut.
5. **Cible** : `d86e865210277ad5.vercel-dns-017.com.` — **avec le point final**.
6. **Suivant** › vérifier le récapitulatif (`www.diwaamag.com. IN CNAME d86e865210277ad5.vercel-dns-017.com.`) › **Valider**.

> **Le point final compte.** Sans lui, OVH complète la cible avec `.diwaamag.com` et elle devient `…vercel-dns-017.com.diwaamag.com`, ce qui ne fonctionne pas.
>
> Si OVH refuse le CNAME en signalant un conflit, c'est qu'une autre ligne `www` existe encore : la supprimer (étape 4) puis recommencer.

### 5.3 Résultat attendu

En mode textuel, la zone doit contenir (en plus des NS, SOA et éventuels MX/TXT) :

```
@      IN A      216.198.79.1
www    IN CNAME  d86e865210277ad5.vercel-dns-017.com.
```

---

## 6. Vérifier les redirections et le CAA

**Redirections OVH** — onglet **Redirection** du domaine : s'il contient une redirection (vers une ancienne adresse, une page Facebook…), la **supprimer**. Une redirection OVH crée des enregistrements cachés qui écrasent ceux de Vercel.

**CAA** — si la zone contient une ligne de type **CAA**, elle doit autoriser Let's Encrypt, l'autorité qui délivre le certificat HTTPS de Vercel :

```
@  IN CAA  0 issue "letsencrypt.org"
```

Sans ligne CAA, il n'y a rien à faire.

**DNSSEC** — s'il est activé par OVH (onglet *DNSSEC*), le laisser activé : il est compatible avec Vercel tant que la zone reste chez OVH.

---

## 7. Valider dans Vercel

1. Attendre la **propagation** : en général 5 à 30 minutes, parfois jusqu'à 24 h (le temps que les anciens enregistrements expirent dans les caches).
2. Vercel › projet **diwaamag** › **Settings › Domains**.
3. Cliquer sur **Refresh** pour `diwaamag.com`, puis pour `www.diwaamag.com`.
4. Les mentions rouges « Invalid Configuration » doivent disparaître au profit d'une coche bleue/verte.
5. Vercel génère ensuite **automatiquement** le certificat HTTPS (quelques minutes).

---

## 8. Adapter la configuration du site

Le site construit ses liens absolus (sitemap, flux RSS, partages sur les réseaux sociaux, e-mails) à partir de la variable `NEXT_PUBLIC_SITE_URL`. Elle doit correspondre à l'**adresse principale** choisie dans Vercel.

Réglage actuel dans Vercel : `diwaamag.com` **redirige vers** `www.diwaamag.com`. Deux possibilités :

| Choix | Dans Vercel › Domains | `NEXT_PUBLIC_SITE_URL` |
|---|---|---|
| Adresse avec www (réglage actuel) | rien à changer | `https://www.diwaamag.com` |
| Adresse sans www (plus courte) | *Edit* sur `www.diwaamag.com` › rediriger vers `diwaamag.com` ; *Edit* sur `diwaamag.com` › aucune redirection | `https://diwaamag.com` |

Les enregistrements OVH sont **les mêmes** dans les deux cas.

Ensuite :

1. Vercel › **Settings › Environment Variables** › modifier `NEXT_PUBLIC_SITE_URL` (environnement *Production*).
2. **Deployments** › dernier déploiement › **…** › **Redeploy** (les variables `NEXT_PUBLIC_…` sont intégrées au moment de la construction : un redéploiement est obligatoire).

---

## 9. Configurer les e-mails (Resend)

Le site envoie des e-mails (newsletter, invitations des administrateurs, alertes de modération, formulaire de contact) depuis `redaction@diwaamag.com` via **Resend**. Pour qu'ils ne finissent pas en spam, le domaine doit être vérifié.

### 9.1 Côté Resend

1. Créer un compte sur **resend.com** (au nom de la structure).
2. **Domains › Add Domain** › `diwaamag.com` › région **Ireland (eu-west-1)**, la plus proche.
3. Resend affiche 3 à 4 enregistrements à créer. Les garder ouverts dans un onglet.

### 9.2 Côté OVH (zone DNS)

Pour chaque enregistrement fourni par Resend : **Ajouter une entrée**, choisir le type indiqué, puis recopier.

| Type | Sous-domaine (OVH) | Cible | Rôle |
|---|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0…` *(longue clé fournie par Resend)* | DKIM : signature des e-mails |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com.` — priorité `10` | retours d'erreurs |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | SPF : serveurs autorisés |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:redaction@diwaamag.com` | DMARC : politique anti-usurpation |

Points d'attention :

- **Sous-domaine** : saisir uniquement la partie indiquée (`resend._domainkey`, `send`, `_dmarc`), **jamais** `…diwaamag.com` à la suite : OVH l'ajoute tout seul.
- **Copier les valeurs depuis Resend** (bouton de copie) plutôt que depuis ce tableau : la clé DKIM est propre à votre compte.
- Pour un enregistrement **TXT**, OVH propose parfois le type « SPF » ou « DKIM » : choisir simplement **TXT**.
- Le SPF de Resend est placé sur `send`, il ne gêne donc pas un éventuel SPF OVH sur le domaine principal.
- DMARC : commencer en `p=none` (observation). Après quelques semaines sans problème, passer à `p=quarantine`.

### 9.3 Validation

1. Resend › **Domains** › `diwaamag.com` › **Verify DNS Records**. Les lignes passent en *Verified* (de quelques minutes à quelques heures).
2. Créer une clé : **API Keys › Create API Key** (droit *Sending access*, domaine `diwaamag.com`).
3. Dans Vercel › **Environment Variables** :
   - `RESEND_API_KEY` = la clé créée ;
   - `EMAIL_FROM` = `DIWA MAG <redaction@diwaamag.com>` ;
   - `ADMIN_NOTIFICATION_EMAIL`, `CONTACT_EMAIL`, `COMMERCIAL_EMAIL` = adresses qui **reçoivent** les messages.
4. **Redeploy**.

### 9.4 Recevoir des e-mails sur @diwaamag.com (facultatif)

Resend ne fait qu'**envoyer**. Pour **recevoir** des messages sur `redaction@diwaamag.com` (réponses des lecteurs, par exemple), il faut une boîte mail :

- **Redirection OVH gratuite** : *Noms de domaine › diwaamag.com › Emails › Redirections* (ou offre *MX Plan*) : `redaction@diwaamag.com` → une adresse Gmail existante ;
- ou une offre de messagerie (OVH *MX Plan* / *Exchange*, Google Workspace, Zoho…), qui fournit ses propres enregistrements **MX** à créer sur le domaine principal.

Dans les deux cas, les **MX du domaine principal** sont distincts du MX `send` de Resend : ils cohabitent sans problème.

---

## 10. Vérifications finales

**Dans le navigateur**

- [ ] `https://diwaamag.com` ouvre le site (ou redirige vers `www`, selon le choix de l'étape 8).
- [ ] `https://www.diwaamag.com` ouvre le site.
- [ ] Le cadenas HTTPS est présent, sans avertissement.
- [ ] `http://diwaamag.com` (sans *s*) redirige vers `https://`.
- [ ] `https://www.diwaamag.com/sitemap.xml` contient des adresses en **diwaamag.com** (et non `localhost` ou `vercel.app`).
- [ ] `https://www.diwaamag.com/admin` affiche la page de connexion.

**Outils en ligne (gratuits)**

- **https://dnschecker.org** : saisir `diwaamag.com` (type A) puis `www.diwaamag.com` (type CNAME) pour voir la propagation dans le monde.
- **https://www.mail-tester.com** : envoyer un e-mail depuis le site (inscription à la newsletter, par exemple) vers l'adresse fournie ; viser une note de 9/10 ou plus.

**En ligne de commande (Windows)**

```powershell
Resolve-DnsName diwaamag.com -Type A -Server 8.8.8.8
Resolve-DnsName www.diwaamag.com -Type CNAME -Server 8.8.8.8
Resolve-DnsName resend._domainkey.diwaamag.com -Type TXT -Server 8.8.8.8
```

---

## 11. Problèmes fréquents

| Symptôme | Cause probable | Solution |
|---|---|---|
| Vercel reste en « Invalid Configuration » | Propagation pas terminée, ou ancien A/AAAA OVH encore présent | Attendre 30 min, vérifier l'étape 4, cliquer sur *Refresh* |
| La page « parking » OVH s'affiche encore | Cache du navigateur ou de la box, ou AAAA OVH restant | Supprimer le AAAA, tester en navigation privée ou en 4G |
| OVH refuse d'ajouter le CNAME `www` | Une autre ligne `www` existe | La supprimer, puis ajouter le CNAME |
| Vercel indique une cible incorrecte pour `www` | Point final oublié (cible complétée par OVH) | Modifier la ligne : cible terminée par `.com.` |
| Avertissement de certificat HTTPS | Certificat pas encore émis, ou CAA bloquant | Attendre quelques minutes ; vérifier l'étape 6 |
| Le site s'affiche mais les liens de partage pointent vers `vercel.app` | `NEXT_PUBLIC_SITE_URL` non mis à jour ou pas de redéploiement | Étape 8, puis *Redeploy* |
| Les e-mails n'arrivent pas | Domaine non vérifié dans Resend, ou `RESEND_API_KEY` absente | Étape 9.3 ; consulter Resend › *Logs* |
| Les e-mails arrivent en spam | DKIM ou SPF absents ou mal recopiés | Vérifier dans Resend et avec mail-tester.com |
| Le site devient inaccessible après quelques semaines | Coordonnées ICANN non validées | Étape 2 : cliquer sur le lien de l'e-mail OVH |

---

*Valeurs DNS relevées dans Vercel le 13 novembre 2026. Voir aussi le §9 du [README](../README.md) pour l'ensemble de la mise en ligne (Neon, variables d'environnement, tâches cron).*
