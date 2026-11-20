// Génère les icônes du site (onglet, écran d'accueil, PWA) à partir du logo officiel.
// Usage : node scripts/generer-icones.mjs
// Motif : monogramme « D » + silhouette du logo couleur, sur le fond sombre de la charte (#111111).
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "public/images/DIWA_MAG_LOGO_couleur.png"; // 1864 × 554
const FOND = "#111111";

// Zone du « D » et du panneau silhouette dans le logo source.
const MONOGRAMME = { left: 0, top: 0, width: 684, height: 445 };
// Bout du ruban « Le magazine… » qui déborde dans la zone, sous et à droite du « D » : rendu transparent.
const RUBAN = [
  { left: 260, top: 426, width: 424, height: 19 },
  { left: 440, top: 365, width: 244, height: 80 },
];

async function monogramme() {
  const masques = await Promise.all(
    RUBAN.map(async (r) => ({
      input: await sharp({ create: { width: r.width, height: r.height, channels: 4, background: "#000" } }).png().toBuffer(),
      left: r.left,
      top: r.top,
      blend: "dest-out",
    })),
  );
  return sharp(SOURCE)
    .extract(MONOGRAMME)
    .composite(masques)
    .trim()
    .png()
    .toBuffer();
}

/** Icône carrée : motif centré, `marge` = part du côté laissée libre de chaque bord. */
async function icone(motif, taille, marge) {
  const interieur = Math.round(taille * (1 - 2 * marge));
  const m = await sharp(motif).resize(interieur, interieur, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: taille, height: taille, channels: 4, background: FOND } })
    .composite([{ input: m, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Fichier .ico contenant des images PNG (format accepté par tous les navigateurs actuels). */
function ico(images) {
  const entete = Buffer.alloc(6 + 16 * images.length);
  entete.writeUInt16LE(0, 0);
  entete.writeUInt16LE(1, 2);
  entete.writeUInt16LE(images.length, 4);
  let decalage = entete.length;
  images.forEach(({ taille, png }, i) => {
    const o = 6 + 16 * i;
    entete.writeUInt8(taille >= 256 ? 0 : taille, o);
    entete.writeUInt8(taille >= 256 ? 0 : taille, o + 1);
    entete.writeUInt16LE(1, o + 4); // plans
    entete.writeUInt16LE(32, o + 6); // bits par pixel
    entete.writeUInt32LE(png.length, o + 8);
    entete.writeUInt32LE(decalage, o + 12);
    decalage += png.length;
  });
  return Buffer.concat([entete, ...images.map((i) => i.png)]);
}

const motif = await monogramme();
const fichiers = {
  "public/icons/icon-192.png": await icone(motif, 192, 0.1),
  "public/icons/icon-512.png": await icone(motif, 512, 0.1),
  // Zone de sécurité des icônes « maskable » : cercle de 80 % du côté.
  "public/icons/icon-maskable-512.png": await icone(motif, 512, 0.2),
  "public/icons/apple-touch-icon.png": await icone(motif, 180, 0.12),
  "public/icons/favicon-48.png": await icone(motif, 48, 0.06),
  "app/apple-icon.png": await icone(motif, 180, 0.12),
};
const tailles = [16, 32, 48];
fichiers["app/favicon.ico"] = ico(await Promise.all(tailles.map(async (t) => ({ taille: t, png: await icone(motif, t, 0.04) }))));

for (const [chemin, contenu] of Object.entries(fichiers)) {
  await writeFile(chemin, contenu);
  console.log(`${chemin} (${contenu.length} o)`);
}
