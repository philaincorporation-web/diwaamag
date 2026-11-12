// Libellés et couleurs des états d'un import, partagés par les pages du back-office.
export const LIBELLES_IMPORT: Record<string, { libelle: string; classe: string }> = {
  TELEVERSE: { libelle: "Envoi en cours", classe: "bg-fond-2 text-texte-doux" },
  EN_ATTENTE: { libelle: "En attente", classe: "bg-fond-2 text-texte-doux" },
  EN_COURS: { libelle: "Analyse en cours", classe: "bg-or-clair text-or-fonce" },
  A_VERIFIER: { libelle: "À vérifier", classe: "bg-or text-noir" },
  TERMINE: { libelle: "Brouillon créé", classe: "bg-succes/10 text-succes" },
  ECHEC: { libelle: "Échec", classe: "bg-danger/10 text-danger" },
  ANNULE: { libelle: "Annulé", classe: "bg-fond-2 text-texte-doux line-through" },
};
