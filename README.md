# Baustellenaufnahme

Vor-Ort-Erfassung für Elektro Frick: Auftragsart wählen, Grundriss und
Leitungswege zeichnen, Fotopunkte setzen, Schrank planen, Material erfassen
und daraus Bestellliste und Protokoll erzeugen.

Läuft ohne Build direkt im Browser.

## Inhalt

| Datei | Zweck |
|---|---|
| `index.html` | die komplette App |
| `manifest.json` | damit sie sich auf dem Handy wie eine App installieren lässt |
| `baustellenaufnahme.jsx` | Quelldatei zum Weiterarbeiten |

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
- React und Tailwind kommen beim Start aus dem Netz. Ohne Empfang startet die
  App derzeit nicht — für echten Offlinebetrieb müssen die Bibliotheken mit
  ins Repo und ein Service Worker dazu.

## Weiter geplant

Auftrags-PDF für die Monteure mit Prüfblatt und Doku-Anleitung, danach
Abnahmeprotokoll sowie Stunden- und Materialauswertung.
