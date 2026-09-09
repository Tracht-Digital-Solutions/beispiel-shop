# Prüfung und Abnahme

Stand der Funktions- und Browserprüfungen: 9. September 2026. Geprüft wurde der statische Produktionsbuild, lokal unter Windows mit Node.js 24.16.0 und Chromium 153. Screenshots und Performance-Messungen stammen vom 8. September 2026. Die GitHub-Prüfstrecke verwendet zusätzlich Ubuntu und Node.js 24; ihr aktueller Status ist unter [GitHub Actions](https://github.com/Tracht-Digital-Solutions/beispiel-shop/actions) einsehbar.

## Ergebnis

| Prüfung                                   | Ergebnis                                                       |
| ----------------------------------------- | -------------------------------------------------------------- |
| Astro / TypeScript                        | 0 Fehler, 0 Warnungen                                          |
| Vitest                                    | 34 Tests bestanden                                             |
| Playwright Desktop + Mobil                | 37 Tests bestanden, 1 bewusst übersprungene doppelte Prüfung   |
| Statischer Build                          | 46 Seiten erfolgreich erzeugt                                  |
| Formatprüfung                             | Bestanden                                                      |
| axe auf den geprüften Seiten und Dialogen | Keine erkannten Verstöße in den ausgewählten WCAG-A-/AA-Regeln |

Die 320- und 834-Pixel-Prüfung wird einmal im Desktop-Testprojekt ausgeführt; derselbe Fall ist im mobilen Projekt zur Vermeidung einer doppelten Ausführung übersprungen. Die Browserprüfungen schließen verzögert geladene interaktive Bereiche mit vorhandenem Warenkorb ein und prüfen dabei auf JavaScript- und Hydrationfehler.

Ein zusätzlicher Test hält das Laden der Produktbedienung gezielt an: Bildzoom, Bildwechsel, Farbe, Größe und Größenhilfe bleiben währenddessen deaktiviert. Nach dem Laden funktionieren Bildzoom und Größenauswahl unmittelbar; ein früher Klick kann nicht mehr vor dem Aktivieren der Bedienung verloren gehen.

## Funktionsumfang der Prüfung

- Vollständiger Kaufablauf auf Deutsch und Englisch: verfügbare Größe wählen, Warenkorb öffnen, Mengen ändern, Seite neu laden, Adresse validieren, Beispieldaten einsetzen, Versand prüfen und Demo-Bestätigung anzeigen.
- Sprachwechsel auf derselben Produktseite mit erhaltenem Warenkorb; Entfernen des letzten Artikels und leerer Checkout nach Abschluss.
- Kombinierte Filter, Sortierung, URL-Wiederherstellung und leere Suchergebnisse. Produkt- und Variantenkennungen, lokalisierte Produktdaten und alle ausgelieferten Bildpfade werden geprüft.
- Nicht verfügbare Größen, maximale Bestände, fehlerhafte gespeicherte Werte, doppelte Varianten, Versand unter und genau ab 100 Euro.
- Blockierter dauerhafter Speicher und erschöpftes Speicherkontingent: Der Sitzungsspeicher hält die Auswahl bis zum Schließen des Tabs. Auch die Rückkehr zu funktionierendem dauerhaftem Speicher wird geprüft.
- Sind beide Speicher blockiert, bleiben Warenkorb und Mengenänderungen auf der aktuellen Seite nutzbar. Ein sichtbarer Hinweis erklärt, dass die Auswahl bei Navigation oder Neuladen verloren geht. Dieser Sonderfall wurde zusätzlich im Browser nachgestellt.
- Es entstehen im getesteten Kaufablauf keine POST-Anfragen. Adressen werden nicht im Browserspeicher abgelegt und bei Abschluss verworfen.

## Darstellung und Bedienung

Desktop mit 1440 Pixeln Breite, Pixel-7-Emulation, Tablet mit 834 Pixeln und kleines Smartphone mit 320 Pixeln wurden geprüft. Repräsentative Seiten zeigen keinen horizontalen Überlauf. Die [Desktopansicht](screenshots/desktop.png), [Mobilansicht](screenshots/mobile.png), [Tabletansicht](screenshots/tablet.png) und [Produktseite](screenshots/product.png) wurden visuell kontrolliert. Vollständige Seitenaufnahmen liegen im selben Verzeichnis.

Die automatisierten axe-Prüfungen decken Startseite, Katalog, Produktseite, Lookbook, Warenkorb-Dialog, Adresse, Bestellprüfung sowie mobile Navigation und Filter ab. Tastaturprüfungen umfassen Escape, Fokusrückgabe und den Warenkorb am maximalen Bestand. Tab und Umschalt+Tab erreichen bei geöffnetem Warenkorb keine Hintergrund-Bedienelemente. Sichtbare Fokusrahmen bleiben erhalten.

Die vergrößerten Produkt- und Lookbookbilder sowie die Größentabelle werden zusätzlich bei 1440 × 900, 320 × 568 und 667 × 375 Pixeln geprüft. Die Dialoge bleiben zentriert und innerhalb des sichtbaren Bereichs, Bilder behalten ihr Seitenverhältnis. Escape, Schließen-Button und Hintergrundklick schließen mit Fokusrückgabe; Klicks auf freien Innenabstand der Größentabelle lassen sie geöffnet. Die Zentrierung bleibt nach Scrollen erhalten. Die deutsche Bildansicht wurde am 9. September in diesen drei Formaten zusätzlich visuell kontrolliert.

Bei aktivierter Einstellung für reduzierte Bewegung werden weiches Scrollen und Bildbewegungen deaktiviert. Diese Einstellung wurde auf Desktop und Mobilgerät nachgestellt. Automatische Prüfungen und diese Bedienkontrollen sind keine vollständige WCAG-Konformitätszertifizierung; eine Prüfung mit realen assistiven Technologien bleibt eine separate Abnahme.

## Reproduzierbare Labormessung

Die Rohberichte liegen unter [performance/home.json](performance/home.json), [performance/product.json](performance/product.json) und [performance/summary.json](performance/summary.json). Die Messung verwendet Lighthouse 13.4.1 mit seinem mobilen Standardprofil: 412 × 823 Pixel, simuliertes Netz mit 150 ms RTT und 1.638,4 kbit/s sowie vierfach verlangsamter CPU.

Abschließender Lauf am 8. September 2026 um 11:40 UTC:

| Seite                                  | Performance | Accessibility | Best Practices | LCP    | CLS   | TBT  |
| -------------------------------------- | ----------- | ------------- | -------------- | ------ | ----- | ---- |
| Startseite `/de/`                      | 97/100      | 100/100       | 100/100        | 2,26 s | 0,057 | 0 ms |
| Produkt `/en/product/concrete-hoodie/` | 95/100      | 100/100       | 100/100        | 2,78 s | 0,000 | 0 ms |

Der Produkt-LCP liegt in diesem einzelnen Lauf über der Orientierung von 2,5 Sekunden. Der Bericht nennt unter anderem Bildauslieferung und renderblockierende Ressourcen als weitere Optimierungsmöglichkeiten. Messungen schwanken mit dem Rechnerzustand; diese Werte sind keine garantierten Ladezeiten.

Es handelt sich um einzelne lokale Navigationsmessungen, nicht um echte Besucherdaten oder Messungen des späteren Hosts. TBT ist eine Laborkennzahl; sie ersetzt keinen INP-Wert aus echten Interaktionen. Server-, CDN- und Netzeigenschaften des späteren Deployments müssen dort erneut geprüft werden.

Die Demo ist bewusst mit `noindex,follow` versehen. Der dadurch reduzierte SEO-Wert ist im vollständigen Bericht sichtbar. Sprachabhängige Titel, Beschreibungen und Vorschaubilder sind vorhanden; Canonical- und Sprachalternativen erhalten mit `PUBLIC_SITE_URL` die endgültige Domain.

```sh
npm ci
npx playwright install chromium
npm run type-check
npm run test:run
npm run build
npm run test:e2e
npm run preview
# In einem zweiten Terminal:
npm run screenshots
npm run audit:performance
```

Auf Linux kann die Browserinstallation mit `npx playwright install --with-deps chromium` ergänzt werden. Die Skripte verwenden standardmäßig `http://127.0.0.1:4321`; `PREVIEW_URL` erlaubt eine andere Produktionsvorschau. Die vollständigen Einstellungen und verwendeten Browser-Versionen stehen auch in den Rohberichten.

## Veröffentlichung

Der Push nach `main` startet den geprüften Build für den Artefaktbranch `dev`. Dort ordnet `build-info.json` die statischen Dateien dem Quellcommit und dem Workflow-Lauf zu. Der manuelle Release-Workflow wird bei dieser Übergabe nicht ausgelöst. Domain, Hosting und eventuelle Webhook-Konfiguration sind in [INSTALL.md](../INSTALL.md) beschrieben.
