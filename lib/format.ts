export const cop = (cents: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(cents / 100);

export const n = (v: number) => new Intl.NumberFormat("es-CO").format(v ?? 0);
