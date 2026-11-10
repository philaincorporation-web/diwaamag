// Authentification du back-office (Auth.js / NextAuth v5) : identifiants e-mail + mot de passe haché (bcrypt),
// sessions JWT signées avec AUTH_SECRET, rôle porté par le jeton.
import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
  interface User {
    role?: Role;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
  }
}

const schemaConnexion = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

class IdentifiantsInvalides extends CredentialsSignin {
  code = "identifiants";
}

// Limitation simple des tentatives par adresse e-mail (mémoire du processus).
const tentatives = new Map<string, { n: number; depuis: number }>();
function tropDeTentatives(email: string) {
  const maintenant = Date.now();
  const t = tentatives.get(email);
  if (!t || maintenant - t.depuis > 15 * 60_000) {
    tentatives.set(email, { n: 1, depuis: maintenant });
    return false;
  }
  t.n += 1;
  return t.n > 8;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/admin/connexion" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = schemaConnexion.safeParse(credentials);
        if (!parsed.success) throw new IdentifiantsInvalides();
        const { email, password } = parsed.data;
        if (tropDeTentatives(email)) throw new IdentifiantsInvalides();

        const admin = await prisma.admin.findUnique({ where: { email } });
        if (!admin || !admin.actif) throw new IdentifiantsInvalides();
        const ok = await bcrypt.compare(password, admin.motDePasse);
        if (!ok) throw new IdentifiantsInvalides();

        tentatives.delete(email);
        await prisma.admin.update({ where: { id: admin.id }, data: { derniereConnexion: new Date() } });
        await prisma.journalActivite.create({
          data: { adminId: admin.id, action: "CONNEXION", cible: "Session" },
        });
        return { id: admin.id, name: admin.nom, email: admin.email, role: admin.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id;
      if (token.role) session.user.role = token.role;
      return session;
    },
  },
});
