// Applique les migrations Prisma au build, avec plusieurs tentatives.
// Neon met la base en veille après quelques minutes d'inactivité (offre gratuite) : la première
// connexion peut échouer (P1001) le temps que la base se réveille. On réessaie donc jusqu'à 5 fois.
import { spawnSync } from "node:child_process";

const TENTATIVES = 5;
const ATTENTE_MS = 8000;
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

for (let i = 1; i <= TENTATIVES; i++) {
  const r = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: true });
  if (r.status === 0) process.exit(0);
  if (i < TENTATIVES) {
    console.warn(`Migrations : tentative ${i}/${TENTATIVES} échouée (base en cours de réveil ?), nouvel essai dans ${ATTENTE_MS / 1000} s…`);
    await attendre(ATTENTE_MS);
  }
}
console.error("Migrations : échec après plusieurs tentatives. Vérifiez DATABASE_URL / DIRECT_URL et l'état du projet Neon.");
process.exit(1);
