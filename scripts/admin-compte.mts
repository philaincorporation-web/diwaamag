// Dépannage des comptes du back-office, sur n'importe quelle base (locale ou Neon de production).
//
//   npx tsx scripts/admin-compte.mts --env .env.neon lister
//   npx tsx scripts/admin-compte.mts --env .env.neon mot-de-passe adresse@exemple.com
//   npx tsx scripts/admin-compte.mts --env .env.neon creer adresse@exemple.com "Nom Prénom"
//   npx tsx scripts/admin-compte.mts --env .env.neon changer-email ancienne@exemple.com nouvelle@exemple.com
//
// --env : fichier contenant DIRECT_URL (ou DATABASE_URL) de la base visée. Sans --env, .env est utilisé.
// « mot-de-passe » génère un mot de passe provisoire, réactive le compte et l'affiche une seule fois.
// « creer » crée un SUPER_ADMIN avec un mot de passe provisoire (ou le réinitialise s'il existe déjà).
import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client.ts";

const args = process.argv.slice(2);
const iEnv = args.indexOf("--env");
const fichierEnv = iEnv >= 0 ? args.splice(iEnv, 2)[1] : ".env";
config({ path: fichierEnv, override: true, quiet: true });

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error(`Aucune DIRECT_URL ni DATABASE_URL dans ${fichierEnv}.`);
  process.exit(1);
}
const hote = url.replace(/^.*@/, "").replace(/[/?].*$/, "");
console.log(`Base visée : ${hote} (fichier ${fichierEnv})\n`);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 1 }) });
const [commande, emailBrut, nom] = args;
const email = emailBrut?.trim().toLowerCase();

function motDePasseProvisoire() {
  // 16 caractères lisibles (sans 0/O, 1/l/I) + un symbole.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const octets = randomBytes(16);
  return Array.from(octets, (o) => alphabet[o % alphabet.length]).join("") + "!";
}

try {
  if (commande === "lister") {
    const admins = await prisma.admin.findMany({
      orderBy: { creeLe: "asc" },
      select: { email: true, nom: true, role: true, actif: true, derniereConnexion: true },
    });
    if (!admins.length) console.log("Aucun compte : le seed n'a pas été lancé sur cette base.");
    console.table(
      admins.map((a) => ({
        email: a.email,
        nom: a.nom,
        role: a.role,
        actif: a.actif ? "oui" : "NON",
        "dernière connexion": a.derniereConnexion?.toISOString().slice(0, 16).replace("T", " ") ?? "jamais",
      })),
    );
  } else if ((commande === "mot-de-passe" || commande === "creer") && email) {
    const mdp = motDePasseProvisoire();
    const hache = await bcrypt.hash(mdp, 12);
    const existant = await prisma.admin.findUnique({ where: { email } });
    if (!existant && commande === "mot-de-passe") {
      console.error(`Aucun compte ${email} sur cette base. Utilisez « creer » ou vérifiez avec « lister ».`);
      process.exit(1);
    }
    if (existant) {
      await prisma.admin.update({
        where: { email },
        data: { motDePasse: hache, actif: true, doitChangerMotDePasse: true },
      });
    } else {
      await prisma.admin.create({
        data: {
          email,
          nom: nom || "Super Administrateur",
          motDePasse: hache,
          role: "SUPER_ADMIN",
          doitChangerMotDePasse: true,
        },
      });
    }
    console.log(`${existant ? "Mot de passe réinitialisé" : "Compte SUPER_ADMIN créé"} pour ${email}.`);
    console.log(`Mot de passe provisoire : ${mdp}`);
    console.log("À changer dès la connexion (back-office › Mon compte).");
  } else if (commande === "changer-email" && email && nom) {
    const nouvel = nom.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nouvel)) {
      console.error(`Adresse invalide : ${nouvel}`);
      process.exit(1);
    }
    if (!(await prisma.admin.findUnique({ where: { email } }))) {
      console.error(`Aucun compte ${email} sur cette base.`);
      process.exit(1);
    }
    if (await prisma.admin.findUnique({ where: { email: nouvel } })) {
      console.error(`L'adresse ${nouvel} est déjà utilisée par un autre compte.`);
      process.exit(1);
    }
    await prisma.admin.update({ where: { email }, data: { email: nouvel } });
    console.log(`Adresse modifiée : ${email} -> ${nouvel}`);
  } else {
    console.log(
      "Commandes : lister | mot-de-passe <email> | creer <email> [\"Nom\"] | changer-email <ancien> <nouveau>   (option --env <fichier>)",
    );
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
