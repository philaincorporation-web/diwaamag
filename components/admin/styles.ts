// Classes partagées du back-office — module neutre, importable par les composants serveur ET client.
export const classesBouton = {
  principal: "inline-flex h-10 items-center justify-center gap-2 bg-noir px-4 text-sm font-semibold text-white transition-colors hover:bg-or hover:text-noir disabled:opacity-50",
  or: "inline-flex h-10 items-center justify-center gap-2 bg-or px-4 text-sm font-semibold text-noir transition-colors hover:bg-noir hover:text-white disabled:opacity-50",
  secondaire: "inline-flex h-10 items-center justify-center gap-2 border border-ligne bg-fond px-4 text-sm font-semibold transition-colors hover:border-encre disabled:opacity-50",
  danger: "inline-flex h-10 items-center justify-center gap-2 border border-danger/30 bg-fond px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger hover:text-white disabled:opacity-50",
  lien: "inline-flex items-center gap-1 text-sm font-semibold text-or-fonce hover:text-encre disabled:opacity-50",
};

export const classesChamp = "h-10 w-full border border-ligne bg-fond px-3 text-sm outline-none transition-colors focus:border-or";
