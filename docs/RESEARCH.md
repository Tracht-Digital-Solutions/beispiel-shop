# Recherche und Gestaltungsentscheidungen

Stand: 7. September 2026. Ziel ist eine überzeugende Kunden-Arbeitsprobe für einen fiktiven Urban-Streetwear-Shop auf Deutsch und Englisch. Die Entscheidungen verbinden eine eigenständige Marke mit verständlichen Einkaufsabläufen.

## Gestaltung

BLOCK/01 verwendet große, kondensierte Überschriften, eine gut lesbare Fließtextschrift, ruhige Neutraltöne und Signalorange als Akzent. Große Produkt- und Lookbilder tragen den Auftritt. Die Bildsprache und die geometrische Gestaltung passen zur Streetwear-Ausrichtung; diese konkrete Ästhetik ist eine Gestaltungsentscheidung, keine Vorgabe eines Webstandards.

Katalog, Produktauswahl und Kaufablauf erhalten klare Hierarchien. Größen, Verfügbarkeit, Preise und Warenkorb-Summen werden direkt an den relevanten Stellen gezeigt. Auf kleinen Bildschirmen bleiben Navigation und Kaufaktionen erreichbar. Animationen unterstützen Rückmeldungen und Zustandswechsel; reduzierte Bewegung wird berücksichtigt.

Die [Untersuchungen des Baymard Institute zu Produktlisten und Filtern](https://baymard.com/research/ecommerce-product-lists) bilden die Grundlage für die Katalogführung: Besucher müssen Angebote vergleichen und die Liste auf passende Produkte eingrenzen können. Die [Filter-Empfehlungen von Baymard](https://baymard.com/learn/ecommerce-filter-ui) unterstützen sichtbare Filterzustände und leicht korrigierbare Auswahlentscheidungen. Der Beispielkatalog bleibt mit 16 Produkten bewusst überschaubar, stellt diese Abläufe aber vollständig dar.

## Zugänglichkeit und Ladeverhalten

Als technische Leitlinie dient [WCAG 2.2, W3C Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/): semantische Bedienelemente, sichtbarer Tastaturfokus, beschriftete Eingaben, Textalternativen, verständliche Fehlermeldungen und ausreichende Kontraste. Automatisierte Prüfungen ergänzen die manuelle Bedienprüfung; ein automatischer Lauf allein ist keine vollständige Konformitätsbewertung.

Die [Core Web Vitals von web.dev](https://web.dev/articles/vitals) begründen die Priorität für früh sichtbare Hauptinhalte, stabile Bildflächen und reaktionsfähige Interaktionen. Statisches HTML, passende Bildformate und sparsam aktivierte Interaktivität sind die Umsetzungsmittel. Konkrete Messwerte werden erst nach einer Messung angegeben; lokale Prüfungen ersetzen keine Daten echter Besucher.

## Technische Auswahl

[Astros Islands-Architektur](https://docs.astro.build/en/concepts/islands/) erlaubt statische Seiten mit gezielt interaktiven Bereichen. Das passt zu einem Shop mit festem Beispielkatalog: Inhalte können vollständig vorgerendert werden, während React Suche, Filter, Auswahl und Warenkorb übernimmt. Für diesen Demoumfang sind eine dauerhafte Server-Laufzeit und ein Commerce-Backend nicht erforderlich.

Das Projekt hält die deutschen und englischen Oberflächen unter eigenen Routen. Ein Release bleibt eine Demo; es werden keine echten Bestellungen oder Zahlungen ausgelöst. Diese Grenze ist Teil der Produktentscheidung und gilt unabhängig vom Buildkanal.

## Pipelines der Organisation

Die aktuellen Remote-Workflows von [tds-blog-frontend](https://github.com/Tracht-Digital-Solutions/tds-blog-frontend/tree/main/.github/workflows) und [tds-landingpage-frontend](https://github.com/Tracht-Digital-Solutions/tds-landingpage-frontend/tree/main/.github/workflows) wurden am 7. September 2026 gelesen. Ihr gemeinsames Muster wird übernommen: wiederverwendbarer Build, PR-Prüfung, `main` → `dev` und manuell ausgelöster Release mit optionalem `DEPLOY_WEBHOOK_URL`.

Der Shop veröffentlicht statische Dateien aus `dist/`. Das SSR-/Passenger-Paket dieser produktiven Frontends ist an deren Laufzeitbedarf gebunden und wird hier nicht benötigt. Die älteren Demo-Repositories verwenden noch eine andere Zweistufen-Pipeline mit `RELEASE_WEBHOOK_URL`; ihr statischer Build dient als Referenz für die einfache Auslieferung, nicht für die neue Workflow-Struktur.

Der Shop verwendet einen Lockfile und `npm ci`, öffentliche Abhängigkeiten und den kurzlebigen `GITHUB_TOKEN`. Damit braucht die Kunden-Arbeitsprobe keinen privaten npm-Zugang. Die Architektur der vorhandenen Pipelines wird übernommen, ohne deren projektspezifische Registry- und SSR-Anforderungen einzubauen.

Referenzen der verwendeten Actions: [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node](https://github.com/actions/setup-node/releases/tag/v7.0.0), [upload-artifact](https://github.com/actions/upload-artifact/releases/tag/v7.0.1), [actions-gh-pages](https://github.com/peaceiris/actions-gh-pages/releases/tag/v4.1.0). Die Workflows pinnen die zugehörigen verifizierten Commit-SHAs.

Bildquellen und Nutzungsinformationen stehen separat in [IMAGE-SOURCES.md](IMAGE-SOURCES.md).
