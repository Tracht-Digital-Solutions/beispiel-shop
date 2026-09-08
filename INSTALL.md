# Installation und Veröffentlichung

## Lokale Vorschau

1. Repository klonen und in das Projektverzeichnis wechseln.
2. Node.js 24 installieren; `node --version` sollte `v24.x` ausgeben.
3. `npm ci` ausführen.
4. Mit `npm run dev` starten und `http://localhost:4321/de/` öffnen.

Ein Produktionsbuild entsteht mit `npm run build`. `npm run preview` zeigt diesen Build lokal an. Auf dem Zielserver werden nur die erzeugten Dateien benötigt, keine npm-Installation, Datenbank, API-Schlüssel oder Node-Anwendung.

## Domain und Pfade

Der Shop wird im **Wurzelverzeichnis einer Domain oder Subdomain** betrieben. Deutsch liegt unter `/de/`, Englisch unter `/en/`; `/` führt nach `/de/`. Der Webserver muss Verzeichnisse über ihre jeweilige `index.html` ausliefern können. Alle Unterseiten werden als statische Dateien gebaut; eine SPA-Umschreibung auf die Startseite ist nicht erforderlich.

`PUBLIC_SITE_URL` ist eine optionale, öffentliche Build-Variable für die endgültige Origin, beispielsweise `https://shop.example.com`. Ohne diese Variable funktioniert die lokale Demo weiterhin. Die Domain ist vor dem Build zu setzen; nach einer Änderung ist ein neuer Build erforderlich. Eine Bereitstellung unter einem zusätzlichen Pfad wie `/beispiel-shop/` wird nicht unterstützt; `PUBLIC_BASE_PATH` ist daher keine Projektvariable.

PowerShell:

```powershell
$env:PUBLIC_SITE_URL = 'https://shop.example.com'
npm run build
```

macOS/Linux:

```sh
PUBLIC_SITE_URL=https://shop.example.com npm run build
```

`.env.example` dokumentiert den Variablennamen und enthält keine Zugangsdaten. Bei GitHub Actions wird die Domain über die Repository-Variable **PUBLIC_SITE_URL** unter **Settings → Secrets and variables → Actions → Variables** gesetzt. Sie muss keine Secret-Variable sein.

## GitHub Actions

Die vier Workflow-Dateien haben jeweils eine Aufgabe:

| Datei                           | Aufgabe                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `.github/workflows/_build.yml`  | Gemeinsame Prüfung, statischer Build, Browserprüfung, Artefakte und optionale Veröffentlichung |
| `.github/workflows/ci.yml`      | PR-Prüfung für `main`, nur Leserechte, keine übergebenen Secrets                               |
| `.github/workflows/dev.yml`     | Push nach `main` oder manueller Lauf auf `main`: Build nach `dev`                              |
| `.github/workflows/release.yml` | Ausschließlich manueller Lauf auf `main`: Build nach `release`, danach optionaler Webhook      |

Die gemeinsame Prüfstrecke lautet: `npm ci` → `npm run type-check` → `npm run test:run` → `npm run build` → Build-Metadaten → Chromium installieren → `npm run test:e2e`. Erst nach erfolgreichen Prüfungen wird ein Artefaktbranch aktualisiert.

Die Runner verwenden Ubuntu und Node 24. Die Action-Versionen sind über geprüfte Commit-SHAs fixiert. Der Checkout speichert keine Git-Zugangsdaten. Der automatisch erzeugte `GITHUB_TOKEN` genügt: CI erhält `contents: read`, die publizierenden Workflows `contents: write`. Es sind weder ein persönlicher Token noch `NPM_TOKEN` oder private Pakete erforderlich. Organisationsregeln müssen GitHub Actions das Schreiben auf `dev` und `release` erlauben.

`dev` und `release` sind verwaiste Branches mit ausschließlich dem neuesten Build. Änderungen direkt auf diesen Branches werden beim nächsten Lauf ersetzt. Änderungen am Shop gehören deshalb nach `main`.

Jeder erfolgreiche Lauf lädt `dist/` als `shop-<kanal>-<laufnummer>` hoch; Browserberichte werden, sofern vorhanden, separat gespeichert. Die Aufbewahrung beträgt 14 Tage. In jedem CI-Build liegen außerdem:

- `build-info.json`: Kanal, Quellcommit, Zeitpunkt und Link zum Workflow-Lauf; `demo` bleibt `true`.
- `.nojekyll`: verhindert eine nachträgliche Jekyll-Verarbeitung der statischen Dateien.

Lokal können diese Dateien nach dem Build mit `node scripts/stamp-build.mjs` ergänzt werden.

## Einen Release bereitstellen

1. Den gewünschten Quellstand auf `main` prüfen und dort committen.
2. Unter **Actions → Release → release branch (manual) → Run workflow** den Branch **main** auswählen.
3. Nach erfolgreichem Lauf den Branch `release` auf dem Webserver auschecken oder den heruntergeladenen statischen Build hochladen.
4. Das Wurzelverzeichnis des gebauten Artefakts als Dokumentenstamm verwenden und `/de/`, `/en/` sowie eine Produkt-Unterseite direkt aufrufen.

Der Workflow baut den gewählten `main`-Stand neu. Ein manueller Aufruf von einem anderen Quellbranch bricht vor der Veröffentlichung ab. Der `dev`-Workflow benachrichtigt keinen Deployment-Dienst; Deployment und DNS werden durch dieses Projekt nicht eingerichtet.

## Optionaler Deployment-Webhook

Wer nach einem Release einen vorhandenen Deployment-Dienst benachrichtigen möchte, trägt dessen URL als Repository-Secret **DEPLOY_WEBHOOK_URL** ein. Der Release-Workflow sendet nach erfolgreicher Branch-Veröffentlichung einen POST an diese URL und folgt Weiterleitungen. Die URL wird nicht in den Logs ausgegeben.

Ohne Secret wird die Benachrichtigung übersprungen. Bei einem fehlgeschlagenen Webhook erscheint eine Warnung; der bereits veröffentlichte Release bleibt bestehen und der Lauf wird dadurch nicht nachträglich als fehlgeschlagen markiert. Der Betreiber kann den Release anschließend manuell auf dem Host übernehmen. `RELEASE_WEBHOOK_URL` aus älteren Demo-Repositories wird hier nicht verwendet.

## Demodaten und Anpassungen

Die Website verwendet ausschließlich Beispieldaten. Der Warenkorb wird lokal im Browser gespeichert. Ist dauerhafter Speicher blockiert, wird nach Möglichkeit der Sitzungsspeicher dieses Tabs verwendet. Sind beide Speicher blockiert, funktioniert die Auswahl im Arbeitsspeicher der aktuellen Seite; ein sichtbarer Hinweis erklärt den Verlust beim Seitenwechsel. Checkout und Kaufbestätigung sind simuliert; es gibt keine Verbindung zu einem Zahlungsdienst, Warenwirtschaftssystem oder Bestell-Backend. Das gilt für beide Sprachen und alle Buildkanäle.

Ein echter Shop benötigt eine gesonderte Implementierung von Katalog-/Bestell-Backend, Zahlungen, Versand und den passenden Betreiberinformationen. Ein Release-Schalter aktiviert diese Funktionen nicht.

## Prüfung vor einer Kundenpräsentation

Die Befehle und Szenarien definieren die Prüfschritte; sie sind keine Behauptung über einen noch nicht ausgeführten Lauf.

- Typprüfung, Unit-Tests, Produktionsbuild und Playwright-Browsertests ausführen.
- Beide Sprachversionen und direkte Unterseiten auf dem tatsächlichen Host prüfen.
- Auf Mobilgerät und Desktop Katalog, Produktauswahl, Warenkorb und simulierten Checkout durchgehen.
- Navigation und Dialoge per Tastatur bedienen; leere Treffer, nicht verfügbare Größen und einen leeren Warenkorb prüfen.
- Bilder, Schriften und `build-info.json` vom Host abrufen; die Veröffentlichung anhand des Quellcommits zuordnen.
