// Niveles derivados de XP acumulada (coins gastados para viewers, beans ganados para hosts).
// Curva raíz: cada nivel cuesta progresivamente más.
const TITLES = ["Novato", "Bronce", "Plata", "Oro", "Platino", "Diamante", "Leyenda"];

export function levelInfo(xp: number) {
  const safe = Math.max(0, xp || 0);
  const level = Math.floor(Math.sqrt(safe) / 8) + 1;
  const title = TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 3))];
  const curBase = Math.pow((level - 1) * 8, 2);
  const nextBase = Math.pow(level * 8, 2);
  const pct = nextBase > curBase ? Math.min(100, Math.round(((safe - curBase) / (nextBase - curBase)) * 100)) : 100;
  return { level, title, pct, nextBase };
}
