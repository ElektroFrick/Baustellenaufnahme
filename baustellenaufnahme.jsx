import React, { useState, useRef, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Baustellenaufnahme – Gluehbirne                                    */
/*  v4: Bauteile verschieben, Kabel über Ecken, Kamera mit Rückfall,   */
/*      Schrank-Editor mit Foto und Hutschienen-Erkennung              */
/* ------------------------------------------------------------------ */

const ARTEN = [
  { id: "wp", label: "Wärmepumpe", hint: "Außen-/Inneneinheit, Zuleitung, Zählerantrag" },
  { id: "pv", label: "Photovoltaik", hint: "Module, Wechselrichter, Speicher" },
  { id: "klein", label: "Kleinauftrag", hint: "Reparatur, Steckdose, Störung" },
  { id: "neubau", label: "Baustelle / Neubau", hint: "Rohbau, Elektroinstallation komplett" },
];

const SCHRITTE = ["Objekt", "Zeichnung", "Fotos", "Material", "Fragen", "Fertig"];

const SYMBOLE = [
  { id: "wp_aussen", label: "WP außen" },
  { id: "wp_innen", label: "WP innen" },
  { id: "puffer", label: "Puffer" },
  { id: "uv", label: "UV" },
  { id: "zaehler", label: "Zählerschrank" },
  { id: "wallbox", label: "Wallbox" },
  { id: "wr", label: "Wechselrichter" },
  { id: "pv_modul", label: "PV-Modul" },
  { id: "durchbruch", label: "Durchbruch" },
  { id: "steckdose", label: "Steckdose" },
];

const KABELARTEN = [
  { id: "zuleitung", label: "Zuleitung", farbe: "#C62828", bez: "NYY-J 5x4" },
  { id: "netz", label: "Netzleitung", farbe: "#EF6C00", bez: "NYM-J 5x2,5" },
  { id: "steuer", label: "Steuerleitung", farbe: "#1565C0", bez: "SG-Ready 5x1,5" },
  { id: "daten", label: "Netzwerk", farbe: "#2E7D32", bez: "Cat.7" },
  { id: "erdung", label: "Erdung / PA", farbe: "#9E9D24", bez: "H07V-K 16 mm²" },
];

const QUERSCHNITTE = ["3x1,5", "3x2,5", "5x1,5", "5x2,5", "5x4", "5x6", "5x10", "Cat.7", "16 mm²"];

const VERLEGUNG = [
  { id: "up", label: "unter Putz" },
  { id: "ap", label: "auf Putz" },
  { id: "kanal", label: "Kabelkanal" },
  { id: "rohr", label: "Rohr" },
  { id: "erde", label: "Erdreich" },
  { id: "pritsche", label: "Kabelpritsche" },
];

const KANAL_GROESSEN = ["Kanal 40x40", "Kanal 60x40", "Kanal 60x60", "Kanal 100x60", "Sockelleiste"];
const ROHR_GROESSEN = ["M20", "M25", "M32", "DN 50", "DN 63", "DN 110"];

/* Reihengeräte: Breite in TE (1 TE = 17,5 mm), Darstellung DIN-üblich */
const GERAETE = [
  { id: "sls", label: "SLS 3-polig", te: 3, form: "automat", pole: 3, text: "SLS E35" },
  { id: "ls1", label: "LS 1-polig B16", te: 1, form: "automat", pole: 1, text: "B16" },
  { id: "ls3", label: "LS 3-polig C16", te: 3, form: "automat", pole: 3, text: "C16" },
  { id: "ls25", label: "LS 3-polig B25", te: 3, form: "automat", pole: 3, text: "B25" },
  { id: "fib", label: "FI 4-polig Typ B", te: 4, form: "fi", pole: 4, text: "Typ B 40/0,03" },
  { id: "fia", label: "FI 4-polig Typ A", te: 4, form: "fi", pole: 4, text: "Typ A 40/0,03" },
  { id: "uess", label: "Überspannungsschutz Typ 2", te: 4, form: "uess", text: "ÜSS T2" },
  { id: "rse", label: "Rundsteuerempfänger", te: 4, form: "kasten", text: "RSE" },
  { id: "schuetz", label: "Installationsschütz", te: 2, form: "kasten", text: "Schütz" },
  { id: "klemme_l", label: "Reihenklemme grau", te: 0.4, form: "klemme", farbe: "#B9BDC4" },
  { id: "klemme_n", label: "Reihenklemme blau (N)", te: 0.4, form: "klemme", farbe: "#2F6FD0" },
  { id: "klemme_pe", label: "Reihenklemme grün-gelb (PE)", te: 0.4, form: "klemme", farbe: "#7FA83C" },
  { id: "reserve", label: "Blindabdeckung", te: 1, form: "blind" },
];

const TE_PRO_REIHE = 12;
const TE_BREIT = 26; /* Pixel je TE im Schrank-Editor */
const REIHE_HOCH = 70;

const ZONEN_VORLAGE = {
  wp: ["Außeneinheit Standort", "Technikraum", "Zählerschrank"],
  pv: ["Dach Süd", "Wechselrichter Standort", "Zählerschrank"],
  klein: ["Arbeitsstelle", "Zählerschrank"],
  neubau: ["Keller / HAR", "Erdgeschoss", "Obergeschoss"],
};

const MATERIAL_KATALOG = {
  wp: [
    "NYY-J 5x4 mm² Erdkabel",
    "NYM-J 5x2,5 mm²",
    "NYM-J 3x1,5 mm²",
    "Steuerleitung SG-Ready 5x1,5",
    "Netzwerkkabel Cat.7",
    "LS-Schalter C16 3-polig",
    "FI Typ B 40A/30mA 4-polig",
    "Überspannungsschutz Typ 2",
    "Unterverteilung 2-reihig AP",
    "Kabelkanal 60x40",
    "Kabelschutzrohr DN 50",
    "Wanddurchführung inkl. Abdichtung",
    "Potentialausgleichsklemme",
    "Kabelschellen / Kleinmaterial",
  ],
  pv: [
    "Solarkabel 6 mm²",
    "MC4 Steckerpaar",
    "Wechselrichter",
    "DC-Freischalter",
    "AC-Leitung NYM-J 5x4",
    "LS-Schalter B25 3-polig",
    "Überspannungsschutz DC Typ 2",
    "Kabelkanal / Rohr",
    "Erdungsleitung 16 mm²",
  ],
  klein: ["NYM-J 3x1,5 mm²", "Schalter/Steckdose", "Abzweigdose", "LS-Schalter B16", "Kleinmaterial"],
  neubau: [
    "NYM-J 3x1,5 mm²",
    "NYM-J 5x2,5 mm²",
    "Schalterdosen",
    "Abzweigdosen",
    "Zählerschrank",
    "Unterverteilung",
    "Leerrohr M25",
    "Kleinmaterial",
  ],
};

const EINHEITEN = ["m", "Stk", "Rolle", "Pak", "kg"];
const WELT = { w: 1200, h: 900 };

/* ---------------------------- Hilfsmittel ------------------------- */

function neueAufnahme(art) {
  return {
    id: "BA-" + Date.now().toString().slice(-6),
    art,
    angelegt: new Date().toISOString(),
    objekt: { kunde: "", adresse: "", ansprech: "", telefon: "" },
    grundriss: [],
    kabel: [],
    kanaele: [],
    zuschlag: "10",
    schrank: {
      modus: "planung",
      bauhoehe: 1100,
      sockel: "300",
      felder: [{ gruppen: [] }, { gruppen: [] }],
      module: [],
      foto: null,
      schienen: [],
      bestandModule: [],
      notiz: "",
    },
    zonen: (ZONEN_VORLAGE[art] || []).map((n) => ({ name: n, notiz: "", fotos: [] })),
    material: [],
    fragen: {
      zaehlerantrag: "",
      netzbetreiber: "",
      zaehlernummer: "",
      schrankTausch: "",
      potentialausgleich: "",
      baustrom: "",
      geruest: "",
      von: "",
      bis: "",
      zugang: "",
      hinweise: "",
    },
  };
}

async function dateiZuBild(file, maxKante = 1200) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const f = Math.min(1, maxKante / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * f);
    c.height = Math.round(img.height * f);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const abstand = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const zahl = (v) => parseFloat(String(v == null ? "" : v).replace(",", ".")) || 0;

const zugLaenge = (punkte) => (punkte || []).reduce((s, p, i) => (i ? s + abstand(punkte[i - 1], p) : 0), 0);

/* Pixel je Meter, gemittelt über alle bemaßten Linien */
function pxProMeter(grundriss) {
  const werte = (grundriss || [])
    .filter((o) => o.typ === "mass" && zahl(o.meter) > 0)
    .map((o) => Math.hypot(o.x2 - o.x1, o.y2 - o.y1) / zahl(o.meter));
  if (!werte.length) return null;
  return werte.reduce((a, b) => a + b, 0) / werte.length;
}

/* ---------------------- Zeichnen: Übersicht ----------------------- */

function symbolZeichnen(ctx, kind, x, y) {
  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#101215";
  const box = (w, h, fuell) => {
    ctx.fillStyle = fuell || "#ffffff";
    ctx.beginPath();
    ctx.rect(x - w / 2, y - h / 2, w, h);
    ctx.fill();
    ctx.stroke();
  };
  switch (kind) {
    case "wp_aussen":
      box(58, 42, "#DCE9F7");
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 9);
      ctx.lineTo(x + 9, y + 9);
      ctx.moveTo(x + 9, y - 9);
      ctx.lineTo(x - 9, y + 9);
      ctx.stroke();
      break;
    case "wp_innen":
      box(44, 56, "#F7E4DC");
      ctx.beginPath();
      ctx.moveTo(x - 12, y + 8);
      ctx.quadraticCurveTo(x, y - 6, x + 12, y + 8);
      ctx.stroke();
      break;
    case "puffer":
      ctx.fillStyle = "#EDEDF2";
      ctx.beginPath();
      ctx.ellipse(x, y - 18, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 16, y - 18);
      ctx.lineTo(x - 16, y + 18);
      ctx.moveTo(x + 16, y - 18);
      ctx.lineTo(x + 16, y + 18);
      ctx.stroke();
      break;
    case "uv":
      box(56, 44, "#FFF3BF");
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x - 20, y + i * 11);
        ctx.lineTo(x + 20, y + i * 11);
        ctx.stroke();
      }
      break;
    case "zaehler":
      box(48, 66, "#FFFFFF");
      ctx.beginPath();
      ctx.rect(x - 15, y - 26, 30, 24);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y - 14, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 18, y + 8);
      ctx.lineTo(x + 18, y + 8);
      ctx.moveTo(x - 18, y + 20);
      ctx.lineTo(x + 18, y + 20);
      ctx.stroke();
      break;
    case "wallbox":
      box(34, 48, "#DDF0E1");
      ctx.beginPath();
      ctx.moveTo(x + 2, y - 12);
      ctx.lineTo(x - 6, y + 2);
      ctx.lineTo(x + 4, y + 2);
      ctx.lineTo(x - 2, y + 14);
      ctx.stroke();
      break;
    case "wr":
      box(48, 40, "#E8E4F7");
      ctx.beginPath();
      ctx.moveTo(x - 14, y + 6);
      ctx.quadraticCurveTo(x - 7, y - 10, x, y + 6);
      ctx.quadraticCurveTo(x + 7, y + 20, x + 14, y + 6);
      ctx.stroke();
      break;
    case "pv_modul":
      box(64, 36, "#D6DEE8");
      ctx.beginPath();
      ctx.moveTo(x - 32, y);
      ctx.lineTo(x + 32, y);
      ctx.moveTo(x - 10, y - 18);
      ctx.lineTo(x - 10, y + 18);
      ctx.moveTo(x + 10, y - 18);
      ctx.lineTo(x + 10, y + 18);
      ctx.stroke();
      break;
    case "durchbruch":
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    case "steckdose":
      ctx.beginPath();
      ctx.arc(x, y, 12, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 14, y);
      ctx.lineTo(x + 14, y);
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 18);
      ctx.stroke();
      break;
    default:
      box(30, 30);
  }
  ctx.restore();
}

/* ---------------------- Zeichnen: Reihengeräte -------------------- */

function geraetZeichnen(ctx, geraet, x, y, beschriftung, breite, hoehe) {
  const b = breite || geraet.te * TE_BREIT;
  const h = hoehe || 52;
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#3A3F47";

  if (geraet.form === "klemme") {
    ctx.fillStyle = geraet.farbe || "#B9BDC4";
    ctx.fillRect(x, y - h / 2, b, h);
    ctx.strokeRect(x, y - h / 2, b, h);
    ctx.strokeStyle = "#4A4F57";
    ctx.beginPath();
    ctx.moveTo(x + b / 2, y - h / 2 + 8);
    ctx.lineTo(x + b / 2, y - h / 2 + 14);
    ctx.moveTo(x + b / 2, y + h / 2 - 14);
    ctx.lineTo(x + b / 2, y + h / 2 - 8);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.fillStyle = "#F3F4F6";
  ctx.fillRect(x, y - h / 2, b, h);
  ctx.strokeRect(x, y - h / 2, b, h);

  if (geraet.form === "blind") {
    ctx.strokeStyle = "#C6C9CF";
    ctx.beginPath();
    ctx.moveTo(x + 3, y - h / 2 + 3);
    ctx.lineTo(x + b - 3, y + h / 2 - 3);
    ctx.stroke();
    ctx.restore();
    return;
  }

  /* Anschlussklemmen oben und unten */
  ctx.fillStyle = "#D5D8DD";
  ctx.fillRect(x + 2, y - h / 2 + 2, b - 4, 8);
  ctx.fillRect(x + 2, y + h / 2 - 10, b - 4, 8);

  if (geraet.form === "automat" || geraet.form === "fi") {
    const anz = geraet.form === "fi" ? 1 : geraet.pole || 1;
    const wippeB = geraet.form === "fi" ? 14 : Math.max(8, b / anz - 6);
    for (let i = 0; i < anz; i++) {
      const wx = geraet.form === "fi" ? x + b - 20 : x + 3 + i * (b / anz);
      ctx.fillStyle = "#2B2F36";
      ctx.fillRect(wx, y - 9, wippeB, 18);
      ctx.fillStyle = "#F0C419";
      ctx.fillRect(wx, y - 9, wippeB, 5);
    }
    if (geraet.form === "fi") {
      ctx.fillStyle = "#2B2F36";
      ctx.beginPath();
      ctx.arc(x + 14, y - 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 8px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("T", x + 14, y + 1);
    }
  } else if (geraet.form === "uess") {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "#E9EBEE";
      ctx.fillRect(x + 4 + i * (b / 3), y - 14, b / 3 - 6, 26);
      ctx.strokeRect(x + 4 + i * (b / 3), y - 14, b / 3 - 6, 26);
      ctx.fillStyle = "#2E7D32";
      ctx.fillRect(x + 6 + i * (b / 3), y - 12, b / 3 - 10, 6);
    }
  } else {
    ctx.fillStyle = "#E1E4E8";
    ctx.fillRect(x + 4, y - 12, b - 8, 22);
    ctx.strokeRect(x + 4, y - 12, b - 8, 22);
  }

  ctx.fillStyle = "#101215";
  ctx.font = "600 9px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(beschriftung || geraet.text || "", x + b / 2, y + h / 2 + 12);
  ctx.restore();
}

/* Kanal und Rohr: zwei Striche, innen nur leicht grau,
   damit die Kabel darüber sichtbar bleiben                            */
function kanalZeichnen(ctx, k) {
  const p = k.punkte || [];
  if (p.length < 2) return;
  const breit = 7;
  ctx.save();
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1];
    const b = p[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = (-(b.y - a.y) / len) * breit;
    const ny = ((b.x - a.x) / len) * breit;
    ctx.fillStyle = "rgba(93, 64, 55, 0.10)";
    ctx.beginPath();
    ctx.moveTo(a.x + nx, a.y + ny);
    ctx.lineTo(b.x + nx, b.y + ny);
    ctx.lineTo(b.x - nx, b.y - ny);
    ctx.lineTo(a.x - nx, a.y - ny);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#8D6E63";
    ctx.lineWidth = 1.5;
    if (k.art === "rohr") ctx.setLineDash([9, 5]);
    ctx.beginPath();
    ctx.moveTo(a.x + nx, a.y + ny);
    ctx.lineTo(b.x + nx, b.y + ny);
    ctx.moveTo(a.x - nx, a.y - ny);
    ctx.lineTo(b.x - nx, b.y - ny);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const a = p[0];
  const b = p[1];
  ctx.fillStyle = "#6D4C41";
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(k.groesse + (k.meter ? " · " + k.meter + " m" : ""), (a.x + b.x) / 2, (a.y + b.y) / 2 + 22);
  ctx.restore();
}

/* ------------------------------ App ------------------------------- */

export default function App() {
  const [ansicht, setAnsicht] = useState("start");
  const [aufnahme, setAufnahme] = useState(null);
  const [schritt, setSchritt] = useState(0);
  const [gespeicherte, setGespeicherte] = useState([]);
  const [hinweis, setHinweis] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("aufnahmen");
        if (r) setGespeicherte(JSON.parse(r.value));
      } catch (e) {
        /* noch nichts gespeichert */
      }
    })();
  }, []);

  const setzeFeld = (pfad, wert) =>
    setAufnahme((a) => {
      const kopie = { ...a };
      const [gruppe, feld] = pfad.split(".");
      kopie[gruppe] = { ...kopie[gruppe], [feld]: wert };
      return kopie;
    });

  async function speichern() {
    const schlank = {
      ...aufnahme,
      schrank: { ...aufnahme.schrank, foto: null },
      zonen: aufnahme.zonen.map((z) => ({ ...z, fotos: [], fotoAnzahl: z.fotos.length })),
    };
    const liste = [schlank, ...gespeicherte.filter((g) => g.id !== aufnahme.id)].slice(0, 40);
    try {
      await window.storage.set("aufnahmen", JSON.stringify(liste));
      setGespeicherte(liste);
      setHinweis("Aufnahme " + aufnahme.id + " gespeichert. Fotos bleiben nur in dieser Sitzung.");
    } catch (e) {
      setHinweis("Speichern hat nicht geklappt – Text über „Kopieren“ sichern.");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-5">
        <header className="mb-5 flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Baustellenaufnahme</h1>
          {aufnahme && <span className="text-sm text-neutral-500">{aufnahme.id}</span>}
        </header>

        {hinweis && (
          <div className="mb-4 rounded-lg border-l-4 border-yellow-400 bg-yellow-50 px-3 py-2 text-sm">{hinweis}</div>
        )}

        {ansicht === "start" && (
          <Start
            gespeicherte={gespeicherte}
            starten={(art) => {
              setAufnahme(neueAufnahme(art));
              setSchritt(0);
              setAnsicht("formular");
              setHinweis("");
            }}
          />
        )}

        {ansicht === "formular" && aufnahme && (
          <Formular
            aufnahme={aufnahme}
            setAufnahme={setAufnahme}
            setzeFeld={setzeFeld}
            schritt={schritt}
            setSchritt={setSchritt}
            speichern={speichern}
            zurueck={() => setAnsicht("start")}
          />
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Start ------------------------------ */

function Start({ starten, gespeicherte }) {
  return (
    <div>
      <p className="mb-4 text-neutral-600">Was nimmst du auf?</p>
      <div className="space-y-3">
        {ARTEN.map((a) => (
          <button
            key={a.id}
            onClick={() => starten(a.id)}
            className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-4 text-left"
          >
            <div className="text-lg font-semibold">{a.label}</div>
            <div className="text-sm text-neutral-500">{a.hint}</div>
          </button>
        ))}
      </div>

      {gespeicherte.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 font-semibold">Zuletzt aufgenommen</h2>
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {gespeicherte.slice(0, 6).map((g) => (
              <li key={g.id} className="flex justify-between px-4 py-3 text-sm">
                <span>
                  {g.objekt.kunde || "ohne Namen"} <span className="text-neutral-400">· {g.id}</span>
                </span>
                <span className="text-neutral-500">{new Date(g.angelegt).toLocaleDateString("de-DE")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Formular ---------------------------- */

function Formular({ aufnahme, setAufnahme, setzeFeld, schritt, setSchritt, speichern, zurueck }) {
  return (
    <div>
      <div className="mb-5 flex gap-1">
        {SCHRITTE.map((s, i) => (
          <button
            key={s}
            onClick={() => setSchritt(i)}
            className={
              "flex-1 rounded border-b-4 px-1 py-1 text-xs " +
              (i === schritt ? "border-neutral-900 font-semibold" : "border-neutral-300 text-neutral-500")
            }
          >
            {s}
          </button>
        ))}
      </div>

      {schritt === 0 && <Objekt aufnahme={aufnahme} setzeFeld={setzeFeld} />}
      {schritt === 1 && <Zeichnung aufnahme={aufnahme} setAufnahme={setAufnahme} />}
      {schritt === 2 && <Fotos aufnahme={aufnahme} setAufnahme={setAufnahme} />}
      {schritt === 3 && <Material aufnahme={aufnahme} setAufnahme={setAufnahme} />}
      {schritt === 4 && <Fragen aufnahme={aufnahme} setzeFeld={setzeFeld} />}
      {schritt === 5 && <Abschluss aufnahme={aufnahme} speichern={speichern} />}

      <div className="mt-8 flex gap-3">
        <button
          onClick={() => (schritt === 0 ? zurueck() : setSchritt(schritt - 1))}
          className="rounded-lg border border-neutral-300 px-4 py-3 font-medium"
        >
          Zurück
        </button>
        {schritt < 5 && (
          <button
            onClick={() => setSchritt(schritt + 1)}
            className="flex-1 rounded-lg bg-neutral-900 px-4 py-3 font-semibold text-white"
          >
            Weiter: {SCHRITTE[schritt + 1]}
          </button>
        )}
      </div>
    </div>
  );
}

function Feld({ label, wert, onChange, mehrzeilig, typ = "text", platzhalter }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-neutral-600">{label}</span>
      {mehrzeilig ? (
        <textarea
          value={wert}
          placeholder={platzhalter}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
      ) : (
        <input
          type={typ}
          value={wert}
          placeholder={platzhalter}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
      )}
    </label>
  );
}

function Objekt({ aufnahme, setzeFeld }) {
  const o = aufnahme.objekt;
  return (
    <div className="space-y-4">
      <Feld label="Kunde" wert={o.kunde} onChange={(v) => setzeFeld("objekt.kunde", v)} />
      <Feld label="Adresse" wert={o.adresse} onChange={(v) => setzeFeld("objekt.adresse", v)} />
      <Feld label="Ansprechpartner vor Ort" wert={o.ansprech} onChange={(v) => setzeFeld("objekt.ansprech", v)} />
      <Feld label="Telefon" typ="tel" wert={o.telefon} onChange={(v) => setzeFeld("objekt.telefon", v)} />
    </div>
  );
}

/* --------------------------- Bildeingabe --------------------------- */
/* Zwei Wege: Kamera direkt (capture) und normale Auswahl.
   Welcher durchkommt, entscheidet das Handy.                          */

function FotoEingabe({ label, mitKamera, onBild, className }) {
  const ref = useRef(null);
  const eigenschaften = mitKamera ? { capture: "environment" } : {};
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        {...eigenschaften}
        onChange={async (e) => {
          const dateien = Array.from(e.target.files || []);
          e.target.value = "";
          for (const f of dateien) {
            try {
              onBild(await dateiZuBild(f));
            } catch (err) {
              /* Datei übersprungen */
            }
          }
        }}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />
      <button onClick={() => ref.current && ref.current.click()} className={className}>
        {label}
      </button>
    </>
  );
}

/* --------------------------- Zeichnung ---------------------------- */

function Zeichnung({ aufnahme, setAufnahme }) {
  const [reiter, setReiter] = useState("grundriss");
  return (
    <div>
      <div className="mb-4 flex overflow-hidden rounded-lg border border-neutral-300">
        {[
          ["grundriss", "Grundriss"],
          ["kabel", "Kabel"],
          ["schrank", "Schrank"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setReiter(id)}
            className={"flex-1 px-2 py-3 text-sm font-medium " + (reiter === id ? "bg-neutral-900 text-white" : "bg-white")}
          >
            {label}
          </button>
        ))}
      </div>

      {reiter === "schrank" ? (
        <Schrank aufnahme={aufnahme} setAufnahme={setAufnahme} />
      ) : (
        <Plan aufnahme={aufnahme} setAufnahme={setAufnahme} modus={reiter} />
      )}
    </div>
  );
}

function Plan({ aufnahme, setAufnahme, modus }) {
  const canvasRef = useRef(null);
  const [werkzeug, setWerkzeug] = useState(modus === "kabel" ? "kabel" : "raum");
  const [symbol, setSymbol] = useState("wp_aussen");
  const [kabelart, setKabelart] = useState(KABELARTEN[0].id);
  const [bez, setBez] = useState(KABELARTEN[0].bez);
  const [verlegung, setVerlegung] = useState("up");
  const [kanalArt, setKanalArt] = useState("kanal");
  const [kanalGroesse, setKanalGroesse] = useState(KANAL_GROESSEN[1]);
  const [beschriftung, setBeschriftung] = useState("");
  const [entwurf, setEntwurf] = useState(null);
  const [zeigerPos, setZeigerPos] = useState(null);
  const [vorschau, setVorschau] = useState(null);
  const [sicht, setSicht] = useState({ s: 1, ox: 0, oy: 0 });
  const start = useRef(null);
  const greifen = useRef(null);
  const zeiger = useRef(new Map());
  const kneifen = useRef(null);
  const langRef = useRef(null);
  const langAus = useRef(false);

  useEffect(() => {
    setWerkzeug(modus === "kabel" ? "kabel" : "raum");
    setEntwurf(null);
  }, [modus]);

  const zeichnen = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.setTransform(sicht.s, 0, 0, sicht.s, sicht.ox, sicht.oy);

    ctx.strokeStyle = "#E6E8EC";
    ctx.lineWidth = 1 / sicht.s;
    for (let x = 0; x <= WELT.w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WELT.h);
      ctx.stroke();
    }
    for (let y = 0; y <= WELT.h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WELT.w, y);
      ctx.stroke();
    }

    const blass = modus === "kabel";
    aufnahme.grundriss.forEach((o) => {
      ctx.strokeStyle = blass ? "#B6BAC2" : "#101215";
      ctx.fillStyle = "#101215";
      ctx.lineWidth = blass ? 2 : 3;
      ctx.font = "600 14px system-ui, sans-serif";
      ctx.textAlign = "left";
      if (o.typ === "raum") ctx.strokeRect(o.x, o.y, o.w, o.h);
      else if (o.typ === "wand") {
        ctx.beginPath();
        ctx.moveTo(o.x1, o.y1);
        ctx.lineTo(o.x2, o.y2);
        ctx.stroke();
      } else if (o.typ === "tuer") {
        ctx.beginPath();
        ctx.moveTo(o.x - 18, o.y);
        ctx.lineTo(o.x + 18, o.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(o.x - 18, o.y, 36, -Math.PI / 2, 0);
        ctx.stroke();
      } else if (o.typ === "fenster") {
        ctx.beginPath();
        ctx.moveTo(o.x - 22, o.y - 4);
        ctx.lineTo(o.x + 22, o.y - 4);
        ctx.moveTo(o.x - 22, o.y + 4);
        ctx.lineTo(o.x + 22, o.y + 4);
        ctx.stroke();
      } else if (o.typ === "text") {
        ctx.fillText(o.text, o.x, o.y);
      } else if (o.typ === "mass") {
        ctx.strokeStyle = "#B4009E";
        ctx.fillStyle = "#B4009E";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(o.x1, o.y1);
        ctx.lineTo(o.x2, o.y2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(o.x1, o.y1, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(o.x2, o.y2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.textAlign = "center";
        ctx.font = "700 13px system-ui, sans-serif";
        ctx.fillText(o.meter ? o.meter + " m" : "Maß fehlt", (o.x1 + o.x2) / 2, (o.y1 + o.y2) / 2 - 8);
      } else if (o.typ === "symbol") {
        symbolZeichnen(ctx, o.kind, o.x, o.y);
        ctx.fillStyle = "#101215";
        ctx.textAlign = "center";
        ctx.font = "600 12px system-ui, sans-serif";
        ctx.fillText(SYMBOLE.find((s) => s.id === o.kind)?.label || "", o.x, o.y + 44);
      }
    });

    const zugZeichnen = (punkte, farbe, breite, gestrichelt, text) => {
      if (punkte.length < 2) return;
      ctx.strokeStyle = farbe;
      ctx.lineWidth = breite;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      if (gestrichelt) ctx.setLineDash([10, 6]);
      ctx.beginPath();
      punkte.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.setLineDash([]);
      if (text) {
        const a = punkte[0];
        const b = punkte[1];
        ctx.fillStyle = farbe;
        ctx.font = "600 12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(text, (a.x + b.x) / 2, (a.y + b.y) / 2 - 8);
      }
      ctx.fillStyle = farbe;
      punkte.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    aufnahme.kanaele.forEach((k) => kanalZeichnen(ctx, k));

    aufnahme.kabel.forEach((k) => {
      const art = KABELARTEN.find((a) => a.id === k.art) || KABELARTEN[0];
      const v = VERLEGUNG.find((x) => x.id === k.verlegung);
      zugZeichnen(
        k.punkte,
        art.farbe,
        4,
        false,
        k.bez + (k.meter ? " · " + k.meter + " m" : "") + (v ? " · " + v.label : "")
      );
    });

    if (entwurf && entwurf.punkte.length) {
      const punkte = zeigerPos ? [...entwurf.punkte, zeigerPos] : entwurf.punkte;
      if (entwurf.typ === "kanal") {
        kanalZeichnen(ctx, { punkte, art: kanalArt, groesse: kanalGroesse, meter: "" });
      } else {
        const farbe = (KABELARTEN.find((a) => a.id === kabelart) || KABELARTEN[0]).farbe;
        ctx.setLineDash([8, 5]);
        zugZeichnen(punkte, farbe, 3, false, null);
        ctx.setLineDash([]);
      }
    }

    let nr = 0;
    aufnahme.zonen.forEach((z) => {
      if (typeof z.x !== "number") return;
      nr++;
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(z.x, z.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FDE047";
      ctx.font = "700 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(nr), z.x, z.y);
      ctx.textBaseline = "alphabetic";
    });

    if (vorschau) {
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#101215";
      ctx.lineWidth = 3;
      if (vorschau.typ === "raum") ctx.strokeRect(vorschau.x, vorschau.y, vorschau.w, vorschau.h);
      else {
        ctx.beginPath();
        ctx.moveTo(vorschau.x1, vorschau.y1);
        ctx.lineTo(vorschau.x2, vorschau.y2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }, [aufnahme, entwurf, zeigerPos, vorschau, modus, sicht, kabelart, kanalArt, kanalGroesse]);

  useEffect(zeichnen, [zeichnen]);

  const leinwandPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 1000, y: ((e.clientY - r.top) / r.height) * 750 };
  };
  const weltPos = (e) => {
    const p = leinwandPos(e);
    return { x: (p.x - sicht.ox) / sicht.s, y: (p.y - sicht.oy) / sicht.s };
  };

  /* Was liegt unter dem Finger? Symbole, Texte, Fotopunkte, Kabelecken */
  const treffer = (p) => {
    const r = 24 / sicht.s;
    for (let i = aufnahme.grundriss.length - 1; i >= 0; i--) {
      const o = aufnahme.grundriss[i];
      if ((o.typ === "symbol" || o.typ === "text" || o.typ === "tuer" || o.typ === "fenster") && abstand(o, p) < r)
        return { was: "grundriss", index: i };
    }
    for (let i = 0; i < aufnahme.zonen.length; i++) {
      const z = aufnahme.zonen[i];
      if (typeof z.x === "number" && abstand(z, p) < r) return { was: "zone", index: i };
    }
    for (let i = 0; i < aufnahme.kabel.length; i++)
      for (let j = 0; j < aufnahme.kabel[i].punkte.length; j++)
        if (abstand(aufnahme.kabel[i].punkte[j], p) < r) return { was: "kabel", index: i, punkt: j };
    for (let i = 0; i < aufnahme.kanaele.length; i++)
      for (let j = 0; j < aufnahme.kanaele[i].punkte.length; j++)
        if (abstand(aufnahme.kanaele[i].punkte[j], p) < r) return { was: "kanal", index: i, punkt: j };
    return null;
  };

  const verschiebe = (ziel, p) =>
    setAufnahme((a) => {
      if (ziel.was === "grundriss") {
        const g = [...a.grundriss];
        g[ziel.index] = { ...g[ziel.index], x: p.x, y: p.y };
        return { ...a, grundriss: g };
      }
      if (ziel.was === "zone") {
        const z = [...a.zonen];
        z[ziel.index] = { ...z[ziel.index], x: p.x, y: p.y };
        return { ...a, zonen: z };
      }
      const feld = ziel.was === "kabel" ? "kabel" : "kanaele";
      const liste = [...a[feld]];
      const punkte = [...liste[ziel.index].punkte];
      punkte[ziel.punkt] = p;
      liste[ziel.index] = { ...liste[ziel.index], punkte };
      return { ...a, [feld]: liste };
    });

  const zugBeenden = () => {
    setEntwurf((e) => {
      if (!e || e.punkte.length < 2) return null;
      if (e.typ === "kanal") {
        setAufnahme((a) => ({
          ...a,
          kanaele: [...a.kanaele, { art: kanalArt, groesse: kanalGroesse, punkte: e.punkte, meter: "" }],
        }));
      } else {
        setAufnahme((a) => ({
          ...a,
          kabel: [...a.kabel, { art: kabelart, bez, verlegung, punkte: e.punkte, meter: "" }],
        }));
      }
      return null;
    });
    setZeigerPos(null);
  };

  const runter = (e) => {
    e.preventDefault();
    zeiger.current.set(e.pointerId, leinwandPos(e));
    if (zeiger.current.size === 2) {
      if (langRef.current) {
        clearTimeout(langRef.current);
        langRef.current = null;
      }
      const [a, b] = Array.from(zeiger.current.values());
      kneifen.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mitte: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        sicht: { ...sicht },
      };
      start.current = null;
      greifen.current = null;
      setVorschau(null);
      return;
    }
    if (zeiger.current.size > 2) return;

    const p = weltPos(e);

    if (werkzeug === "hand") {
      start.current = { ...leinwandPos(e), ox: sicht.ox, oy: sicht.oy, schieben: true };
      return;
    }

    if (werkzeug === "move") {
      const t = treffer(p);
      if (t) greifen.current = t;
      return;
    }

    if (werkzeug === "kabel" || werkzeug === "kanal") {
      langAus.current = false;
      langRef.current = setTimeout(() => {
        langAus.current = true;
        zugBeenden();
      }, 550);
      return;
    }

    if (werkzeug === "foto") {
      setAufnahme((a) => ({
        ...a,
        zonen: [
          ...a.zonen,
          {
            name: "Punkt " + (a.zonen.filter((z) => typeof z.x === "number").length + 1),
            notiz: "",
            fotos: [],
            x: p.x,
            y: p.y,
          },
        ],
      }));
      return;
    }

    if (werkzeug === "symbol") {
      setAufnahme((a) => ({ ...a, grundriss: [...a.grundriss, { typ: "symbol", kind: symbol, x: p.x, y: p.y }] }));
      return;
    }
    if (werkzeug === "text") {
      if (!beschriftung.trim()) return;
      setAufnahme((a) => ({ ...a, grundriss: [...a.grundriss, { typ: "text", text: beschriftung.trim(), x: p.x, y: p.y }] }));
      return;
    }
    if (werkzeug === "tuer" || werkzeug === "fenster") {
      setAufnahme((a) => ({ ...a, grundriss: [...a.grundriss, { typ: werkzeug, x: p.x, y: p.y }] }));
      return;
    }
    start.current = p;
  };

  const bewegen = (e) => {
    if (zeiger.current.has(e.pointerId)) zeiger.current.set(e.pointerId, leinwandPos(e));

    if (kneifen.current && zeiger.current.size === 2) {
      const [a, b] = Array.from(zeiger.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const alt = kneifen.current.sicht;
      const f = Math.min(4, Math.max(0.4, (alt.s * dist) / kneifen.current.dist));
      const m = kneifen.current.mitte;
      setSicht({ s: f, ox: m.x - ((m.x - alt.ox) / alt.s) * f, oy: m.y - ((m.y - alt.oy) / alt.s) * f });
      return;
    }

    if (greifen.current) {
      e.preventDefault();
      verschiebe(greifen.current, weltPos(e));
      return;
    }

    if (entwurf) {
      setZeigerPos(weltPos(e));
      return;
    }

    if (!start.current) return;
    e.preventDefault();

    if (start.current.schieben) {
      const p = leinwandPos(e);
      setSicht((v) => ({ ...v, ox: start.current.ox + (p.x - start.current.x), oy: start.current.oy + (p.y - start.current.y) }));
      return;
    }

    const p = weltPos(e);
    const s = start.current;
    if (werkzeug === "raum")
      setVorschau({ typ: "raum", x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
    else setVorschau({ typ: "linie", x1: s.x, y1: s.y, x2: p.x, y2: p.y });
  };

  const hoch = (e) => {
    zeiger.current.delete(e.pointerId);
    if (zeiger.current.size < 2) kneifen.current = null;

    if (langRef.current) {
      clearTimeout(langRef.current);
      langRef.current = null;
      if (!langAus.current && (werkzeug === "kabel" || werkzeug === "kanal")) {
        const p = weltPos(e);
        setEntwurf((en) =>
          en && en.typ === werkzeug ? { ...en, punkte: [...en.punkte, p] } : { typ: werkzeug, punkte: [p] }
        );
        setZeigerPos(null);
      }
      langAus.current = false;
      return;
    }

    if (greifen.current) {
      greifen.current = null;
      return;
    }

    const s = start.current;
    start.current = null;
    setVorschau(null);
    if (!s || s.schieben) return;

    const p = weltPos(e);
    if (abstand(p, s) < 8) return;

    if (werkzeug === "raum")
      setAufnahme((a) => ({
        ...a,
        grundriss: [
          ...a.grundriss,
          { typ: "raum", x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) },
        ],
      }));
    else if (werkzeug === "wand")
      setAufnahme((a) => ({ ...a, grundriss: [...a.grundriss, { typ: "wand", x1: s.x, y1: s.y, x2: p.x, y2: p.y }] }));
    else if (werkzeug === "mass")
      setAufnahme((a) => ({
        ...a,
        grundriss: [...a.grundriss, { typ: "mass", x1: s.x, y1: s.y, x2: p.x, y2: p.y, meter: "" }],
      }));
  };

  const zurueckEins = () =>
    setAufnahme((a) => {
      if (modus === "kabel") {
        if (werkzeug === "kanal") return a.kanaele.length ? { ...a, kanaele: a.kanaele.slice(0, -1) } : a;
        if (werkzeug === "foto") {
          const punkte = a.zonen.filter((z) => typeof z.x === "number");
          const letzter = punkte[punkte.length - 1];
          return letzter ? { ...a, zonen: a.zonen.filter((z) => z !== letzter) } : a;
        }
        return a.kabel.length ? { ...a, kabel: a.kabel.slice(0, -1) } : a;
      }
      if (werkzeug === "foto") {
        const punkte = a.zonen.filter((z) => typeof z.x === "number");
        const letzter = punkte[punkte.length - 1];
        return letzter ? { ...a, zonen: a.zonen.filter((z) => z !== letzter) } : a;
      }
      return { ...a, grundriss: a.grundriss.slice(0, -1) };
    });

  const png = () => {
    const a = document.createElement("a");
    a.href = canvasRef.current.toDataURL("image/png");
    a.download = aufnahme.id + "_zeichnung.png";
    a.click();
  };

  const knopf = (id, label) => (
    <button
      key={id}
      onClick={() => {
        if (entwurf) zugBeenden();
        setWerkzeug(id);
      }}
      className={
        "rounded-lg px-3 py-2 text-sm font-medium " +
        (werkzeug === id ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-white")
      }
    >
      {label}
    </button>
  );

  const groessen = kanalArt === "rohr" ? ROHR_GROESSEN : KANAL_GROESSEN;
  const skala = pxProMeter(aufnahme.grundriss);
  const masse = aufnahme.grundriss.map((o, i) => ({ o, i })).filter((x) => x.o.typ === "mass");

  const laengeMit = (zug, steig) => {
    if (!skala) return "";
    const z = zahl(aufnahme.zuschlag);
    const roh = zugLaenge(zug) / skala + zahl(steig);
    return (Math.round(roh * (1 + z / 100) * 10) / 10).toString().replace(".", ",");
  };

  const alleLaengen = () =>
    setAufnahme((a) => ({
      ...a,
      kabel: a.kabel.map((k) => ({ ...k, meter: laengeMit(k.punkte, k.steig) })),
      kanaele: a.kanaele.map((k) => ({ ...k, meter: laengeMit(k.punkte, k.steig) })),
    }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {modus === "grundriss"
          ? [
              knopf("raum", "Raum"),
              knopf("wand", "Wand"),
              knopf("tuer", "Tür"),
              knopf("fenster", "Fenster"),
              knopf("symbol", "Bauteil"),
              knopf("text", "Text"),
              knopf("mass", "Maß"),
              knopf("foto", "Fotopunkt"),
              knopf("move", "Verschieben"),
              knopf("hand", "Karte schieben"),
            ]
          : [knopf("kabel", "Kabel"), knopf("kanal", "Kanal / Rohr"), knopf("foto", "Fotopunkt"), knopf("move", "Verschieben"), knopf("hand", "Karte schieben")]}
      </div>

      {werkzeug === "move" && (
        <p className="mb-3 rounded-lg bg-yellow-50 px-3 py-2 text-sm">
          Bauteil, Text, Fotopunkt oder Kabelecke antippen und ziehen.
        </p>
      )}

      {werkzeug === "mass" && (
        <p className="mb-3 rounded-lg bg-yellow-50 px-3 py-2 text-sm">
          Über eine bekannte Strecke ziehen und unten die Meter eintragen. Zwei oder drei Maße machen den Plan
          genauer.
        </p>
      )}

      {(werkzeug === "kabel" || werkzeug === "kanal") && (
        <p className="mb-3 rounded-lg bg-yellow-50 px-3 py-2 text-sm">
          Kurz tippen setzt eine Ecke, lang drücken beendet die Leitung.
        </p>
      )}

      {modus === "grundriss" && werkzeug === "symbol" && (
        <div className="mb-3 flex flex-wrap gap-2">
          {SYMBOLE.map((s) => (
            <button
              key={s.id}
              onClick={() => setSymbol(s.id)}
              className={
                "rounded-full px-3 py-1 text-sm " +
                (symbol === s.id ? "bg-yellow-300 font-semibold" : "border border-neutral-300 bg-white")
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {modus === "grundriss" && werkzeug === "text" && (
        <input
          value={beschriftung}
          onChange={(e) => setBeschriftung(e.target.value)}
          placeholder="Text eintippen, dann in den Plan tippen"
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
      )}

      {modus === "kabel" && werkzeug === "kabel" && (
        <div className="mb-3 space-y-2 rounded-xl border border-neutral-300 bg-white p-3">
          <div className="flex flex-wrap gap-2">
            {KABELARTEN.map((k) => (
              <button
                key={k.id}
                onClick={() => {
                  setKabelart(k.id);
                  setBez(k.bez);
                }}
                className={
                  "flex items-center gap-2 rounded-full border px-3 py-1 text-sm " +
                  (kabelart === k.id ? "border-neutral-900 font-semibold" : "border-neutral-300")
                }
              >
                <span className="h-3 w-3 rounded-full" style={{ background: k.farbe }} />
                {k.label}
              </button>
            ))}
          </div>
          <input
            value={bez}
            onChange={(e) => setBez(e.target.value)}
            placeholder="Bezeichnung, z. B. NYM-J 5x2,5"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-1">
            {QUERSCHNITTE.map((q) => (
              <button
                key={q}
                onClick={() => setBez((b) => b.replace(/\s*\S+$/, "") + " " + q)}
                className="rounded border border-neutral-300 px-2 py-1 text-xs"
              >
                {q}
              </button>
            ))}
          </div>
          <select
            value={verlegung}
            onChange={(e) => setVerlegung(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            {VERLEGUNG.map((v) => (
              <option key={v.id} value={v.id}>
                Verlegung: {v.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {modus === "kabel" && werkzeug === "kanal" && (
        <div className="mb-3 space-y-2 rounded-xl border border-neutral-300 bg-white p-3">
          <div className="flex gap-2">
            {[
              ["kanal", "Kabelkanal"],
              ["rohr", "Rohr"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setKanalArt(id);
                  setKanalGroesse(id === "rohr" ? ROHR_GROESSEN[1] : KANAL_GROESSEN[1]);
                }}
                className={"rounded-lg px-3 py-2 text-sm " + (kanalArt === id ? "bg-neutral-900 text-white" : "border border-neutral-300")}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            value={kanalGroesse}
            onChange={(e) => setKanalGroesse(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            {groessen.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={1000}
        height={750}
        onPointerDown={runter}
        onPointerMove={bewegen}
        onPointerUp={hoch}
        onPointerCancel={hoch}
        className="w-full touch-none rounded-xl border border-neutral-300 bg-white"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {entwurf && (
          <button onClick={zugBeenden} className="rounded-lg bg-yellow-300 px-4 py-2 text-sm font-bold">
            Leitung fertig
          </button>
        )}
        <button
          onClick={() => setSicht((v) => ({ ...v, s: Math.min(4, v.s * 1.3) }))}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold"
        >
          Zoom +
        </button>
        <button
          onClick={() => setSicht((v) => ({ ...v, s: Math.max(0.4, v.s / 1.3) }))}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold"
        >
          Zoom −
        </button>
        <button onClick={() => setSicht({ s: 1, ox: 0, oy: 0 })} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm">
          Ansicht zurück
        </button>
        <button onClick={zurueckEins} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm">
          Letztes zurück
        </button>
        <button onClick={png} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm">
          PNG
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Maßstab</h3>
          <span className="text-sm text-neutral-500">
            {skala ? "gesetzt über " + masse.filter((m) => zahl(m.o.meter) > 0).length + " Maß(e)" : "fehlt noch"}
          </span>
        </div>
        {masse.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Zieh im Grundriss mit dem Werkzeug „Maß“ eine bekannte Strecke, zum Beispiel eine Wand, und trag die Meter
            ein. Danach rechne ich alle Leitungen und Kanäle selbst aus.
          </p>
        ) : (
          <ul className="space-y-2">
            {masse.map(({ o, i }, n) => (
              <li key={i} className="flex items-center gap-2">
                <span className="flex-1 text-sm">Maß {n + 1}</span>
                <input
                  value={o.meter}
                  onChange={(e) =>
                    setAufnahme((a) => {
                      const g = [...a.grundriss];
                      g[i] = { ...g[i], meter: e.target.value };
                      return { ...a, grundriss: g };
                    })
                  }
                  placeholder="m"
                  className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
                />
                <button
                  onClick={() => setAufnahme((a) => ({ ...a, grundriss: a.grundriss.filter((_, k) => k !== i) }))}
                  className="text-sm text-neutral-500"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center gap-2">
          <span className="flex-1 text-sm text-neutral-600">Zuschlag für Reserve und Anschluss</span>
          <input
            value={aufnahme.zuschlag}
            onChange={(e) => setAufnahme((a) => ({ ...a, zuschlag: e.target.value }))}
            className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm"
          />
          <span className="text-sm text-neutral-600">%</span>
        </div>
        {skala && (aufnahme.kabel.length > 0 || aufnahme.kanaele.length > 0) && (
          <button onClick={alleLaengen} className="mt-3 w-full rounded-lg bg-yellow-300 px-4 py-3 font-semibold">
            Alle Längen aus dem Plan rechnen
          </button>
        )}
      </div>

      {modus === "kabel" && (aufnahme.kabel.length > 0 || aufnahme.kanaele.length > 0) && (
        <div className="mt-4 space-y-4">
          {aufnahme.kabel.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">Leitungen</h3>
              <ul className="space-y-2">
                {aufnahme.kabel.map((k, i) => {
                  const art = KABELARTEN.find((a) => a.id === k.art) || KABELARTEN[0];
                  const aendern = (patch) =>
                    setAufnahme((a) => {
                      const kk = [...a.kabel];
                      kk[i] = { ...kk[i], ...patch };
                      return { ...a, kabel: kk };
                    });
                  return (
                    <li key={i} className="rounded-xl border border-neutral-200 bg-white p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: art.farbe }} />
                        <input
                          value={k.bez}
                          onChange={(e) => aendern({ bez: e.target.value })}
                          className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
                        />
                        <input
                          value={k.meter}
                          onChange={(e) => aendern({ meter: e.target.value })}
                          placeholder="m"
                          className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => setAufnahme((a) => ({ ...a, kabel: a.kabel.filter((_, j) => j !== i) }))}
                          className="text-sm text-neutral-500"
                        >
                          ✕
                        </button>
                      </div>
                      <select
                        value={k.verlegung}
                        onChange={(e) => aendern({ verlegung: e.target.value })}
                        className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                      >
                        {VERLEGUNG.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="flex-1 text-neutral-600">
                          {skala
                            ? "aus Plan: " + laengeMit(k.punkte, k.steig) + " m"
                            : "kein Maßstab gesetzt"}
                        </span>
                        <input
                          value={k.steig || ""}
                          onChange={(e) => aendern({ steig: e.target.value })}
                          placeholder="Steig m"
                          className="w-20 rounded border border-neutral-300 px-2 py-1"
                        />
                        {skala && (
                          <button
                            onClick={() => aendern({ meter: laengeMit(k.punkte, k.steig) })}
                            className="rounded border border-neutral-300 px-2 py-1"
                          >
                            übernehmen
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {aufnahme.kanaele.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">Kanäle und Rohre</h3>
              <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
                {aufnahme.kanaele.map((k, i) => (
                  <li key={i} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex-1 text-sm">
                      {k.art === "rohr" ? "Rohr" : "Kabelkanal"} {k.groesse}
                    </span>
                    <input
                      value={k.meter}
                      onChange={(e) =>
                        setAufnahme((a) => {
                          const kk = [...a.kanaele];
                          kk[i] = { ...kk[i], meter: e.target.value };
                          return { ...a, kanaele: kk };
                        })
                      }
                      placeholder="m"
                      className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm"
                    />
                    {skala && (
                      <button
                        onClick={() =>
                          setAufnahme((a) => {
                            const kk = [...a.kanaele];
                            kk[i] = { ...kk[i], meter: laengeMit(kk[i].punkte, kk[i].steig) };
                            return { ...a, kanaele: kk };
                          })
                        }
                        className="rounded border border-neutral-300 px-2 py-1 text-xs"
                      >
                        aus Plan
                      </button>
                    )}
                    <button
                      onClick={() => setAufnahme((a) => ({ ...a, kanaele: a.kanaele.filter((_, j) => j !== i) }))}
                      className="text-sm text-neutral-500"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------- Schrank-Editor -------------------------- */
/* Maße nach VDE-AR-N 4100 / DIN VDE 0603: Feldbreite 250 mm,
   Raumeinheit 150 mm, NAR 300 mm, Zählerfeld 450 mm (300 eHZ + 150 RfZ),
   APZ mind. 300 mm, Verteilerreihe 12 TE à 17,5 mm.                   */

const RE_MM = 150;
const FELD_MM = 250;
const TE_MM = 17.5;
const RAND_MM = (FELD_MM - TE_PRO_REIHE * TE_MM) / 2;

const BAUHOEHEN = [
  { mm: 1100, re: 7, label: "1100 mm · Bauhöhe 3 · 7 RE" },
  { mm: 1400, re: 9, label: "1400 mm · Bauhöhe 5 · 9 RE" },
];

const BAUGRUPPEN = [
  { id: "nar", label: "Netzseitiger Anschlussraum NAR", kurz: "NAR 300", re: 2, farbe: "#DCE6F5" },
  { id: "zf_ehz", label: "Zählerfeld eHZ mit BKE-I + RfZ", kurz: "Zählerfeld eHZ 450", re: 3, farbe: "#FFF3C4", zaehler: true },
  { id: "zf_3p", label: "Zählerfeld Dreipunkt / Zählerkreuz", kurz: "Zählerfeld 3-Punkt 450", re: 3, farbe: "#FFF3C4", zaehler: true },
  { id: "aar1", label: "Anlagenseitiger Anschlussraum 150 mm", kurz: "AAR 150", re: 1, farbe: "#E7E3F5" },
  { id: "aar2", label: "Anlagenseitiger Anschlussraum 300 mm", kurz: "AAR 300", re: 2, farbe: "#E7E3F5" },
  { id: "apz", label: "Raum für APZ", kurz: "APZ 300", re: 2, farbe: "#DFF1E3" },
  { id: "vf", label: "Verteilerreihe 12 TE", kurz: "Verteilerreihe", re: 1, farbe: "#F2F3F5", reihe: true },
  { id: "mm", label: "Multimedia- / Kommunikationsfeld", kurz: "Multimedia 300", re: 2, farbe: "#F3E8F7" },
  { id: "leer", label: "Reserve / Leerraum 150 mm", kurz: "Reserve", re: 1, farbe: "#FAFAFA" },
];

const SCHRANK_B = 900;
const SCHRANK_H = 620;

function baugruppe(id) {
  return BAUGRUPPEN.find((b) => b.id === id);
}

function feldHoeheRe(feld) {
  return feld.gruppen.reduce((s, g) => s + baugruppe(g.id).re, 0);
}

/* Lage jeder Baugruppe in mm, von unten gerechnet */
function schrankLayout(s) {
  const breiteMm = Math.max(1, s.felder.length) * FELD_MM;
  const hoeheMm = s.bauhoehe;
  const sc = Math.min((SCHRANK_B - 90) / breiteMm, (SCHRANK_H - 60) / hoeheMm);
  const ox = (SCHRANK_B - breiteMm * sc) / 2 + 20;
  const oy = (SCHRANK_H - hoeheMm * sc) / 2;
  const kaesten = [];
  s.felder.forEach((f, fi) => {
    let unten = 0;
    f.gruppen.forEach((g, gi) => {
      const bg = baugruppe(g.id);
      kaesten.push({
        fi,
        gi,
        id: g.id,
        xMm: fi * FELD_MM,
        yMm: unten,
        hMm: bg.re * RE_MM,
        bg,
      });
      unten += bg.re * RE_MM;
    });
  });
  const nachPx = (xMm, yMm) => ({ x: ox + xMm * sc, y: oy + (hoeheMm - yMm) * sc });
  const nachMm = (px, py) => ({ xMm: (px - ox) / sc, yMm: hoeheMm - (py - oy) / sc });
  return { sc, ox, oy, breiteMm, hoeheMm, kaesten, nachPx, nachMm };
}

function SchrankPlanung({ aufnahme, setAufnahme }) {
  const s = aufnahme.schrank;
  const canvasRef = useRef(null);
  const [werkzeug, setWerkzeug] = useState("gruppe");
  const [wahlGruppe, setWahlGruppe] = useState("nar");
  const [wahlGeraet, setWahlGeraet] = useState(GERAETE[1].id);
  const [meldung, setMeldung] = useState("");
  const greifen = useRef(null);

  const setzeSchrank = (patch) => setAufnahme((a) => ({ ...a, schrank: { ...a.schrank, ...patch } }));
  const L = schrankLayout(s);

  const reihenListe = L.kaesten.filter((k) => k.bg.reihe);
  const belegung = (fi, gi) =>
    s.module
      .filter((m) => m.feld === fi && m.gruppe === gi)
      .reduce((sum, m) => sum + (GERAETE.find((g) => g.id === m.kind)?.te || 0), 0);

  const zeichnen = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SCHRANK_B, SCHRANK_H);

    const o = L.nachPx(0, L.hoeheMm);
    const u = L.nachPx(L.breiteMm, 0);

    /* Korpus */
    ctx.fillStyle = "#F7F8F9";
    ctx.fillRect(o.x, o.y, u.x - o.x, u.y - o.y);
    ctx.strokeStyle = "#5B6169";
    ctx.lineWidth = 3;
    ctx.strokeRect(o.x, o.y, u.x - o.x, u.y - o.y);

    /* Feldtrennung und RE-Raster */
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#D3D7DC";
    for (let re = 1; re < L.hoeheMm / RE_MM; re++) {
      const p = L.nachPx(0, re * RE_MM);
      ctx.beginPath();
      ctx.moveTo(o.x, p.y);
      ctx.lineTo(u.x, p.y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#9AA0A8";
    ctx.lineWidth = 2;
    s.felder.forEach((_, i) => {
      if (!i) return;
      const p = L.nachPx(i * FELD_MM, 0);
      ctx.beginPath();
      ctx.moveTo(p.x, o.y);
      ctx.lineTo(p.x, u.y);
      ctx.stroke();
    });

    /* Baugruppen */
    L.kaesten.forEach((k) => {
      const a = L.nachPx(k.xMm, k.yMm + k.hMm);
      const b = L.nachPx(k.xMm + FELD_MM, k.yMm);
      ctx.fillStyle = k.bg.farbe;
      ctx.fillRect(a.x + 2, a.y + 2, b.x - a.x - 4, b.y - a.y - 4);
      ctx.strokeStyle = "#6B7280";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(a.x + 2, a.y + 2, b.x - a.x - 4, b.y - a.y - 4);
      ctx.fillStyle = "#3A3F47";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(k.bg.kurz, a.x + 8, a.y + 16);

      if (k.id === "zf_ehz") {
        /* Trennlinie Messeinrichtung 300 mm / RfZ 150 mm */
        const t = L.nachPx(k.xMm, k.yMm + 2 * RE_MM);
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(a.x + 4, t.y);
        ctx.lineTo(b.x - 4, t.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#6B7280";
        ctx.font = "600 10px system-ui, sans-serif";
        ctx.fillText("RfZ 150", a.x + 8, t.y - 6);
        const m = L.nachPx(k.xMm + FELD_MM / 2, k.yMm + 3.2 * RE_MM);
        ctx.strokeStyle = "#3A3F47";
        ctx.strokeRect(m.x - 45 * L.sc, m.y, 90 * L.sc, 160 * L.sc);
      }
      if (k.id === "zf_3p") {
        const m = L.nachPx(k.xMm + FELD_MM / 2, k.yMm + k.hMm / 2);
        ctx.strokeStyle = "#3A3F47";
        ctx.beginPath();
        ctx.moveTo(m.x, m.y - 75 * L.sc);
        ctx.lineTo(m.x, m.y + 75 * L.sc);
        ctx.moveTo(m.x - 75 * L.sc, m.y);
        ctx.lineTo(m.x + 75 * L.sc, m.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(m.x, m.y, 60 * L.sc, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (k.id === "nar") {
        /* 5-poliges Sammelschienensystem */
        for (let i = 0; i < 5; i++) {
          const p = L.nachPx(k.xMm + 30 + i * 40, k.yMm + 60);
          ctx.fillStyle = "#B08D57";
          ctx.fillRect(p.x, p.y - 40 * L.sc, 8 * L.sc, 80 * L.sc);
        }
      }
      if (k.bg.reihe) {
        const sch = L.nachPx(k.xMm, k.yMm + k.hMm / 2);
        const sch2 = L.nachPx(k.xMm + FELD_MM, 0);
        ctx.strokeStyle = "#8A9099";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sch.x + 6, sch.y);
        ctx.lineTo(sch2.x - 6, sch.y);
        ctx.stroke();
      }
    });

    /* Reihengeräte maßstäblich */
    s.module.forEach((m) => {
      const g = GERAETE.find((x) => x.id === m.kind);
      const k = L.kaesten.find((x) => x.fi === m.feld && x.gi === m.gruppe);
      if (!g || !k) return;
      const links = L.nachPx(k.xMm + RAND_MM + m.te * TE_MM, k.yMm + k.hMm / 2);
      geraetZeichnen(ctx, g, links.x, links.y, m.beschriftung, g.te * TE_MM * L.sc, 90 * L.sc);
    });

    /* Bemaßung */
    ctx.fillStyle = "#6B7280";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(L.breiteMm + " mm", (o.x + u.x) / 2, u.y + 22);
    ctx.save();
    ctx.translate(o.x - 12, (o.y + u.y) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(L.hoeheMm + " mm", 0, 0);
    ctx.restore();
  }, [s, L]);

  useEffect(zeichnen, [zeichnen]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SCHRANK_B, y: ((e.clientY - r.top) / r.height) * SCHRANK_H };
  };

  const kastenBei = (p) => {
    const m = L.nachMm(p.x, p.y);
    return L.kaesten.find(
      (k) => m.xMm >= k.xMm && m.xMm <= k.xMm + FELD_MM && m.yMm >= k.yMm && m.yMm <= k.yMm + k.hMm
    );
  };

  const modulBei = (p) => {
    const m = L.nachMm(p.x, p.y);
    return s.module.findIndex((mo) => {
      const g = GERAETE.find((x) => x.id === mo.kind);
      const k = L.kaesten.find((x) => x.fi === mo.feld && x.gi === mo.gruppe);
      if (!g || !k) return false;
      const x1 = k.xMm + RAND_MM + mo.te * TE_MM;
      return m.xMm >= x1 && m.xMm <= x1 + g.te * TE_MM && m.yMm >= k.yMm && m.yMm <= k.yMm + k.hMm;
    });
  };

  const feldIndexBei = (p) => {
    const m = L.nachMm(p.x, p.y);
    const i = Math.floor(m.xMm / FELD_MM);
    return i >= 0 && i < s.felder.length ? i : null;
  };

  const gruppeAnhaengen = (fi) => {
    const bg = baugruppe(wahlGruppe);
    const hoehe = BAUHOEHEN.find((b) => b.mm === s.bauhoehe) || BAUHOEHEN[0];
    const feld = s.felder[fi];
    if (!feld) return;
    if (feldHoeheRe(feld) + bg.re > hoehe.re) {
      setMeldung("Passt nicht mehr: Feld " + (fi + 1) + " hat nur " + hoehe.re + " RE.");
      return;
    }
    const felder = s.felder.map((f, i) => (i === fi ? { gruppen: [...f.gruppen, { id: bg.id }] } : f));
    setzeSchrank({ felder });
    setMeldung("");
  };

  const platziereGeraet = (k) => {
    if (!k.bg.reihe) {
      setMeldung("Reihengeräte gehören in eine Verteilerreihe.");
      return;
    }
    const g = GERAETE.find((x) => x.id === wahlGeraet);
    const belegt = belegung(k.fi, k.gi);
    if (belegt + g.te > TE_PRO_REIHE) {
      setMeldung("Die Reihe ist voll: " + belegt + " von " + TE_PRO_REIHE + " TE.");
      return;
    }
    setzeSchrank({
      module: [...s.module, { kind: g.id, feld: k.fi, gruppe: k.gi, te: belegt, beschriftung: "" }],
    });
    setMeldung("");
  };

  const runter = (e) => {
    e.preventDefault();
    const p = pos(e);
    if (werkzeug === "gruppe") {
      const fi = feldIndexBei(p);
      if (fi !== null) gruppeAnhaengen(fi);
      return;
    }
    if (werkzeug === "geraet") {
      const k = kastenBei(p);
      if (k) platziereGeraet(k);
      return;
    }
    if (werkzeug === "entfernen") {
      const mi = modulBei(p);
      if (mi >= 0) {
        setzeSchrank({ module: s.module.filter((_, i) => i !== mi) });
        return;
      }
      const k = kastenBei(p);
      if (k) {
        const felder = s.felder.map((f, i) =>
          i === k.fi ? { gruppen: f.gruppen.filter((_, gi) => gi !== k.gi) } : f
        );
        const module = s.module
          .filter((m) => !(m.feld === k.fi && m.gruppe === k.gi))
          .map((m) => (m.feld === k.fi && m.gruppe > k.gi ? { ...m, gruppe: m.gruppe - 1 } : m));
        setzeSchrank({ felder, module });
      }
      return;
    }
    if (werkzeug === "move") {
      const mi = modulBei(p);
      if (mi >= 0) greifen.current = mi;
    }
  };

  const bewegen = (e) => {
    if (greifen.current === null || greifen.current === undefined) return;
    e.preventDefault();
    const p = pos(e);
    const k = kastenBei(p);
    if (!k || !k.bg.reihe) return;
    const m = L.nachMm(p.x, p.y);
    const idx = greifen.current;
    const g = GERAETE.find((x) => x.id === s.module[idx].kind);
    let te = Math.round((m.xMm - k.xMm - RAND_MM) / TE_MM);
    te = Math.max(0, Math.min(TE_PRO_REIHE - g.te, te));
    setAufnahme((a) => {
      const mm = [...a.schrank.module];
      mm[idx] = { ...mm[idx], feld: k.fi, gruppe: k.gi, te };
      return { ...a, schrank: { ...a.schrank, module: mm } };
    });
  };

  const hoch = () => {
    greifen.current = null;
  };

  /* Prüfung gegen die Anwendungsregel */
  const hoehe = BAUHOEHEN.find((b) => b.mm === s.bauhoehe);
  const alleGruppen = L.kaesten;
  const zaehlerfeld = alleGruppen.find((k) => k.bg.zaehler);
  const sockel = zahl(s.sockel);
  const zaehlerMitte = zaehlerfeld ? sockel + zaehlerfeld.yMm + zaehlerfeld.hMm - 150 : null;
  const pruefungen = [
    { ok: !!alleGruppen.find((k) => k.id === "nar"), text: "Netzseitiger Anschlussraum 300 mm vorhanden" },
    { ok: !!zaehlerfeld, text: "Zählerfeld 450 mm vorhanden" },
    { ok: !!alleGruppen.find((k) => k.id === "apz"), text: "Raum für APZ im Schrank (Pflicht nach VDE-AR-N 4100)" },
    { ok: !!s.module.find((m) => m.kind === "sls"), text: "SLS als Trennvorrichtung eingeplant" },
    { ok: !!s.module.find((m) => m.kind === "fib" || m.kind === "fia"), text: "Mindestens ein FI-Schutzschalter" },
    { ok: !!s.module.find((m) => m.kind === "uess"), text: "Überspannungsschutz nach DIN VDE 0100-443" },
    {
      ok: s.felder.every((f) => feldHoeheRe(f) <= (hoehe ? hoehe.re : 7)),
      text: "Kein Feld über " + (hoehe ? hoehe.re : 7) + " RE bestückt",
    },
    {
      ok: reihenListe.every((k) => belegung(k.fi, k.gi) <= TE_PRO_REIHE),
      text: "Keine Verteilerreihe über 12 TE",
    },
    {
      ok: zaehlerMitte === null ? false : zaehlerMitte >= 800 && zaehlerMitte <= 1800,
      text: "Zähler zwischen 0,80 m und 1,80 m über Fertigfußboden",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="mb-1 block text-sm text-neutral-600">Felder à 250 mm</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => {
                  const felder = Array.from({ length: n }).map((_, i) => s.felder[i] || { gruppen: [] });
                  setzeSchrank({ felder, module: s.module.filter((m) => m.feld < n) });
                }}
                className={
                  "flex-1 rounded-lg px-2 py-2 text-sm " +
                  (s.felder.length === n ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-white")
                }
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-sm text-neutral-600">Bauhöhe</span>
          <select
            value={s.bauhoehe}
            onChange={(e) => setzeSchrank({ bauhoehe: parseInt(e.target.value, 10) })}
            className="w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
          >
            {BAUHOEHEN.map((b) => (
              <option key={b.mm} value={b.mm}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-neutral-500">
        Außenmaß {L.breiteMm} × {s.bauhoehe} mm, Tiefe je nach Baureihe rund 215 mm.
      </p>

      <div className="flex flex-wrap gap-2">
        {[
          ["gruppe", "Baugruppe"],
          ["geraet", "Reihengerät"],
          ["move", "Verschieben"],
          ["entfernen", "Entfernen"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setWerkzeug(id)}
            className={
              "rounded-lg px-3 py-2 text-sm font-medium " +
              (werkzeug === id ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-white")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {werkzeug === "gruppe" && (
        <div>
          <select
            value={wahlGruppe}
            onChange={(e) => setWahlGruppe(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          >
            {BAUGRUPPEN.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label} ({b.re * RE_MM} mm)
              </option>
            ))}
          </select>
          <p className="mt-2 rounded-lg bg-yellow-50 px-3 py-2 text-sm">
            Ins gewünschte Feld tippen. Die Baugruppen stapeln sich von unten, wie im Schrank auch — NAR zuerst.
          </p>
        </div>
      )}

      {werkzeug === "geraet" && (
        <select
          value={wahlGeraet}
          onChange={(e) => setWahlGeraet(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        >
          {GERAETE.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label} ({g.te} TE)
            </option>
          ))}
        </select>
      )}

      {meldung && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{meldung}</p>}

      <canvas
        ref={canvasRef}
        width={SCHRANK_B}
        height={SCHRANK_H}
        onPointerDown={runter}
        onPointerMove={bewegen}
        onPointerUp={hoch}
        onPointerCancel={hoch}
        className="w-full touch-none rounded-xl border border-neutral-300 bg-white"
      />

      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm text-neutral-600">Unterkante Schrank über Fertigfußboden</span>
        <input
          value={s.sockel}
          onChange={(e) => setzeSchrank({ sockel: e.target.value })}
          className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
        />
        <span className="text-sm text-neutral-600">mm</span>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-3">
        <h3 className="mb-2 font-semibold">Prüfung</h3>
        <ul className="space-y-1 text-sm">
          {pruefungen.map((p, i) => (
            <li key={i} className={p.ok ? "text-neutral-700" : "font-medium text-red-700"}>
              {p.ok ? "erfüllt" : "offen"} — {p.text}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-neutral-500">
          Grundprüfung nach VDE-AR-N 4100 und DIN VDE 0603. Die Vorgaben des Netzbetreibers gehen vor.
        </p>
      </div>

      {reihenListe.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-3 text-sm">
          {reihenListe.map((k, i) => (
            <div key={i} className="flex justify-between border-b border-neutral-100 py-1 last:border-0">
              <span>
                Feld {k.fi + 1}, Reihe auf {k.yMm} mm
              </span>
              <span className={belegung(k.fi, k.gi) > TE_PRO_REIHE ? "font-semibold text-red-600" : "text-neutral-500"}>
                {belegung(k.fi, k.gi)} / {TE_PRO_REIHE} TE
              </span>
            </div>
          ))}
        </div>
      )}

      {s.module.length > 0 && (
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {s.module.map((m, i) => {
            const g = GERAETE.find((x) => x.id === m.kind);
            return (
              <li key={i} className="flex items-center gap-2 px-3 py-2">
                <span className="w-10 shrink-0 text-xs text-neutral-500">F{m.feld + 1}</span>
                <span className="w-28 shrink-0 text-sm font-medium">{g ? g.label : m.kind}</span>
                <input
                  value={m.beschriftung}
                  onChange={(e) =>
                    setAufnahme((a) => {
                      const mm = [...a.schrank.module];
                      mm[i] = { ...mm[i], beschriftung: e.target.value };
                      return { ...a, schrank: { ...a.schrank, module: mm } };
                    })
                  }
                  placeholder="Typ und Stromkreis, z. B. C16 Wärmepumpe"
                  className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
                />
                <button
                  onClick={() => setzeSchrank({ module: s.module.filter((_, k) => k !== i) })}
                  className="text-sm text-neutral-500"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Feld
        label="Anleitung für den Monteur"
        mehrzeilig
        platzhalter="Was ist zu tun, worauf achten, Reihenfolge …"
        wert={s.notiz}
        onChange={(v) => setzeSchrank({ notiz: v })}
      />
    </div>
  );
}

/* ---------------------- Bestand: Foto und Schienen ----------------- */

function SchrankBestand({ aufnahme, setAufnahme }) {
  const s = aufnahme.schrank;
  const canvasRef = useRef(null);
  const bildRef = useRef(null);
  const [bildFertig, setBildFertig] = useState(0);
  const [wahl, setWahl] = useState(GERAETE[1].id);
  const [werkzeug, setWerkzeug] = useState("setzen");
  const [suche, setSuche] = useState("");
  const greifen = useRef(null);

  const setzeSchrank = (patch) => setAufnahme((a) => ({ ...a, schrank: { ...a.schrank, ...patch } }));

  useEffect(() => {
    if (!s.foto) {
      bildRef.current = null;
      setBildFertig((n) => n + 1);
      return;
    }
    const img = new Image();
    img.onload = () => {
      bildRef.current = img;
      setBildFertig((n) => n + 1);
    };
    img.src = s.foto;
  }, [s.foto]);

  const schienen = s.schienen.length
    ? s.schienen
    : Array.from({ length: 4 }).map((_, i) => ({ y: 120 + i * 120, x1: 80, x2: 80 + TE_PRO_REIHE * TE_BREIT }));

  const zeichnen = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);

    if (bildRef.current) {
      const img = bildRef.current;
      const f = Math.min(c.width / img.width, c.height / img.height);
      ctx.globalAlpha = 0.85;
      ctx.drawImage(img, (c.width - img.width * f) / 2, (c.height - img.height * f) / 2, img.width * f, img.height * f);
      ctx.globalAlpha = 1;
    }

    schienen.forEach((sch, i) => {
      ctx.strokeStyle = "#8A9099";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sch.x1, sch.y);
      ctx.lineTo(sch.x2, sch.y);
      ctx.stroke();
      ctx.fillStyle = "#8A9099";
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Reihe " + (i + 1), Math.max(4, sch.x1 - 55), sch.y + 4);
    });

    (s.bestandModule || []).forEach((m) => {
      const g = GERAETE.find((x) => x.id === m.kind);
      if (!g) return;
      const sch = schienen[m.schiene] || schienen[0];
      geraetZeichnen(ctx, g, m.x, sch.y, m.beschriftung);
    });
  }, [s.bestandModule, schienen, bildFertig]);

  useEffect(zeichnen, [zeichnen]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 900, y: ((e.clientY - r.top) / r.height) * 620 };
  };

  const naechsteSchiene = (y) => {
    let best = 0;
    schienen.forEach((sch, i) => {
      if (Math.abs(sch.y - y) < Math.abs(schienen[best].y - y)) best = i;
    });
    return best;
  };

  const runter = (e) => {
    e.preventDefault();
    const p = pos(e);
    const module = s.bestandModule || [];
    if (werkzeug === "schiene") {
      setzeSchrank({ schienen: [...schienen, { y: p.y, x1: 40, x2: 860 }] });
      return;
    }
    if (werkzeug === "move" || werkzeug === "loeschen") {
      const idx = module.findIndex((m) => {
        const g = GERAETE.find((x) => x.id === m.kind);
        const sch = schienen[m.schiene] || schienen[0];
        return g && p.x >= m.x && p.x <= m.x + g.te * TE_BREIT && Math.abs(p.y - sch.y) < 34;
      });
      if (idx < 0) return;
      if (werkzeug === "loeschen") setzeSchrank({ bestandModule: module.filter((_, i) => i !== idx) });
      else greifen.current = idx;
      return;
    }
    const g = GERAETE.find((x) => x.id === wahl);
    setzeSchrank({
      bestandModule: [
        ...module,
        { kind: g.id, x: p.x - (g.te * TE_BREIT) / 2, schiene: naechsteSchiene(p.y), beschriftung: "" },
      ],
    });
  };

  const bewegen = (e) => {
    if (greifen.current === null || greifen.current === undefined) return;
    e.preventDefault();
    const p = pos(e);
    const idx = greifen.current;
    setAufnahme((a) => {
      const mm = [...(a.schrank.bestandModule || [])];
      const g = GERAETE.find((x) => x.id === mm[idx].kind);
      mm[idx] = { ...mm[idx], x: p.x - (g.te * TE_BREIT) / 2, schiene: naechsteSchiene(p.y) };
      return { ...a, schrank: { ...a.schrank, bestandModule: mm } };
    });
  };

  const hoch = () => {
    greifen.current = null;
  };

  async function schienenErkennen() {
    if (!s.foto) return;
    setSuche("Suche Hutschienen im Foto …");
    try {
      const antwort = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: "image/jpeg", data: s.foto.split(",")[1] } },
                {
                  type: "text",
                  text:
                    "Foto eines Zählerschranks oder Verteilers. Finde die waagerechten Hutschienen bzw. Gerätereihen. " +
                    'Antworte NUR mit JSON, ohne Text und ohne Backticks: [{"y":0.34,"x1":0.12,"x2":0.88}] ' +
                    "mit Werten von 0 bis 1 relativ zu Bildhöhe und Bildbreite.",
                },
              ],
            },
          ],
        }),
      });
      const daten = await antwort.json();
      const roh = daten.content
        .map((t) => (t.type === "text" ? t.text : ""))
        .join("")
        .replace(/```json|```/g, "")
        .trim();
      const liste = JSON.parse(roh);
      const c = canvasRef.current;
      const img = bildRef.current;
      const f = Math.min(c.width / img.width, c.height / img.height);
      const bx = (c.width - img.width * f) / 2;
      const by = (c.height - img.height * f) / 2;
      const neu = liste
        .filter((r) => typeof r.y === "number")
        .map((r) => ({
          y: by + r.y * img.height * f,
          x1: bx + (r.x1 == null ? 0.1 : r.x1) * img.width * f,
          x2: bx + (r.x2 == null ? 0.9 : r.x2) * img.width * f,
        }));
      if (!neu.length) throw new Error("leer");
      setzeSchrank({ schienen: neu });
      setSuche(neu.length + " Reihen gefunden. Mit „Schiene setzen“ kannst du nachbessern.");
    } catch (e) {
      setSuche("Konnte die Schienen nicht sicher erkennen. Setz sie mit „Schiene setzen“ selbst.");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Für den Bestand: Schrank fotografieren, Schienen erkennen lassen und aufnehmen, was drin steckt.
      </p>

      <div className="flex flex-wrap gap-2">
        <FotoEingabe
          label="Schrank fotografieren"
          mitKamera
          onBild={(bild) => setzeSchrank({ foto: bild, schienen: [] })}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        />
        <FotoEingabe
          label="Bild auswählen"
          onBild={(bild) => setzeSchrank({ foto: bild, schienen: [] })}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium"
        />
        {s.foto && (
          <>
            <button onClick={schienenErkennen} className="rounded-lg bg-yellow-300 px-4 py-2 text-sm font-semibold">
              Hutschienen erkennen
            </button>
            <button onClick={() => setzeSchrank({ foto: null, schienen: [] })} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm">
              Foto weg
            </button>
          </>
        )}
      </div>
      {suche && <p className="rounded-lg bg-neutral-200 px-3 py-2 text-sm">{suche}</p>}

      <div className="flex flex-wrap gap-2">
        {[
          ["setzen", "Gerät setzen"],
          ["move", "Verschieben"],
          ["loeschen", "Entfernen"],
          ["schiene", "Schiene setzen"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setWerkzeug(id)}
            className={
              "rounded-lg px-3 py-2 text-sm font-medium " +
              (werkzeug === id ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-white")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {werkzeug === "setzen" && (
        <select value={wahl} onChange={(e) => setWahl(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-3 py-2">
          {GERAETE.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label} ({g.te} TE)
            </option>
          ))}
        </select>
      )}

      <canvas
        ref={canvasRef}
        width={900}
        height={620}
        onPointerDown={runter}
        onPointerMove={bewegen}
        onPointerUp={hoch}
        onPointerCancel={hoch}
        className="w-full touch-none rounded-xl border border-neutral-300 bg-white"
      />

      {(s.bestandModule || []).length > 0 && (
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {s.bestandModule.map((m, i) => {
            const g = GERAETE.find((x) => x.id === m.kind);
            return (
              <li key={i} className="flex items-center gap-2 px-3 py-2">
                <span className="w-8 shrink-0 text-xs text-neutral-500">R{m.schiene + 1}</span>
                <span className="w-28 shrink-0 text-sm font-medium">{g ? g.label : m.kind}</span>
                <input
                  value={m.beschriftung}
                  onChange={(e) =>
                    setAufnahme((a) => {
                      const mm = [...a.schrank.bestandModule];
                      mm[i] = { ...mm[i], beschriftung: e.target.value };
                      return { ...a, schrank: { ...a.schrank, bestandModule: mm } };
                    })
                  }
                  placeholder="Beschriftung"
                  className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
                />
                <button
                  onClick={() => setzeSchrank({ bestandModule: s.bestandModule.filter((_, k) => k !== i) })}
                  className="text-sm text-neutral-500"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Schrank({ aufnahme, setAufnahme }) {
  const modus = aufnahme.schrank.modus || "planung";
  return (
    <div className="space-y-4">
      <div className="flex overflow-hidden rounded-lg border border-neutral-300">
        {[
          ["planung", "Planung"],
          ["bestand", "Bestand aufnehmen"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setAufnahme((a) => ({ ...a, schrank: { ...a.schrank, modus: id } }))}
            className={"flex-1 px-2 py-2 text-sm font-medium " + (modus === id ? "bg-neutral-900 text-white" : "bg-white")}
          >
            {label}
          </button>
        ))}
      </div>
      {modus === "planung" ? (
        <SchrankPlanung aufnahme={aufnahme} setAufnahme={setAufnahme} />
      ) : (
        <SchrankBestand aufnahme={aufnahme} setAufnahme={setAufnahme} />
      )}
    </div>
  );
}

/* ------------------------------ Fotos ----------------------------- */

function Zone({ zone, index, zoneAendern, entfernen, nummer }) {
  const [referenz, setReferenz] = useState("Zollstock 2 m im Bild");
  const [schaetzung, setSchaetzung] = useState("");
  const [laeuft, setLaeuft] = useState(false);

  async function schaetzen() {
    if (!zone.fotos.length) return;
    setLaeuft(true);
    setSchaetzung("");
    try {
      const antwort = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/jpeg", data: zone.fotos[0].split(",")[1] },
                },
                {
                  type: "text",
                  text:
                    "Foto von einer Elektro-Baustelle. Als Größenreferenz gilt: " +
                    referenz +
                    ". Schätze daraus die wichtigsten Maße für die Elektroinstallation, zum Beispiel Wandlänge, " +
                    "Höhe bis zur Decke, Abstand zwischen Geräten, Kabelweg. Antworte auf Deutsch in maximal fünf " +
                    "kurzen Zeilen der Form 'Was: ca. X m'. Schreib dazu, wenn die Referenz im Bild nicht erkennbar ist.",
                },
              ],
            },
          ],
        }),
      });
      const daten = await antwort.json();
      const text = daten.content.map((t) => (t.type === "text" ? t.text : "")).join("").trim();
      setSchaetzung(text || "Keine Schätzung möglich.");
    } catch (e) {
      setSchaetzung("Schätzung hat nicht geklappt.");
    }
    setLaeuft(false);
  }

  return (
    <div className="rounded-xl border border-neutral-300 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        {nummer && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-yellow-300">
            {nummer}
          </span>
        )}
        <input
          value={zone.name}
          onChange={(e) => zoneAendern(index, { name: e.target.value })}
          className="flex-1 rounded border border-transparent px-1 py-1 font-semibold"
        />
        <button onClick={() => entfernen(index)} className="text-sm text-neutral-400">
          ✕
        </button>
      </div>
      <input
        value={zone.notiz}
        onChange={(e) => zoneAendern(index, { notiz: e.target.value })}
        placeholder="Notiz, z. B. Wanddicke 36,5 cm"
        className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {zone.fotos.map((f, k) => (
          <div key={k} className="relative">
            <img src={f} alt="" className="h-20 w-20 rounded object-cover" />
            <button
              onClick={() => zoneAendern(index, { fotos: zone.fotos.filter((_, j) => j !== k) })}
              className="absolute right-0 top-0 rounded-bl bg-white/90 px-1 text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FotoEingabe
          label="Kamera"
          mitKamera
          onBild={(b) => zoneAendern(index, { fotos: [...zone.fotos, b] })}
          className="rounded-lg bg-neutral-900 px-3 py-3 text-sm font-semibold text-white"
        />
        <FotoEingabe
          label="Aus Galerie"
          onBild={(b) => zoneAendern(index, { fotos: [...zone.fotos, b] })}
          className="rounded-lg border border-neutral-300 px-3 py-3 text-sm font-medium"
        />
      </div>

      {zone.fotos.length > 0 && (
        <div className="mt-3 border-t border-neutral-200 pt-3">
          <input
            value={referenz}
            onChange={(e) => setReferenz(e.target.value)}
            placeholder="Referenz im Bild, z. B. Zollstock 2 m"
            className="mb-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            onClick={schaetzen}
            disabled={laeuft}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium"
          >
            {laeuft ? "schätzt …" : "Maße aus Foto schätzen"}
          </button>
          {schaetzung && (
            <div className="mt-2 rounded-lg bg-neutral-100 p-3 text-sm">
              <pre className="whitespace-pre-wrap font-sans">{schaetzung}</pre>
              <button
                onClick={() => zoneAendern(index, { notiz: (zone.notiz ? zone.notiz + " · " : "") + schaetzung.replace(/\n/g, " · ") })}
                className="mt-2 rounded border border-neutral-300 px-2 py-1 text-xs"
              >
                in Notiz übernehmen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Fotos({ aufnahme, setAufnahme }) {
  const [neu, setNeu] = useState("");

  const zoneAendern = (i, patch) =>
    setAufnahme((a) => {
      const z = [...a.zonen];
      z[i] = { ...z[i], ...patch };
      return { ...a, zonen: z };
    });

  const entfernen = (i) => setAufnahme((a) => ({ ...a, zonen: a.zonen.filter((_, k) => k !== i) }));

  let punktNr = 0;

  return (
    <div className="space-y-4">
      {aufnahme.zonen.map((z, i) => {
        const nummer = typeof z.x === "number" ? ++punktNr : null;
        return (
          <Zone
            key={i}
            zone={z}
            index={i}
            nummer={nummer}
            zoneAendern={zoneAendern}
            entfernen={entfernen}
          />
        );
      })}

      <div className="flex gap-2">
        <input
          value={neu}
          onChange={(e) => setNeu(e.target.value)}
          placeholder="Weitere Wand / Seite"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2"
        />
        <button
          onClick={() => {
            if (!neu.trim()) return;
            setAufnahme((a) => ({ ...a, zonen: [...a.zonen, { name: neu.trim(), notiz: "", fotos: [] }] }));
            setNeu("");
          }}
          className="rounded-lg border border-neutral-300 px-4 py-2 font-medium"
        >
          Hinzufügen
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- Material --------------------------- */

function Material({ aufnahme, setAufnahme }) {
  const katalog = MATERIAL_KATALOG[aufnahme.art] || [];
  const [pos, setPos] = useState({ text: "", menge: "1", einheit: "Stk" });
  const [hoert, setHoert] = useState(false);
  const erkennung = useRef(null);

  const hinzu = (text, menge, einheit) => {
    if (!text.trim()) return;
    setAufnahme((a) => ({ ...a, material: [...a.material, { text: text.trim(), menge, einheit }] }));
  };

  const ausPlan = () => {
    const neu = [];
    aufnahme.kabel.forEach((k) => k.meter && neu.push({ text: k.bez, menge: k.meter, einheit: "m" }));
    aufnahme.kanaele.forEach(
      (k) => k.meter && neu.push({ text: (k.art === "rohr" ? "Rohr " : "Kabelkanal ") + k.groesse, menge: k.meter, einheit: "m" })
    );
    aufnahme.schrank.module.forEach((m) => {
      const g = GERAETE.find((x) => x.id === m.kind);
      if (g) neu.push({ text: g.label + (m.beschriftung ? " (" + m.beschriftung + ")" : ""), menge: "1", einheit: "Stk" });
    });
    if (aufnahme.schrank.felder.some((f) => f.gruppen.length)) {
      neu.push({
        text:
          "Zählerschrank " +
          aufnahme.schrank.felder.length * FELD_MM +
          " x " +
          aufnahme.schrank.bauhoehe +
          " mm, " +
          aufnahme.schrank.felder.length +
          " Felder",
        menge: "1",
        einheit: "Stk",
      });
    }
    if (!neu.length) return;
    setAufnahme((a) => ({ ...a, material: [...a.material, ...neu] }));
  };

  const sprache = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Spracheingabe geht in diesem Browser nicht. Bitte tippen.");
      return;
    }
    if (hoert) {
      erkennung.current && erkennung.current.stop();
      setHoert(false);
      return;
    }
    const r = new SR();
    r.lang = "de-DE";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e) => {
      const satz = e.results[0][0].transcript;
      const m = satz.match(/^\s*(\d+[.,]?\d*)\s*(meter|m|stück|stk|rollen?|paket|kg)?\s*(.+)$/i);
      if (m && m[3]) {
        const eh = (m[2] || "").toLowerCase();
        const einheit = eh.startsWith("m") ? "m" : eh.startsWith("roll") ? "Rolle" : eh === "kg" ? "kg" : "Stk";
        hinzu(m[3], m[1].replace(",", "."), einheit);
      } else hinzu(satz, "1", "Stk");
      setHoert(false);
    };
    r.onerror = () => setHoert(false);
    r.onend = () => setHoert(false);
    erkennung.current = r;
    r.start();
    setHoert(true);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={sprache}
        className={"w-full rounded-xl px-4 py-4 text-lg font-semibold " + (hoert ? "bg-red-600 text-white" : "bg-yellow-300")}
      >
        {hoert ? "Hört zu – tippen zum Stoppen" : "Material diktieren"}
      </button>
      <button onClick={ausPlan} className="w-full rounded-lg border border-neutral-300 px-4 py-3 font-medium">
        Aus Zeichnung übernehmen
      </button>

      <div className="rounded-xl border border-neutral-300 bg-white p-4">
        <div className="mb-2 flex gap-2">
          <input
            value={pos.menge}
            onChange={(e) => setPos({ ...pos, menge: e.target.value })}
            className="w-20 rounded-lg border border-neutral-300 px-3 py-2"
          />
          <select
            value={pos.einheit}
            onChange={(e) => setPos({ ...pos, einheit: e.target.value })}
            className="rounded-lg border border-neutral-300 px-3 py-2"
          >
            {EINHEITEN.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </div>
        <select
          value={katalog.includes(pos.text) ? pos.text : ""}
          onChange={(e) => setPos({ ...pos, text: e.target.value })}
          className="mb-2 w-full rounded-lg border border-neutral-300 px-3 py-2"
        >
          <option value="">– aus Liste wählen –</option>
          {katalog.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <input
          value={pos.text}
          onChange={(e) => setPos({ ...pos, text: e.target.value })}
          placeholder="oder frei eintippen"
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
        <button
          onClick={() => {
            hinzu(pos.text, pos.menge, pos.einheit);
            setPos({ text: "", menge: "1", einheit: "Stk" });
          }}
          className="w-full rounded-lg bg-neutral-900 px-4 py-3 font-semibold text-white"
        >
          Auf die Liste
        </button>
      </div>

      {aufnahme.material.length > 0 && (
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {aufnahme.material.map((m, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-3">
              <span>
                <span className="font-semibold">
                  {m.menge} {m.einheit}
                </span>{" "}
                {m.text}
              </span>
              <button
                onClick={() => setAufnahme((a) => ({ ...a, material: a.material.filter((_, k) => k !== i) }))}
                className="text-sm text-neutral-500"
              >
                löschen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------ Fragen ---------------------------- */

function Auswahl({ label, wert, onChange, optionen }) {
  return (
    <div>
      <span className="mb-1 block text-sm text-neutral-600">{label}</span>
      <div className="flex gap-2">
        {optionen.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={"rounded-lg px-4 py-2 text-sm " + (wert === o ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-white")}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Fragen({ aufnahme, setzeFeld }) {
  const f = aufnahme.fragen;
  const ja = ["ja", "nein", "unklar"];
  return (
    <div className="space-y-5">
      <Auswahl label="Zählerantrag nötig?" wert={f.zaehlerantrag} onChange={(v) => setzeFeld("fragen.zaehlerantrag", v)} optionen={ja} />
      <Feld label="Netzbetreiber" wert={f.netzbetreiber} onChange={(v) => setzeFeld("fragen.netzbetreiber", v)} />
      <Feld label="Zählernummer" wert={f.zaehlernummer} onChange={(v) => setzeFeld("fragen.zaehlernummer", v)} />
      <Auswahl label="Zählerschrank tauschen?" wert={f.schrankTausch} onChange={(v) => setzeFeld("fragen.schrankTausch", v)} optionen={ja} />
      <Auswahl
        label="Potentialausgleich vorhanden?"
        wert={f.potentialausgleich}
        onChange={(v) => setzeFeld("fragen.potentialausgleich", v)}
        optionen={ja}
      />
      <Auswahl label="Baustrom vorhanden?" wert={f.baustrom} onChange={(v) => setzeFeld("fragen.baustrom", v)} optionen={ja} />
      <Auswahl label="Gerüst / Hebebühne nötig?" wert={f.geruest} onChange={(v) => setzeFeld("fragen.geruest", v)} optionen={ja} />
      <div className="grid grid-cols-2 gap-3">
        <Feld label="Ausführung von" typ="date" wert={f.von} onChange={(v) => setzeFeld("fragen.von", v)} />
        <Feld label="bis" typ="date" wert={f.bis} onChange={(v) => setzeFeld("fragen.bis", v)} />
      </div>
      <Feld label="Zugang / Schlüssel" wert={f.zugang} onChange={(v) => setzeFeld("fragen.zugang", v)} />
      <Feld label="Zu beachten" mehrzeilig wert={f.hinweise} onChange={(v) => setzeFeld("fragen.hinweise", v)} />
    </div>
  );
}

/* ---------------------------- Abschluss --------------------------- */

function textErzeugen(a) {
  const art = ARTEN.find((x) => x.id === a.art)?.label || a.art;
  const z = [];
  z.push("BAUSTELLENAUFNAHME " + a.id + " – " + art);
  z.push(new Date(a.angelegt).toLocaleString("de-DE"));
  z.push("");
  z.push("Kunde: " + a.objekt.kunde);
  z.push("Adresse: " + a.objekt.adresse);
  z.push("Vor Ort: " + a.objekt.ansprech + "  " + a.objekt.telefon);
  z.push("");
  z.push("MATERIAL / BESTELLLISTE");
  a.material.forEach((m) => z.push("  " + m.menge + " " + m.einheit + "  " + m.text));
  if (!a.material.length) z.push("  (nichts erfasst)");
  z.push("");
  if (a.kabel.length || a.kanaele.length) {
    z.push("LEITUNGSWEGE (Längen inkl. " + (a.zuschlag || "0") + " % Zuschlag)");
    a.kabel.forEach((k) => {
      const v = VERLEGUNG.find((x) => x.id === k.verlegung);
      z.push("  " + k.bez + (k.meter ? " – " + k.meter + " m" : "") + (v ? " – " + v.label : "") + " – " + k.punkte.length + " Punkte");
    });
    a.kanaele.forEach((k) =>
      z.push("  " + (k.art === "rohr" ? "Rohr " : "Kabelkanal ") + k.groesse + (k.meter ? " – " + k.meter + " m" : ""))
    );
    z.push("");
  }
  if (a.schrank.felder.some((f) => f.gruppen.length) || a.schrank.module.length || a.schrank.notiz) {
    z.push(
      "ZÄHLERSCHRANK / VERTEILER – " +
        a.schrank.felder.length * FELD_MM +
        " x " +
        a.schrank.bauhoehe +
        " mm, " +
        a.schrank.felder.length +
        " Felder à 250 mm"
    );
    a.schrank.felder.forEach((f, fi) => {
      if (!f.gruppen.length) return;
      z.push("  Feld " + (fi + 1) + " von unten:");
      let unten = 0;
      f.gruppen.forEach((g, gi) => {
        const bg = BAUGRUPPEN.find((b) => b.id === g.id);
        z.push("    " + unten + " bis " + (unten + bg.re * RE_MM) + " mm: " + bg.label);
        const mods = a.schrank.module
          .filter((m) => m.feld === fi && m.gruppe === gi)
          .sort((x, y) => x.te - y.te);
        mods.forEach((m) => {
          const ge = GERAETE.find((x) => x.id === m.kind);
          z.push("        TE " + (m.te + 1) + ": " + (ge ? ge.label : m.kind) + (m.beschriftung ? " – " + m.beschriftung : ""));
        });
        unten += bg.re * RE_MM;
      });
    });
    if ((a.schrank.bestandModule || []).length) {
      z.push("  Bestand laut Foto:");
      a.schrank.bestandModule.forEach((m) => {
        const ge = GERAETE.find((x) => x.id === m.kind);
        z.push("    Reihe " + (m.schiene + 1) + ": " + (ge ? ge.label : m.kind) + (m.beschriftung ? " – " + m.beschriftung : ""));
      });
    }
    if (a.schrank.notiz) {
      z.push("  Anleitung für den Monteur:");
      a.schrank.notiz.split("\n").forEach((l) => z.push("    " + l));
    }
    z.push("");
  }
  z.push("FOTOPUNKTE UND STELLEN");
  a.zonen.forEach((zo, i) => z.push("  " + (i + 1) + ". " + zo.name + ": " + (zo.notiz || "-") + " [" + zo.fotos.length + " Foto(s)]"));
  z.push("");
  z.push("KLÄRUNG");
  z.push("  Zählerantrag: " + a.fragen.zaehlerantrag);
  z.push("  Netzbetreiber: " + a.fragen.netzbetreiber);
  z.push("  Zählernummer: " + a.fragen.zaehlernummer);
  z.push("  Zählerschrank tauschen: " + a.fragen.schrankTausch);
  z.push("  Potentialausgleich: " + a.fragen.potentialausgleich);
  z.push("  Baustrom: " + a.fragen.baustrom);
  z.push("  Gerüst: " + a.fragen.geruest);
  z.push("  Ausführung: " + a.fragen.von + " bis " + a.fragen.bis);
  z.push("  Zugang: " + a.fragen.zugang);
  z.push("  Zu beachten: " + a.fragen.hinweise);
  return z.join("\n");
}

function Abschluss({ aufnahme, speichern }) {
  const text = textErzeugen(aufnahme);
  const [kopiert, setKopiert] = useState(false);

  const download = (inhalt, name, typ) => {
    const b = new Blob([inhalt], { type: typ });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = name;
    a.click();
  };

  return (
    <div className="space-y-4">
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-neutral-300 bg-white p-4 text-sm">{text}</pre>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setKopiert(true);
            } catch (e) {
              setKopiert(false);
            }
          }}
          className="rounded-lg bg-neutral-900 px-4 py-3 font-semibold text-white"
        >
          {kopiert ? "Kopiert" : "Kopieren"}
        </button>
        <button
          onClick={() => download(text, aufnahme.id + "_aufnahme.txt", "text/plain")}
          className="rounded-lg border border-neutral-300 px-4 py-3 font-medium"
        >
          Als Text sichern
        </button>
      </div>
      <button
        onClick={() =>
          download(
            JSON.stringify(
              { ...aufnahme, schrank: { ...aufnahme.schrank, foto: null }, zonen: aufnahme.zonen.map((z) => ({ ...z, fotos: [] })) },
              null,
              2
            ),
            aufnahme.id + ".json",
            "application/json"
          )
        }
        className="w-full rounded-lg border border-neutral-300 px-4 py-3 font-medium"
      >
        Als JSON für Gluehbirne sichern
      </button>
      <button onClick={speichern} className="w-full rounded-lg border border-neutral-300 px-4 py-3 font-medium">
        Aufnahme speichern
      </button>
    </div>
  );
}
