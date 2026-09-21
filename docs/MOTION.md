# Bewegungsdesign mit Motion

Stand: 20. September 2026. Alle Übergänge sind gerichtete Slides mit unveränderter Deckkraft. Keine Federn, kein Nachschwingen und keine animierten Button-Impulse.

## Gemeinsame Regeln

`src/lib/motion.ts` definiert die Kurve `[0.22, 0.7, 0.25, 1]` und die Zeitstufen: 280 ms für kleine Menüs und Hover-Inhalte, 360 ms für Inhalte, 420 ms für Dialoge und Scroll-Einstiege. Seiten fahren nach dem Laden des Ziels 240 ms hinaus und 240 ms herein. Bewegungen nutzen vollständige Element- oder Bildschirmbreiten/-höhen.

- React-Inseln verwenden `LazyMotion`, `m`, `AnimatePresence` und `layout="position"`. Äußere Elemente verantworten die Position, innere Elemente den Slide. Dadurch konkurrieren Layout- und Inhaltsbewegungen nicht um denselben Transform.
- Filter-Tags und Produktkarten bleiben für ihren Ausgang über `usePresence` erhalten. Die tatsächliche Motion-Animation gibt ihre Entfernung frei; es gibt keinen unabhängigen Entfernungstimer. Aktive Filter, Trefferzahl, URL und Warenkorbwerte ändern sich sofort.
- Bestehende Karten werden bei Sortierung beibehalten. Bei Kategorien folgt die Bewegungsrichtung der Reihenfolge der Registerkarten; Suchergebnisse fahren hinein und ausgeschlossene Produkte hinaus.
- Imperative Übergänge verwenden Motion Mini. Abbrüche übernehmen den sichtbaren Transform; abgeschlossene Animationen geben ihre Effekte wieder frei. Alte Abschlüsse dürfen keine neuen Zustände überschreiben.
- Galerie-Slides liegen auf einer separaten Ebene über den Bildtransforms für Zoom und Schwenken. Hover-Pfeile haben einen reinen Transform-Übergang; auf Touchgeräten sind sie dauerhaft sichtbar.
- Native Dialoge behalten Fokusbegrenzung, Hintergrundsperre und Inhalt bis zum Ende des Ausgangs. Escape, Schließen und zulässige Hintergrundklicks benutzen denselben Ablauf. Safari erhält explizite Button-Fokussierung zur konsistenten Fokusrückgabe.
- Base UI Select übernimmt Auswahl, Tastaturbedienung, Typeahead, Formularwert und Positionierung. Motion animiert das Popup; Portale innerhalb eines nativen Dialogs werden in diesem Dialog eingebunden. Base UI darf unsichtbare Messknoten behalten; geschlossene Popups sind verborgen und inert.
- Der Checkout schiebt Adresse, Prüfung und Bestätigung in Leserichtung; zurück geht es in Gegenrichtung. Validierung und Fokus werden nicht bis zum Animationsende verzögert. Adressen bleiben ausschließlich im Arbeitsspeicher.

## Navigation und Scrollen

Astros `ClientRouter` lädt weiterhin statische Seiten. Vor dem Austausch fährt die gesamte Seitenschale einschließlich Kopf- und Fußbereich hinaus. Danach fährt die neue Schale herein. Native Snapshot-Überblendungen sind abgeschaltet; Chromium, Firefox und WebKit erhalten dieselben Motion-Slides. Zurücknavigation und EN→DE verwenden die umgekehrte Richtung. Modifizierte Links, externe Ziele und Anker behalten ihre normalen Funktionen.

Filteränderungen erhalten Astros History-Metadaten. Der gemeinsame Warenkorb bleibt auch bei clientseitigem Sprach-/Seitenwechsel im Speicher erhalten. Sind beide Browserspeicher gesperrt, geht er erst beim vollständigen Neuladen oder Verlassen des Tabs verloren; der Hinweis beschreibt dieses Verhalten.

Inhalte unterhalb des anfänglichen Ausschnitts fahren einmal beim Erreichen des Sichtbereichs herein. Beobachtete Hüllen bleiben unbewegt, damit die Erkennung nicht durch den Slide verfälscht wird. Anfangs sichtbare Inhalte werden nicht erneut animiert. Tastaturfokus macht noch verborgene Inhalte unmittelbar sichtbar. Ohne JavaScript bleiben die statischen Inhalte sichtbar. Beobachter werden beim Seitenwechsel entfernt.

`prefers-reduced-motion` wird beim Start und bei Änderungen während einer Bewegung berücksichtigt. Dann werden Zustände ohne Slide übernommen, einschließlich bereits laufender Ausgänge.

## Quellen und Auswahl

Primärquellen, konsultiert am 20. September 2026:

- [Motion: Layout animations](https://motion.dev/docs/react-layout-animations): Positionen mit Transforms animieren, Texte und Bilder nicht durch Größenanimation verzerren.
- [Motion: AnimatePresence](https://motion.dev/docs/react-animate-presence): stabile Schlüssel, ausgehende Inhalte behalten und manuelle Presence-Steuerung bei getrennten Animationsebenen.
- [Motion: Performance](https://motion.dev/docs/performance): Transforms bevorzugen und Layout-Arbeit begrenzen. Akkordeonhöhe bleibt eine gezielte Ausnahme.
- [Motion: Bundle size](https://motion.dev/docs/react-reduce-bundle-size): `LazyMotion`/`m` für React, die kleine imperative API für DOM-Übergänge.
- [Motion: Reduced motion](https://motion.dev/docs/react-use-reduced-motion): Bewegung an die Systemeinstellung anpassen; hier zusätzlich mit laufender Media-Query-Subscription.
- [Motion: inView](https://motion.dev/docs/inview): einmalige, viewportbasierte Einstiege.
- [Base UI Select](https://base-ui.com/react/components/select): zugängliche Auswahlmenüs und manuelles Unmount nach externer Animation. Ersetzt den zuvor browserabhängigen nativen Picker.
- [Astro: View transitions](https://docs.astro.build/en/guides/view-transitions/): ClientRouter-Lebenszyklus für Laden, Austausch, Verlauf und Skripte.

Prüfergebnisse und Grenzen der Labormessungen stehen in [VALIDATION.md](VALIDATION.md).
