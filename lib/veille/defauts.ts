// Données de départ de la Veille Média : catégories (avec mots-clés de classement), mots-clés
// géographiques et sources RSS vérifiées (flux testés le 13 novembre 2026 : réponse 200 et articles).
// Les mots-clés sont comparés au titre et à l'extrait, sans accents ni casse, mot entier.
// Préfixe « = » : sigle comparé en respectant la casse (« =IA » ne correspond pas à « j'ai »).

export type ZoneVeilleCle = "GABON" | "AFRIQUE_CENTRALE" | "AFRIQUE_OUEST" | "AFRIQUE_EST" | "AFRIQUE_AUSTRALE" | "AFRIQUE_NORD" | "INTERNATIONAL" | "NON_PRECISE";

export const ZONES: Record<ZoneVeilleCle, { fr: string; en: string }> = {
  GABON: { fr: "Gabon", en: "Gabon" },
  AFRIQUE_CENTRALE: { fr: "Afrique centrale", en: "Central Africa" },
  AFRIQUE_OUEST: { fr: "Afrique de l'Ouest", en: "West Africa" },
  AFRIQUE_EST: { fr: "Afrique de l'Est", en: "East Africa" },
  AFRIQUE_AUSTRALE: { fr: "Afrique australe", en: "Southern Africa" },
  AFRIQUE_NORD: { fr: "Afrique du Nord", en: "North Africa" },
  INTERNATIONAL: { fr: "International", en: "International" },
  NON_PRECISE: { fr: "Non précisé", en: "Unspecified" },
};

export const CATEGORIES_DEFAUT: { slug: string; nom: string; nomEn: string; motsCles: string[] }[] = [
  {
    slug: "intelligence-artificielle",
    nom: "Intelligence artificielle",
    nomEn: "Artificial intelligence",
    motsCles: ["intelligence artificielle", "artificial intelligence", "=IA", "=AI", "IA generative", "generative ai", "genai", "chatgpt", "openai", "llm", "grand modele de langage", "large language model", "machine learning", "apprentissage automatique", "deep learning", "reseau de neurones", "neural network", "gemini", "anthropic", "mistral ai", "copilot", "agent ia", "ai agent", "chatbot"],
  },
  {
    slug: "cybersecurite",
    nom: "Cybersécurité",
    nomEn: "Cybersecurity",
    motsCles: ["cybersecurite", "cybersecurity", "cyberattaque", "cyberattack", "cyberattaques", "cyberattacks", "cybercriminalite", "cybercrime", "ransomware", "rancongiciel", "piratage", "hacker", "hackers", "hacking", "phishing", "hameconnage", "malware", "logiciel malveillant", "vulnerabilite", "vulnerability", "faille de securite", "fuite de donnees", "data breach", "zero day", "spyware", "logiciel espion"],
  },
  {
    slug: "big-data",
    nom: "Big Data et Data Science",
    nomEn: "Big Data & Data Science",
    motsCles: ["big data", "data science", "data scientist", "donnees massives", "science des donnees", "analytics", "analyse de donnees", "data analysis", "data center", "datacenter", "data centre", "centre de donnees", "open data", "donnees ouvertes", "base de donnees", "database"],
  },
  {
    slug: "developpement",
    nom: "Développement informatique",
    nomEn: "Software development",
    motsCles: ["developpeur", "developpeurs", "developer", "developers", "programmation", "programming", "code source", "source code", "open source", "github", "logiciel", "software", "javascript", "python", "devops", "cloud computing", "informatique en nuage", "application mobile", "mobile app", "hackathon", "bootcamp"],
  },
  {
    slug: "graphisme-design",
    nom: "Graphisme et Design",
    nomEn: "Graphic design",
    motsCles: ["graphisme", "graphiste", "graphic design", "design graphique", "illustration", "illustrateur", "photoshop", "adobe", "figma", "canva", "typographie", "typography", "motion design", "identite visuelle", "visual identity"],
  },
  {
    slug: "ux-ui",
    nom: "UX/UI Design",
    nomEn: "UX/UI design",
    motsCles: ["=UX", "=UI", "ux design", "ui design", "experience utilisateur", "user experience", "interface utilisateur", "user interface", "ergonomie", "usability", "accessibilite numerique", "web accessibility", "product design", "design produit"],
  },
  {
    slug: "telecoms",
    nom: "Télécommunications et réseaux",
    nomEn: "Telecoms & networks",
    motsCles: ["telecom", "telecoms", "telecommunications", "operateur", "operateurs", "operator", "5g", "4g", "fibre optique", "fiber optic", "fibre", "haut debit", "broadband", "reseau mobile", "mobile network", "satellite", "starlink", "airtel", "moov", "mtn", "vodacom", "safaricom", "cable sous marin", "submarine cable", "connectivite", "connectivity", "arcep", "spectre"],
  },
  {
    slug: "fintech-blockchain",
    nom: "Fintech et Blockchain",
    nomEn: "Fintech & Blockchain",
    motsCles: ["fintech", "fintechs", "mobile money", "paiement mobile", "mobile payment", "mobile payments", "paiement electronique", "digital payment", "digital payments", "neobanque", "neobank", "banque digitale", "digital bank", "crypto", "cryptomonnaie", "cryptomonnaies", "cryptocurrency", "bitcoin", "blockchain", "stablecoin", "ethereum", "m pesa", "mpesa", "e money", "monnaie electronique"],
  },
  {
    slug: "agrotech",
    nom: "AgroTech",
    nomEn: "AgriTech",
    motsCles: ["agritech", "agrotech", "agtech", "agri tech", "agriculture numerique", "digital agriculture", "agriculture intelligente", "smart farming", "precision agriculture", "agriculture de precision", "drone agricole", "irrigation intelligente", "foodtech"],
  },
  {
    slug: "innovation",
    nom: "Innovation et nouvelles technologies",
    nomEn: "Innovation & new tech",
    motsCles: ["innovation", "innovations", "startup", "startups", "start up", "incubateur", "incubator", "accelerateur", "accelerator", "levee de fonds", "funding round", "fundraising", "venture capital", "capital risque", "licorne", "unicorn", "nouvelles technologies", "new technology", "tech", "technologie", "technologies", "technology", "numerique", "smartphone", "smartphones", "iphone", "android", "apple", "google", "microsoft", "meta", "samsung", "nvidia", "semiconducteur", "semiconductor", "puce", "chip"],
  },
  {
    slug: "robotique-iot",
    nom: "Robotique et objets connectés",
    nomEn: "Robotics & IoT",
    motsCles: ["robot", "robots", "robotique", "robotics", "humanoide", "humanoid", "drone", "drones", "objets connectes", "objet connecte", "internet des objets", "internet of things", "=IoT", "capteur", "capteurs", "sensor", "sensors", "domotique", "smart home", "vehicule autonome", "autonomous vehicle", "self driving", "impression 3d", "3d printing"],
  },
  {
    slug: "transformation-numerique",
    nom: "Transformation numérique",
    nomEn: "Digital transformation",
    motsCles: ["transformation numerique", "transformation digitale", "digital transformation", "digitalisation", "numerisation", "dematerialisation", "e gouvernement", "e government", "administration numerique", "gouvernance numerique", "inclusion numerique", "digital inclusion", "fracture numerique", "digital divide", "competences numeriques", "digital skills", "souverainete numerique", "strategie numerique", "economie numerique", "digital economy", "identite numerique", "digital id"],
  },
];

/** Pays, villes et régions reconnus, par zone (Nations unies, avec l'usage francophone pour l'Afrique australe). */
export const MOTS_ZONES: Record<Exclude<ZoneVeilleCle, "INTERNATIONAL" | "NON_PRECISE">, string[]> = {
  GABON: ["gabon", "gabonais", "gabonaise", "gabonaises", "gabonese", "libreville", "port gentil", "franceville", "oyem", "lambarene", "akanda", "owendo"],
  AFRIQUE_CENTRALE: ["afrique centrale", "central africa", "cemac", "ceeac", "cameroun", "cameroon", "camerounais", "yaounde", "douala", "congo", "brazzaville", "kinshasa", "rdc", "drc", "republique democratique du congo", "democratic republic of congo", "tchad", "chad", "ndjamena", "centrafrique", "centrafricaine", "central african republic", "bangui", "guinee equatoriale", "equatorial guinea", "malabo", "sao tome", "angola", "luanda"],
  AFRIQUE_OUEST: ["afrique de l ouest", "west africa", "cedeao", "ecowas", "uemoa", "nigeria", "nigerian", "nigerians", "lagos", "abuja", "ghana", "ghanaian", "accra", "senegal", "senegalais", "dakar", "cote d ivoire", "ivory coast", "ivoirien", "ivoirienne", "abidjan", "mali", "bamako", "burkina faso", "burkina", "ouagadougou", "niger", "niamey", "benin", "cotonou", "togo", "lome", "guinee", "guinea", "conakry", "guinee bissau", "guinea bissau", "sierra leone", "liberia", "gambie", "gambia", "cap vert", "cabo verde", "cape verde", "mauritanie", "mauritania"],
  AFRIQUE_EST: ["afrique de l est", "east africa", "kenya", "kenyan", "nairobi", "ethiopie", "ethiopia", "ethiopian", "addis abeba", "addis ababa", "tanzanie", "tanzania", "dar es salaam", "ouganda", "uganda", "kampala", "rwanda", "kigali", "burundi", "somalie", "somalia", "djibouti", "erythree", "eritrea", "soudan du sud", "south sudan", "madagascar", "maurice", "mauritius", "seychelles", "comores", "comoros"],
  AFRIQUE_AUSTRALE: ["afrique australe", "southern africa", "sadc", "afrique du sud", "south africa", "south african", "sud africain", "johannesburg", "cape town", "le cap", "pretoria", "namibie", "namibia", "botswana", "lesotho", "eswatini", "swaziland", "zimbabwe", "zambie", "zambia", "mozambique", "malawi"],
  AFRIQUE_NORD: ["afrique du nord", "north africa", "maghreb", "maroc", "morocco", "moroccan", "marocain", "rabat", "casablanca", "algerie", "algeria", "algerien", "alger", "algiers", "tunisie", "tunisia", "tunisien", "tunis", "egypte", "egypt", "egyptian", "egyptien", "le caire", "cairo", "libye", "libya", "soudan", "sudan", "khartoum"],
};

/** Pays et villes hors d'Afrique : l'actualité est alors classée « International » (si aucun pays africain n'est cité). */
export const MOTS_INTERNATIONAL = ["etats unis", "united states", "usa", "americain", "americaine", "american", "washington", "new york", "californie", "california", "silicon valley", "san francisco", "chine", "china", "chinois", "chinese", "pekin", "beijing", "shenzhen", "france", "francais", "french", "paris", "europe", "europeen", "european", "union europeenne", "european union", "bruxelles", "brussels", "royaume uni", "united kingdom", "britannique", "british", "londres", "london", "allemagne", "germany", "inde", "india", "indien", "indian", "japon", "japan", "japonais", "japanese", "coree du sud", "south korea", "taiwan", "canada", "bresil", "brazil", "russie", "russia", "ukraine", "israel", "emirats", "dubai", "arabie saoudite", "saudi arabia", "australie", "australia", "singapour", "singapore", "indonesie", "indonesia", "mexique", "mexico", "turquie", "turkey"];

export const SOURCES_DEFAUT: {
  nom: string;
  url: string;
  siteUrl: string;
  langue: "fr" | "en";
  zoneParDefaut: ZoneVeilleCle | null;
  categorieParDefaut: string | null;
  filtrerTech: boolean;
}[] = [
  // Médias technologiques internationaux
  { nom: "TechCrunch", url: "https://techcrunch.com/feed/", siteUrl: "https://techcrunch.com", langue: "en", zoneParDefaut: "INTERNATIONAL", categorieParDefaut: "innovation", filtrerTech: false },
  { nom: "The Verge", url: "https://www.theverge.com/rss/index.xml", siteUrl: "https://www.theverge.com", langue: "en", zoneParDefaut: "INTERNATIONAL", categorieParDefaut: "innovation", filtrerTech: false },
  { nom: "Wired", url: "https://www.wired.com/feed/rss", siteUrl: "https://www.wired.com", langue: "en", zoneParDefaut: "INTERNATIONAL", categorieParDefaut: "innovation", filtrerTech: false },
  { nom: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", siteUrl: "https://www.technologyreview.com", langue: "en", zoneParDefaut: "INTERNATIONAL", categorieParDefaut: "innovation", filtrerTech: false },
  { nom: "BBC Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", siteUrl: "https://www.bbc.com/news/technology", langue: "en", zoneParDefaut: "INTERNATIONAL", categorieParDefaut: "innovation", filtrerTech: false },
  { nom: "Rest of World", url: "https://restofworld.org/feed/latest", siteUrl: "https://restofworld.org", langue: "en", zoneParDefaut: null, categorieParDefaut: "innovation", filtrerTech: false },
  { nom: "Le Monde — Pixels", url: "https://www.lemonde.fr/pixels/rss_full.xml", siteUrl: "https://www.lemonde.fr/pixels/", langue: "fr", zoneParDefaut: "INTERNATIONAL", categorieParDefaut: "innovation", filtrerTech: false },
  { nom: "01net", url: "https://www.01net.com/actualites/feed/", siteUrl: "https://www.01net.com", langue: "fr", zoneParDefaut: "INTERNATIONAL", categorieParDefaut: "innovation", filtrerTech: false },
  { nom: "ZDNet France", url: "https://www.zdnet.fr/feeds/rss/actualites/", siteUrl: "https://www.zdnet.fr", langue: "fr", zoneParDefaut: "INTERNATIONAL", categorieParDefaut: "innovation", filtrerTech: false },
  // Médias technologiques africains
  { nom: "TechCabal", url: "https://techcabal.com/feed/", siteUrl: "https://techcabal.com", langue: "en", zoneParDefaut: null, categorieParDefaut: "innovation", filtrerTech: false },
  { nom: "Disrupt Africa", url: "https://disrupt-africa.com/feed/", siteUrl: "https://disrupt-africa.com", langue: "en", zoneParDefaut: null, categorieParDefaut: "innovation", filtrerTech: false },
  { nom: "Tech In Africa", url: "https://www.techinafrica.com/feed/", siteUrl: "https://www.techinafrica.com", langue: "en", zoneParDefaut: null, categorieParDefaut: "innovation", filtrerTech: false },
  { nom: "CIO Mag", url: "https://cio-mag.com/feed/", siteUrl: "https://cio-mag.com", langue: "fr", zoneParDefaut: null, categorieParDefaut: "transformation-numerique", filtrerTech: false },
  { nom: "Digital Business Africa", url: "https://www.digitalbusiness.africa/feed/", siteUrl: "https://www.digitalbusiness.africa", langue: "fr", zoneParDefaut: null, categorieParDefaut: "transformation-numerique", filtrerTech: false },
  // Médias généralistes : seules les actualités technologiques sont retenues
  { nom: "Gabonreview", url: "https://www.gabonreview.com/feed/", siteUrl: "https://www.gabonreview.com", langue: "fr", zoneParDefaut: "GABON", categorieParDefaut: null, filtrerTech: true },
  { nom: "Gabonactu", url: "https://www.gabonactu.com/feed/", siteUrl: "https://www.gabonactu.com", langue: "fr", zoneParDefaut: "GABON", categorieParDefaut: null, filtrerTech: true },
  { nom: "BBC Afrique", url: "https://www.bbc.com/afrique/index.xml", siteUrl: "https://www.bbc.com/afrique", langue: "fr", zoneParDefaut: null, categorieParDefaut: null, filtrerTech: true },
  { nom: "Financial Afrik", url: "https://www.financialafrik.com/feed/", siteUrl: "https://www.financialafrik.com", langue: "fr", zoneParDefaut: null, categorieParDefaut: null, filtrerTech: true },
];

/** Mots-clés trop généraux pour valider seuls l'intérêt technologique d'un média généraliste. */
export const MOTS_TROP_GENERAUX = new Set(["tech", "technologie", "technologies", "technology", "numerique", "innovation", "innovations", "operateur", "operateurs", "operator", "fibre", "satellite", "spectre", "connectivite", "connectivity", "robot", "robots", "drone", "drones", "capteur", "capteurs", "sensor", "sensors", "logiciel", "software", "illustration", "apple", "google", "microsoft", "meta", "puce", "chip", "crypto"]);
