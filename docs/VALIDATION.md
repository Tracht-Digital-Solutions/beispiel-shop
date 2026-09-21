# Prüfung und Abnahme

Stand: 20. September 2026. Produktionsbuild unter Windows mit Node.js 24, Chromium 153, Firefox 155 und WebKit 26.6. GitHub Actions prüft zusätzlich unter Ubuntu; aktuelle Ergebnisse stehen unter [Actions](https://github.com/Tracht-Digital-Solutions/beispiel-shop/actions).

## Ergebnis

| Prüfung | Ergebnis |
| --- | --- |
| Astro / TypeScript | 56 Dateien, 0 Fehler, 0 Warnungen |
| Vitest | 34 Tests bestanden |
| Playwright | 172 bestanden, 4 bewusst übersprungen |
| Statischer Build | 46 Seiten |
| Formatprüfung | Bestanden |
| axe auf geprüften Seiten und Dialogen | Keine erkannten Verstöße in den ausgewählten WCAG-A-/AA-Regeln |

Vier Browserprojekte prüfen Desktop-Chromium, Pixel-7-Emulation, Firefox und WebKit. Der Touch-Test läuft nur im mobilen Projekt (drei übersprungene Desktop-Fälle); die zusätzliche 320-/834-Pixel-Prüfung wird im mobilen Projekt nicht doppelt ausgeführt. Emulation ersetzt keine Prüfung auf physischen Geräten.

## Funktionen und Bewegung

- Deutscher und englischer Kaufablauf, Größenwahl, Mengen, Neuladen, Versandgrenzen, Formularvalidierung, Beispieldaten und simulierte Bestätigung. Keine Bestell-POSTs oder dauerhaft gespeicherten Adressen.
- Kombinierte Suche und Filter, URL-Wiederherstellung, Sortierung mit erhaltenen Produktknoten, leere Treffer, nicht verfügbare Varianten und Lagergrenzen.
- Beschädigter oder blockierter Browserspeicher: Sitzungsspeicher als Ersatz; bei vollständig gesperrtem Speicher bleibt der Warenkorb bei interner Navigation im Arbeitsspeicher, geht beim vollständigen Neuladen verloren. Der Hinweis erklärt dies.
- Volle Slides für Seiten- und Sprachwechsel, Kategorie, Suchergebnisse, Tags, Dropdowns, Warenkorb und Artikel, Galerie, Akkordeons und Checkout. Deckkraft bleibt konstant. Schnelle Richtungswechsel und erneutes Hinzufügen während eines Ausgangs sind geprüft.
- Dialoge behalten Fokusbegrenzung und Hintergrundsperre bis zum Ende des Ausgangs. Escape, Außenklick, Fokusrückgabe und Tastaturbedienung werden geprüft. Dropdowns im Filterdialog bleiben innerhalb der modalen Oberfläche.
- Bildzoom und Mauslupe, Pfeiltasten und Touchgesten; Bilddialog und Größentabelle passen auch bei 320 × 568 und 667 × 375 Pixeln in den sichtbaren Bereich.
- Wiederholte Navigation, Verlauf und Sprachwechsel erhalten den Warenkorb und erzeugen keine doppelten Inseln oder JavaScript-Fehler. Noch nicht aktivierte Bedienung bleibt deaktiviert.
- Scroll-Einstiege laufen einmal. Tastaturfokus legt Inhalte sofort frei. Bewegungsreduktion wirkt auch während laufender Übergänge; ohne JavaScript bleiben statische Inhalte sichtbar.

Details, Zeitwerte und Primärquellen: [MOTION.md](MOTION.md). Automatisierte Prüfungen sind keine vollständige WCAG-Konformitätszertifizierung.

Aktuelle Aufnahmen: [Desktop](screenshots/desktop.png), [Mobil](screenshots/mobile.png), [Tablet](screenshots/tablet.png), [Produkt](screenshots/product.png). Vollständige Seitenaufnahmen liegen im selben Verzeichnis.

## Reproduzierbare Labormessungen

Lighthouse 13.4.1, mobiles Standardprofil, 412 × 823 Pixel, simuliertes Netz (150 ms RTT, 1.638,4 kbit/s) und vierfach verlangsamte CPU. Vorher und nachher am 20. September 2026 auf demselben Rechner; einzelne Messungen unterliegen Schwankungen.

| Seite | Performance vorher → nachher | LCP vorher → nachher | CLS nachher | TBT nachher |
| --- | --- | --- | --- | --- |
| Startseite | 97 → 96 | 2,43 → 2,48 s | 0 | 0 ms |
| Produktseite | 95 → 94 | 2,79 → 2,78 s | 0,00055 | 0 ms |

Accessibility und Best Practices erreichen jeweils 100/100. Der Produkt-LCP bleibt über der Orientierung von 2,5 Sekunden. Die bewusst gesetzte `noindex`-Anweisung begrenzt den SEO-Wert auf 63. Die neue Animationsbibliothek und zugängliche Auswahlmenüs benötigen zusätzliches JavaScript; LazyMotion und Motion Mini begrenzen den Umfang.

Rohdaten: [Vorher](performance/before-motion.json), [Nachher](performance/summary.json), [Startseite](performance/home.json), [Produktseite](performance/product.json).

Ein separater, ungedrosselter Chromium-Lauf bei 1440 × 960 Pixeln erfasst jeweils eine Sekunde für Suche, Zurücksetzen, Kategorie- und Sprachwechsel: Median 16,7 ms, p95 höchstens 16,8 ms, kein Intervall über 50 ms. [Messdaten](performance/motion-frames.json). Das Skript erzeugt außerdem lokal einen Playwright-Trace unter `.cache/motion-performance-trace.zip`. Die rAF-Abstände sind eine begrenzte Laborstichprobe und kein Beleg für garantierte Bildraten auf anderen Geräten. Es liegen keine echten Nutzungsdaten oder INP-Messungen vor.

```sh
npm ci
npx playwright install chromium firefox webkit
npm run type-check
npm run test:run
npm run build
npm run test:e2e
npm run format:check
npm run preview
# In einem zweiten Terminal:
npm run audit:performance
node scripts/audit-motion.mjs
npm run screenshots
```

Unter Linux Browser mit `--with-deps` installieren. Die Messskripte verwenden Port 4321; `PREVIEW_URL` erlaubt eine andere Produktionsvorschau. Während Browserprüfungen oder Messungen nicht erneut bauen.

## Veröffentlichung

Push nach `main` startet die vollständige Prüfung und veröffentlicht anschließend statische Dateien nach `dev`. Der ausdrücklich beauftragte manuelle Release baut und prüft denselben Quellstand erneut, veröffentlicht nach `release` und benachrichtigt den konfigurierten Deployment-Webhook. `build-info.json` ordnet die Dateien dem Quellcommit und Workflow zu. Der Shop bleibt eine Kaufdemo. Workflow-Ergebnisse und die separat zu prüfende Webhook-Antwort dokumentieren den Veröffentlichungserfolg; eine erfolgreiche Benachrichtigung allein bestätigt noch nicht den Zustand des externen Hosts.
