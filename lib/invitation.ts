// Invitation des administrateurs : mot de passe provisoire et e-mail de bienvenue.
// Le mot de passe provisoire doit être changé à la première connexion (Admin.doitChangerMotDePasse).
import "server-only";
import { randomInt } from "node:crypto";
import { echapper, envoyerEmail } from "@/lib/services";
import { siteUrl } from "@/lib/format";

// Sans caractères ambigus (0/O, 1/l/I) : facile à recopier depuis un téléphone.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** Mot de passe provisoire lisible, ex. « Kp7m-Xq3v-Hd9w » (≈ 70 bits d'entropie). */
export function motDePasseProvisoire() {
  const bloc = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${bloc()}-${bloc()}-${bloc()}`;
}

type Invitation = { nom: string; email: string; role: "SUPER_ADMIN" | "ADMIN"; motDePasse: string; invitePar: string };

export async function envoyerInvitationAdmin(i: Invitation) {
  return envoyerEmail({ a: i.email, sujet: "Votre accès au back-office DIWA MAG", html: htmlInvitation(i) });
}

/** Contenu HTML de l'e-mail d'invitation. */
export function htmlInvitation({ nom, email, role, motDePasse, invitePar }: Invitation) {
  const connexion = siteUrl("/admin/connexion");
  const libelleRole = role === "SUPER_ADMIN" ? "super-administrateur" : "administrateur";
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
  <div style="background:#111;padding:20px;color:#fff;font:bold 28px Impact,Arial">DIW<span style="color:#cda40e">A</span> MAG <span style="font:600 12px Arial;color:#cda40e;letter-spacing:2px">BACK-OFFICE</span></div>
  <div style="padding:24px;border:1px solid #eee;border-top:0">
    <p style="font-size:16px">Bonjour ${echapper(nom)},</p>
    <p style="font-size:15px;line-height:1.6">${echapper(invitePar)} vous a créé un compte <strong>${libelleRole}</strong> sur le back-office du magazine DIWA MAG.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;background:#f6f4ee;border-left:4px solid #cda40e">
      <tr><td style="padding:14px 16px;font-size:14px;line-height:1.9">
        <strong>Adresse de connexion :</strong> <a href="${connexion}" style="color:#9c7c06">${connexion}</a><br>
        <strong>Identifiant (e-mail) :</strong> ${echapper(email)}<br>
        <strong>Mot de passe provisoire :</strong> <span style="font:bold 17px 'Courier New',monospace;letter-spacing:1px">${echapper(motDePasse)}</span>
      </td></tr>
    </table>
    <p><a href="${connexion}" style="display:inline-block;background:#cda40e;color:#111;padding:12px 22px;text-decoration:none;font-weight:bold">Se connecter au back-office</a></p>
    <p style="font-size:14px;line-height:1.6">À votre première connexion, il vous sera demandé de <strong>choisir votre propre mot de passe</strong> (10 caractères au moins). Le mot de passe provisoire ne fonctionnera plus ensuite.</p>
    <p style="font-size:12px;color:#777;line-height:1.5;margin-top:24px">Ne transférez pas cet e-mail. Si vous n'attendiez pas cette invitation, ignorez-le et prévenez la rédaction de DIWA MAG.</p>
  </div>
</div>`;
}

/** Message de retour au super-administrateur, selon que l'e-mail est parti ou non. */
export function messageInvitation(ok: boolean, email: string, motDePasse: string, debut: string) {
  if (ok) return `${debut} Invitation envoyée à ${email} avec ses identifiants. Mot de passe à changer à la première connexion.`;
  return `${debut} L'e-mail d'invitation n'a pas pu partir (sans domaine vérifié, Resend n'envoie qu'à l'adresse du compte Resend). Mot de passe provisoire à transmettre vous-même : ${motDePasse}`;
}
