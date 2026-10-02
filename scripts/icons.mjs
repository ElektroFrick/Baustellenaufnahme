// Erzeugt aus icons/gluehbirne.svg die PNG-Icons für Web-App und Android.
// Nur nötig, wenn sich das Icon ändert: npm run icons
import { mkdirSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const HINTERGRUND = "#111827";
const svg = "icons/gluehbirne.svg";

// Glühbirne auf dunklem Quadrat; anteil = wie viel der Fläche die Birne füllt
async function icon(datei, groesse, { anteil = 0.8, rund = false, transparent = false } = {}) {
  const birne = await sharp(svg).resize(Math.round(groesse * anteil)).png().toBuffer();
  const maske = rund
    ? Buffer.from(`<svg width="${groesse}" height="${groesse}"><circle cx="${groesse / 2}" cy="${groesse / 2}" r="${groesse / 2}"/></svg>`)
    : null;
  let bild = sharp({
    create: { width: groesse, height: groesse, channels: 4, background: transparent ? "#0000" : HINTERGRUND },
  }).composite([{ input: birne, gravity: "center" }]);
  if (maske) bild = sharp(await bild.png().toBuffer()).composite([{ input: maske, blend: "dest-in" }]);
  await bild.png().toFile(datei);
}

await icon("icons/icon-192.png", 192);
await icon("icons/icon-512.png", 512);
await icon("icons/icon-maskable-512.png", 512, { anteil: 0.6 });

const res = "android/app/src/main/res";
if (existsSync(res)) {
  const dichten = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [name, f] of Object.entries(dichten)) {
    const ordner = `${res}/mipmap-${name}`;
    mkdirSync(ordner, { recursive: true });
    await icon(`${ordner}/ic_launcher.png`, 48 * f);
    await icon(`${ordner}/ic_launcher_round.png`, 48 * f, { rund: true });
    // Adaptives Icon: 108dp, sichtbarer Bereich ca. 66 %
    await icon(`${ordner}/ic_launcher_foreground.png`, 108 * f, { anteil: 0.55, transparent: true });
  }
  writeFileSync(
    `${res}/values/ic_launcher_background.xml`,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${HINTERGRUND}</color>\n</resources>\n`
  );

  // Startbildschirm: Glühbirne mittig auf dunklem Grund, Größen wie die Vorlagen
  for (const ordner of readdirSync(res).filter((o) => o.startsWith("drawable"))) {
    const datei = `${res}/${ordner}/splash.png`;
    if (!existsSync(datei)) continue;
    const { width, height } = await sharp(datei).metadata();
    const birne = await sharp(svg).resize(Math.round(Math.min(width, height) * 0.35)).png().toBuffer();
    const bild = await sharp({ create: { width, height, channels: 4, background: HINTERGRUND } })
      .composite([{ input: birne, gravity: "center" }])
      .png()
      .toBuffer();
    writeFileSync(datei, bild);
  }
}
console.log("Icons erzeugt");
