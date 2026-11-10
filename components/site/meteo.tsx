"use client";

// Météo en direct (Open-Meteo : gratuit, sans clé, données chargées dans le navigateur pour garder les pages statiques).
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  LocateFixed,
  Moon,
  Sun,
  Table2,
  Wind,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLangue } from "@/components/i18n/contexte";
import { LOCALES, type Langue } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useValeurNavigateur } from "@/lib/hooks";

type Ville = { id: string; nom: string; lat: number; lon: number };

export const VILLES: Ville[] = [
  { id: "libreville", nom: "Libreville", lat: 0.4162, lon: 9.4673 },
  { id: "port-gentil", nom: "Port-Gentil", lat: -0.7193, lon: 8.7815 },
  { id: "franceville", nom: "Franceville", lat: -1.6333, lon: 13.5833 },
  { id: "oyem", nom: "Oyem", lat: 1.5993, lon: 11.5793 },
  { id: "lambarene", nom: "Lambaréné", lat: -0.7, lon: 10.2333 },
  { id: "abidjan", nom: "Abidjan", lat: 5.36, lon: -4.0083 },
  { id: "dakar", nom: "Dakar", lat: 14.6928, lon: -17.4467 },
  { id: "paris", nom: "Paris", lat: 48.8566, lon: 2.3522 },
];

type Donnees = {
  actuel: { temp: number; ressenti: number; humidite: number; vent: number; code: number; jour: boolean; heure: string };
  heures: { t: string; temp: number; pluie: number; code: number }[];
  jours: { date: string; code: number; min: number; max: number; pluie: number }[];
};

/* ───────── Codes météo WMO → icône et libellé ───────── */
function conditions(code: number, jour: boolean, lang: Langue): { Icone: LucideIcon; libelle: string } {
  const L = (fr: string, en: string) => (lang === "fr" ? fr : en);
  if (code === 0) return { Icone: jour ? Sun : Moon, libelle: L("Ensoleillé", "Sunny") };
  if (code <= 2) return { Icone: jour ? CloudSun : CloudMoon, libelle: L("Partiellement nuageux", "Partly cloudy") };
  if (code === 3) return { Icone: Cloud, libelle: L("Couvert", "Overcast") };
  if (code === 45 || code === 48) return { Icone: CloudFog, libelle: L("Brouillard", "Fog") };
  if (code >= 51 && code <= 57) return { Icone: CloudDrizzle, libelle: L("Bruine", "Drizzle") };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { Icone: CloudRain, libelle: L("Pluie", "Rain") };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { Icone: CloudSnow, libelle: L("Neige", "Snow") };
  if (code >= 95) return { Icone: CloudLightning, libelle: L("Orages", "Thunderstorms") };
  return { Icone: Cloud, libelle: L("Nuageux", "Cloudy") };
}

/* ───────── Ville choisie (mémorisée sur l'appareil, partagée entre les widgets) ───────── */
const CLE_VILLE = "diwa-meteo-ville";
const abonnes = new Set<() => void>();
function abonnerVille(f: () => void) {
  abonnes.add(f);
  return () => abonnes.delete(f);
}
function lireVille(): string {
  try {
    return localStorage.getItem(CLE_VILLE) || "libreville";
  } catch {
    return "libreville";
  }
}
function ecrireVille(v: string) {
  try {
    localStorage.setItem(CLE_VILLE, v);
  } catch {
    /* stockage indisponible */
  }
  abonnes.forEach((f) => f());
}
function villeDepuisCle(cle: string): Ville {
  if (cle.startsWith("geo:")) {
    const [lat, lon] = cle.slice(4).split(",").map(Number);
    return { id: cle, nom: "", lat, lon };
  }
  return VILLES.find((v) => v.id === cle) ?? VILLES[0];
}

/* ───────── Chargement (cache de 30 minutes dans la session) ───────── */
async function chargerMeteo(v: Ville): Promise<Donnees> {
  const cle = `diwa-meteo:${v.lat.toFixed(2)},${v.lon.toFixed(2)}`;
  try {
    const c = sessionStorage.getItem(cle);
    if (c) {
      const { quand, donnees } = JSON.parse(c);
      if (Date.now() - quand < 30 * 60_000) return donnees;
    }
  } catch {
    /* pas de cache */
  }
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day" +
    "&hourly=temperature_2m,precipitation_probability,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&timezone=auto&forecast_days=7";
  const r = await fetch(url);
  if (!r.ok) throw new Error("meteo");
  const j = await r.json();
  const maintenant = j.current.time as string;
  const debut = Math.max(0, (j.hourly.time as string[]).findIndex((t) => t >= maintenant.slice(0, 13)));
  const donnees: Donnees = {
    actuel: {
      temp: j.current.temperature_2m,
      ressenti: j.current.apparent_temperature,
      humidite: j.current.relative_humidity_2m,
      vent: j.current.wind_speed_10m,
      code: j.current.weather_code,
      jour: j.current.is_day === 1,
      heure: maintenant,
    },
    heures: (j.hourly.time as string[]).slice(debut, debut + 24).map((t, i) => ({
      t,
      temp: j.hourly.temperature_2m[debut + i],
      pluie: j.hourly.precipitation_probability[debut + i] ?? 0,
      code: j.hourly.weather_code[debut + i],
    })),
    jours: (j.daily.time as string[]).map((d, i) => ({
      date: d,
      code: j.daily.weather_code[i],
      min: j.daily.temperature_2m_min[i],
      max: j.daily.temperature_2m_max[i],
      pluie: j.daily.precipitation_probability_max[i] ?? 0,
    })),
  };
  try {
    sessionStorage.setItem(cle, JSON.stringify({ quand: Date.now(), donnees }));
  } catch {
    /* pas de cache */
  }
  return donnees;
}

function useMeteo() {
  const cle = useSyncExternalStore(abonnerVille, lireVille, () => "libreville");
  const ville = villeDepuisCle(cle);
  const [etat, setEtat] = useState<{ cle: string; donnees?: Donnees; erreur?: boolean } | null>(null);
  useEffect(() => {
    let actif = true;
    chargerMeteo(ville)
      .then((d) => actif && setEtat({ cle, donnees: d }))
      .catch(() => actif && setEtat({ cle, erreur: true }));
    return () => {
      actif = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);
  const courant = etat?.cle === cle ? etat : null;
  return { cle, ville, donnees: courant?.donnees, erreur: courant?.erreur ?? false };
}

const arrondi = (n: number) => Math.round(n);

/* ───────── Graphique : température sur 24 h (une série → pas de légende ; réticule + infobulle) ───────── */
function CourbeTemperature({ heures, lang }: { heures: Donnees["heures"]; lang: Langue }) {
  const { t } = useLangue();
  const [survol, setSurvol] = useState<number | null>(null);
  const titreId = useId();
  const L = 320, H = 132, g = 26, d = 10, haut = 18, bas = 24;
  const temps = heures.map((h) => h.temp);
  const min = Math.floor(Math.min(...temps)) - 1;
  const max = Math.ceil(Math.max(...temps)) + 1;
  const x = (i: number) => g + (i * (L - g - d)) / Math.max(1, heures.length - 1);
  const y = (v: number) => haut + ((max - v) * (H - haut - bas)) / Math.max(1, max - min);
  const chemin = heures.map((h, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(h.temp).toFixed(1)}`).join(" ");
  const aire = `${chemin} L${x(heures.length - 1)},${H - bas} L${x(0)},${H - bas} Z`;
  const iMin = temps.indexOf(Math.min(...temps));
  const iMax = temps.indexOf(Math.max(...temps));
  const fmtHeure = (s: string) => new Date(s).toLocaleTimeString(LOCALES[lang], { hour: "2-digit", minute: "2-digit" });
  const graduations = [min + 1, Math.round((min + max) / 2), max - 1];

  const surMouvement = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * L;
    const i = Math.round(((px - g) / (L - g - d)) * (heures.length - 1));
    setSurvol(Math.min(heures.length - 1, Math.max(0, i)));
  };
  const h = survol !== null ? heures[survol] : null;

  return (
    <figure className="relative" aria-labelledby={titreId}>
      <figcaption id={titreId} className="mb-1 text-xs font-semibold text-texte-doux">
        {t.temperature} — {t.prochaines24h}
      </figcaption>
      <svg
        viewBox={`0 0 ${L} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`${t.temperature} : min ${arrondi(temps[iMin])} °C, max ${arrondi(temps[iMax])} °C`}
        onPointerMove={surMouvement}
        onPointerDown={surMouvement}
        onPointerLeave={() => setSurvol(null)}
      >
        {graduations.map((v) => (
          <g key={v}>
            <line x1={g} x2={L - d} y1={y(v)} y2={y(v)} stroke="var(--ligne)" strokeWidth={1} />
            <text x={g - 4} y={y(v) + 3} textAnchor="end" className="fill-texte-doux text-[9px]">{v}°</text>
          </g>
        ))}
        <path d={aire} fill="var(--serie)" opacity={0.12} />
        <path d={chemin} fill="none" stroke="var(--serie)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* Étiquettes directes sélectives : le minimum et le maximum seulement */}
        {[iMin, iMax].map((i) => (
          <g key={`e${i}`}>
            <circle cx={x(i)} cy={y(temps[i])} r={3} fill="var(--serie)" stroke="var(--fond)" strokeWidth={2} />
            <text x={x(i)} y={y(temps[i]) + (i === iMax ? -7 : 13)} textAnchor="middle" className="fill-encre text-[9px] font-semibold">
              {arrondi(temps[i])}°
            </text>
          </g>
        ))}
        {[0, 6, 12, 18, 23].map((i) =>
          heures[i] ? (
            <text key={`h${i}`} x={x(i)} y={H - 8} textAnchor="middle" className="fill-texte-doux text-[9px]">
              {fmtHeure(heures[i].t).slice(0, 2)}h
            </text>
          ) : null,
        )}
        {h && survol !== null && (
          <g pointerEvents="none">
            <line x1={x(survol)} x2={x(survol)} y1={haut - 6} y2={H - bas} stroke="var(--texte-doux)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(survol)} cy={y(h.temp)} r={4.5} fill="var(--serie)" stroke="var(--fond)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {h && survol !== null && (
        <div
          className="pointer-events-none absolute top-5 z-10 -translate-x-1/2 whitespace-nowrap border border-ligne bg-fond px-2 py-1 text-[11px] shadow-lg"
          style={{ left: `${(x(survol) / L) * 100}%` }}
          role="status"
        >
          <p className="font-semibold text-encre">{fmtHeure(h.t)}</p>
          <p className="text-texte">{arrondi(h.temp)} °C · {t.pluie} {h.pluie} %</p>
        </div>
      )}
    </figure>
  );
}

/* ───────── Petit multiple : risque de pluie par heure (graphique distinct, pas de second axe) ───────── */
function BarresPluie({ heures, lang }: { heures: Donnees["heures"]; lang: Langue }) {
  const { t } = useLangue();
  const H = 34;
  const largeur = 100 / heures.length;
  return (
    <figure className="mt-3">
      <figcaption className="mb-1 flex justify-between text-xs font-semibold text-texte-doux">
        <span>{t.probaPluie}</span>
        <span>max {Math.max(...heures.map((h) => h.pluie))} %</span>
      </figcaption>
      <div className="relative flex h-[34px] items-end border-b border-ligne" role="img" aria-label={`${t.probaPluie}, ${t.prochaines24h}`}>
        {heures.map((h) => (
          <div key={h.t} className="group relative flex h-full items-end px-px" style={{ width: `${largeur}%` }}>
            <div className="w-full rounded-t-[2px] bg-serie/60" style={{ height: `${Math.max(1, (h.pluie / 100) * H)}px` }} />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap border border-ligne bg-fond px-1.5 py-0.5 text-[10px] shadow group-hover:block">
              {new Date(h.t).toLocaleTimeString(LOCALES[lang], { hour: "2-digit", minute: "2-digit" })} · {h.pluie} %
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}

/* ───────── 7 jours : plages min–max sur une échelle commune ───────── */
function SeptJours({ jours, lang }: { jours: Donnees["jours"]; lang: Langue }) {
  const { t } = useLangue();
  const bas = Math.min(...jours.map((j) => j.min));
  const haut = Math.max(...jours.map((j) => j.max));
  const pos = (v: number) => ((v - bas) / Math.max(1, haut - bas)) * 100;
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold text-texte-doux">{t.sept_jours}</p>
      <ul className="space-y-1.5">
        {jours.map((j, i) => {
          const { Icone, libelle } = conditions(j.code, true, lang);
          const nomJour = i === 0 ? t.aujourdhui : new Date(j.date + "T12:00:00").toLocaleDateString(LOCALES[lang], { weekday: "short" });
          return (
            <li key={j.date} className="grid grid-cols-[64px_20px_34px_1fr_34px] items-center gap-2 text-xs">
              <span className="truncate font-medium capitalize text-encre">{nomJour}</span>
              <Icone className="size-4 text-or-fonce" aria-label={libelle} />
              <span className="text-right tabular-nums text-texte-doux">{arrondi(j.min)}°</span>
              <span className="relative h-1.5 rounded-full bg-fond-2" aria-hidden>
                <span className="absolute inset-y-0 rounded-full bg-serie" style={{ left: `${pos(j.min)}%`, right: `${100 - pos(j.max)}%` }} />
              </span>
              <span className="tabular-nums font-semibold text-encre">{arrondi(j.max)}°</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TableauHeures({ heures, lang }: { heures: Donnees["heures"]; lang: Langue }) {
  const { t } = useLangue();
  return (
    <div className="mt-3 max-h-44 overflow-y-auto border border-ligne">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-fond-2 text-left text-texte-doux">
          <tr>
            <th className="px-2 py-1 font-semibold">{t.heure}</th>
            <th className="px-2 py-1 text-right font-semibold">{t.temperature}</th>
            <th className="px-2 py-1 text-right font-semibold">{t.pluie}</th>
          </tr>
        </thead>
        <tbody>
          {heures.map((h) => (
            <tr key={h.t} className="border-t border-ligne">
              <td className="px-2 py-1">{new Date(h.t).toLocaleTimeString(LOCALES[lang], { hour: "2-digit", minute: "2-digit" })}</td>
              <td className="px-2 py-1 text-right tabular-nums">{h.temp.toFixed(1)} °C</td>
              <td className="px-2 py-1 text-right tabular-nums">{h.pluie} %</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────── Contenu détaillé (panneau déroulant et bloc de barre latérale) ───────── */
function SelecteurVille({ cle }: { cle: string }) {
  const { t } = useLangue();
  const [geoEnCours, setGeoEnCours] = useState(false);
  const geolocalisation = useValeurNavigateur(() => "geolocation" in navigator, false);
  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="ville-meteo">{t.ville}</label>
      <select
        id="ville-meteo"
        value={cle.startsWith("geo:") ? "geo" : cle}
        onChange={(e) => e.target.value !== "geo" && ecrireVille(e.target.value)}
        className="h-8 min-w-0 flex-1 border border-ligne bg-fond px-2 text-xs text-texte outline-none focus:border-or"
      >
        {cle.startsWith("geo:") && <option value="geo">{t.maPosition}</option>}
        {VILLES.map((v) => (
          <option key={v.id} value={v.id}>{v.nom}</option>
        ))}
      </select>
      {geolocalisation && (
        <button
          type="button"
          disabled={geoEnCours}
          onClick={() => {
            setGeoEnCours(true);
            navigator.geolocation.getCurrentPosition(
              (p) => {
                setGeoEnCours(false);
                ecrireVille(`geo:${p.coords.latitude.toFixed(3)},${p.coords.longitude.toFixed(3)}`);
              },
              () => setGeoEnCours(false),
              { timeout: 10000, maximumAge: 600000 },
            );
          }}
          className="grid size-8 shrink-0 place-items-center border border-ligne text-texte hover:border-or hover:text-or-fonce disabled:opacity-50"
          title={t.maPosition}
          aria-label={t.maPosition}
        >
          <LocateFixed className={cn("size-4", geoEnCours && "animate-pulse")} />
        </button>
      )}
    </div>
  );
}

export function DetailMeteo() {
  const { lang, t } = useLangue();
  const { cle, ville, donnees, erreur } = useMeteo();
  const [tableau, setTableau] = useState(false);
  const nomVille = ville.nom || t.maPosition;

  return (
    <div className="text-texte">
      <SelecteurVille cle={cle} />
      {erreur ? (
        <p className="py-6 text-center text-sm text-texte-doux">{t.meteoErreur}</p>
      ) : !donnees ? (
        <div className="animate-pulse space-y-3 py-4 motion-reduce:animate-none" aria-label={t.meteoChargement}>
          <div className="h-10 w-32 bg-fond-2" />
          <div className="h-24 bg-fond-2" />
        </div>
      ) : (
        <>
          {(() => {
            const { Icone, libelle } = conditions(donnees.actuel.code, donnees.actuel.jour, lang);
            return (
              <div className="mt-4 flex items-center gap-4">
                <Icone className="size-12 shrink-0 text-or" aria-hidden />
                <div className="min-w-0">
                  <p className="font-titre text-4xl leading-none text-encre">{arrondi(donnees.actuel.temp)}°C</p>
                  <p className="mt-1 truncate text-sm font-medium">{libelle} · {nomVille}</p>
                </div>
              </div>
            );
          })()}
          <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="bg-fond-2 p-2">
              <dt className="text-texte-doux">{t.ressenti}</dt>
              <dd className="font-semibold text-encre">{arrondi(donnees.actuel.ressenti)}°C</dd>
            </div>
            <div className="bg-fond-2 p-2">
              <dt className="flex items-center gap-1 text-texte-doux"><Droplets className="size-3" aria-hidden />{t.humidite}</dt>
              <dd className="font-semibold text-encre">{donnees.actuel.humidite} %</dd>
            </div>
            <div className="bg-fond-2 p-2">
              <dt className="flex items-center gap-1 text-texte-doux"><Wind className="size-3" aria-hidden />{t.vent}</dt>
              <dd className="font-semibold text-encre">{arrondi(donnees.actuel.vent)} km/h</dd>
            </div>
          </dl>
          <div className="mt-4">
            <CourbeTemperature heures={donnees.heures} lang={lang} />
            <BarresPluie heures={donnees.heures} lang={lang} />
            <button type="button" onClick={() => setTableau((v) => !v)} aria-expanded={tableau} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-or-fonce hover:text-encre">
              <Table2 className="size-3" aria-hidden /> {t.voirTableau}
            </button>
            {tableau && <TableauHeures heures={donnees.heures} lang={lang} />}
          </div>
          <SeptJours jours={donnees.jours} lang={lang} />
          <p className="mt-3 text-[10px] text-texte-doux">
            <a href="https://open-meteo.com/" target="_blank" rel="noopener" className="hover:text-or-fonce">{t.sourceMeteo}</a>
          </p>
        </>
      )}
    </div>
  );
}

/** Pastille météo de la barre supérieure, qui ouvre le panneau détaillé. */
export function MeteoCompacte() {
  const { lang, t } = useLangue();
  const { ville, donnees } = useMeteo();
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOuvert(false);
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  const c = donnees ? conditions(donnees.actuel.code, donnees.actuel.jour, lang) : null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 hover:text-or"
        title={t.meteoDetail}
      >
        {c ? <c.Icone className="size-4 text-or" aria-hidden /> : <CloudSun className="size-4 text-or" aria-hidden />}
        <span className="tabular-nums">{donnees ? `${arrondi(donnees.actuel.temp)}°C` : "—"}</span>
        <span className="hidden sm:inline">{ville.nom || t.maPosition}</span>
        <ChevronDown className={cn("size-3 transition-transform", ouvert && "rotate-180")} aria-hidden />
      </button>
      <AnimatePresence>
        {ouvert && (
          <motion.div
            role="dialog"
            aria-label={t.meteo}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 top-full z-50 mt-2 w-[min(92vw,360px)] border-t-4 border-or bg-fond p-4 text-left shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-titre text-lg uppercase text-encre">{t.meteo}</p>
              <button type="button" onClick={() => setOuvert(false)} aria-label={t.fermer} className="text-texte-doux hover:text-encre">
                <X className="size-4" />
              </button>
            </div>
            <DetailMeteo />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
