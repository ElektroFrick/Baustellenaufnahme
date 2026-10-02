# Baustellenaufnahme

Vor-Ort-Erfassung für Elektro Frick: Auftragsart wählen, Grundriss und
Leitungswege zeichnen, Fotopunkte setzen, Schrank planen, Material erfassen
und daraus Bestellliste und Protokoll erzeugen.

Läuft ohne Build direkt im Browser und gibt es zusätzlich als Android-App.

## Android-App aufs Handy

Bei jedem Push auf `main` baut GitHub automatisch eine neue APK
(Reiter **Actions**, dauert ca. 5 Minuten) und legt sie unter **Releases** ab.

1. Auf dem Handy bei GitHub anmelden und öffnen:
   https://github.com/ElektroFrick/Baustellenaufnahme/releases/latest
2. `Baustellenaufnahme.apk` antippen und herunterladen.
3. Installieren. Beim ersten Mal fragt Android, ob der Browser Apps
   installieren darf – einmal erlauben.
4. Updates genauso: neue APK drüberinstallieren, die Aufnahmen bleiben erhalten.

In der App läuft alles offline. Dateien (Text, JSON, PNG) gehen über das
Teilen-Menü raus, z. B. per Mail, WhatsApp oder in die Dateien-App.

Lokal bauen (braucht Node und Android Studio): `npm install`,
`npm run android`, dann den Ordner `android/` in Android Studio öffnen.

**Wichtig:** `android/signing/` enthält den Signaturschlüssel. Ohne ihn lassen
sich keine Updates mehr installieren – nicht löschen, und das Repo nicht
öffentlich machen, solange der Schlüssel darin liegt.

## Inhalt

| Datei | Zweck |
|---|---|
| `index.html` | die komplette App |
| `manifest.json` | damit sie sich auf dem Handy wie eine App installieren lässt |
| `baustellenaufnahme.jsx` | Quelldatei zum Weiterarbeiten (Änderungen auch in `index.html` übernehmen) |
| `android/`, `capacitor.config.json` | Android-App (Capacitor) |
| `scripts/build-www.mjs` | baut aus `index.html` die Offline-Fassung für die App |
| `scripts/icons.mjs`, `icons/` | App-Icon und Startbildschirm |
| `.github/workflows/android.yml` | baut die APK automatisch |

## Veröffentlichen über GitHub Pages

1. Dateien ins Repo laden (Web-Oberfläche: **Add file → Upload files**).
2. Im Repo auf **Settings → Pages**.
3. Unter *Build and deployment* bei *Source* **Deploy from a branch** wählen,
   Branch `main`, Ordner `/ (root)`, speichern.
4. Nach etwa einer Minute ist die App erreichbar unter:

```
https://elektrofrick.github.io/Baustellenaufnahme/
```

## Als App einrichten

- **Handy:** Adresse öffnen, Teilen-Menü, *Zum Startbildschirm*. Danach eigenes
  Icon, Vollbild, Kamera funktioniert.
- **PC:** Adresse in Chrome oder Edge öffnen, in der Adressleiste auf das
  Installieren-Symbol klicken.

## Stand und offene Punkte

- Aufnahmen liegen im Speicher des jeweiligen Geräts. Für den Austausch
  zwischen Büro und Baustelle fehlt noch eine gemeinsame Ablage.
- Fotos werden bewusst nicht dauerhaft gespeichert, sonst läuft der
  Gerätespeicher voll.
- Web-Version: React und Tailwind kommen beim Start aus dem Netz. Die
  Android-App bringt alles mit und startet auch ohne Empfang.
- Hutschienen-Erkennung und KI-Schätzung rufen die Claude-API ohne Schlüssel
  auf – das funktioniert nur innerhalb von Claude, nicht in Browser oder App.

## Weiter geplant

Auftrags-PDF für die Monteure mit Prüfblatt und Doku-Anleitung, danach
Abnahmeprotokoll sowie Stunden- und Materialauswertung.
