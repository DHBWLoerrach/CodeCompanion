# Quiz-Generierung: Qualitäts-Gate und Verifikation

## Zusammenfassung

Dieses Dokument beschreibt eine mögliche spätere Qualitätsabsicherung für AI-generierte Quiz-Fragen. Hintergrund ist ein konkreter Fehlertyp: Eine Single-Choice-Frage wird ausgeliefert, obwohl mehrere Antworten vertretbar oder korrekt sind, oder die Erklärung nicht sauber zur markierten richtigen Antwort passt.

Das Ziel dieses Dokuments ist ausdrücklich nicht, die beschriebene Lösung sofort umzusetzen. Es dient als Diskussionsgrundlage für einen späteren, bewussten Produkt- und Technikentscheid.

## Problem

Die aktuelle Quiz-Generierung verlässt sich im Kern auf Prompting, Strukturvalidierung und ein Single-Choice-Datenmodell. Das reicht für viele Fälle aus, verhindert aber keine semantischen Unstimmigkeiten wie:

- Mehrere objektiv oder vertretbar richtige Antworten in einer Single-Choice-Frage
- Erklärungen, die dem `correctIndex` widersprechen
- Distraktoren, die nur oberflächlich falsch wirken, in einem anderen Kontext aber gültig sind

Ein typischer Problemfall ist eine Frage nach "gültiger Syntax", bei der mehrere Antwortoptionen syntaktisch korrekt sind, obwohl das Quiz nur genau eine richtige Antwort speichern und darstellen kann.

## Ziele

- Mehrdeutige Single-Choice-Fragen vor der Auslieferung erkennen
- Widersprüche zwischen Erklärung und `correctIndex` reduzieren
- Klare technische Rollout-Stufen definieren, statt sofort die komplexeste Lösung fest einzubauen
- Kosten, Latenz und Qualitätsgewinn bewusst gegeneinander abwägen

## Nicht-Ziele

- Sofortige Umsetzung eines zusätzlichen OpenAI-Calls in der Produktion
- Umbau des Quiz-Produkts auf Multi-Select
- Vollständige inhaltliche Verifikation jeder Quiz-Frage mit deterministischer Logik
- Perfekte Erkennung aller didaktischen Schwächen im Output

## Ausgangslage

### Aktuelle Randbedingungen

- Das Datenmodell unterstützt aktuell effektiv genau eine richtige Antwort pro Frage.
- Die Strukturvalidierung kann Formfehler gut erkennen, aber keine semantische Mehrdeutigkeit.
- Prompt-Härtung hilft, ist aber kein belastbarer Garant für Eindeutigkeit.

### Kernerkenntnis

Das eigentliche Problem ist nicht primär ein JSON- oder Schema-Problem, sondern ein Bewertungsproblem: "Ist wirklich genau eine Antwort objektiv korrekt und sind alle anderen klar falsch?"

## Lösungsstufen

### Stufe 1: Prompt-Härtung

Die Generierung bekommt strengere Vorgaben, zum Beispiel:

- Jede Frage muss genau eine objektiv korrekte Antwort haben
- Keine Fragen formulieren, bei denen mehrere Antworten verteidigbar sein könnten
- Keine Antworterklärungen erzeugen, die auf "Option A", "Option 1" o.ä. referenzieren
- Die Erklärung soll explizit begründen, warum die richtige Antwort korrekt und die anderen falsch sind

Vorteile:

- Kein zusätzlicher API-Call
- Geringe Implementierungskosten
- Sofort umsetzbar

Nachteile:

- Kein harter Schutz gegen Modellfehler
- Semantische Mehrdeutigkeit bleibt möglich

### Stufe 2: Lokale deterministische Guards

Zusätzlich zum Prompt können billige, lokale Prüfungen bestimmte klare Problemfälle früh abfangen.

Sinnvolle lokale Guards:

- Doppelte Antwortoptionen
- Leere oder praktisch leere Felder
- Erklärungen mit expliziten Referenzen wie `Option A`, `Option B`, `Option 1`, `Option 2`

Bewusst nicht als harter lokaler Blocker empfohlen:

- Allgemeine Regex-Heuristiken für "riskante" Fragestämme wie "Which statement is correct?" oder "Which syntax is valid?"

Begründung:

- Solche Heuristiken sind billig, aber unpräzise
- Sie erzeugen schnell False Positives
- Sie erkennen die eigentliche semantische Mehrdeutigkeit nur sehr unvollständig

Vorteile:

- Kein zusätzlicher API-Call
- Guter Pre-Filter für offensichtliche Fehler

Nachteile:

- Erkennt die kritischen Grenzfälle nur teilweise
- Kann leicht in übermäßige Heuristik kippen

### Stufe 3: Verifier-Pass mit Retry

Ein separater Verifier prüft den bereits generierten Quiz-Output noch einmal als Bewertungsaufgabe. Er bestätigt strukturiert:

- Gibt es genau eine objektiv korrekte Antwort?
- Ist keine weitere Antwort vertretbar oder kontextabhängig ebenfalls richtig?
- Passt die Erklärung zum `correctIndex`?

Wenn die Verifikation fehlschlägt, wird die Frage oder der Batch mit einem konkreten Fehlerhinweis neu generiert.

Beispiel für ein mögliches Verifier-Ergebnis:

```ts
type QuizVerificationResult = {
  valid: boolean;
  issues: Array<{
    index: number;
    reason: string;
  }>;
};
```

Vorteile:

- Robuster gegen semantische Mehrdeutigkeit
- Erkennt auch Fälle, die lokale Guards nie sauber sehen würden
- Liefert im Idealfall nachvollziehbare Ablehnungsgründe

Nachteile:

- Zusätzlicher API-Call
- Mehr Latenz
- Höhere Kosten
- Mehr operative Komplexität

## Empfohlene spätere Zielarchitektur

Falls das Thema erneut aufgegriffen wird, ist eine schlanke Hybrid-Lösung der sinnvollste Zielzustand:

1. Prompt-Härtung als Basisschutz
2. Wenige lokale, deterministische Guards für klare Low-Cost-Fehler
3. Optionaler Verifier nur für semantische Eindeutigkeit
4. Retry mit konkretem Fehlerfeedback
5. Abbruch statt Auslieferung, wenn die zulässige Zahl an Versuchen überschritten wird

Wichtig: Der Verifier sollte semantische Probleme lösen, nicht triviale Strukturfehler. Doppelte Optionen oder leere Felder sollten lokal abgefangen werden.

## Rollout-Optionen

### Option A: Prompt-only

Geeignet, wenn geringe Komplexität und minimale Latenz wichtiger sind als ein strikter Quality-Gate.

### Option B: Prompt + lokale Guards

Geeignet, wenn offensichtliche Fehler reduziert werden sollen, ohne zusätzliche OpenAI-Requests einzuführen.

### Option C: Prompt + lokale Guards + Verifier

Geeignet, wenn Vertrauen in die Quiz-Qualität wichtiger ist als zusätzliche Latenz und höhere Kosten.

### Option D: Feature-Flag oder Sampling

Der Verifier wird nicht immer ausgeführt, sondern:

- nur in bestimmten Umgebungen
- nur für einen Teil der Requests
- nur für besonders fehleranfällige Fragetypen oder Themen

Diese Variante ist besonders sinnvoll, wenn zunächst reale Fehlerraten und Latenzkosten gemessen werden sollen.

## Technisches Vorgehen bei einer späteren Umsetzung

### 1. Prompt überarbeiten

Im Generator-Prompt sollten die Single-Choice-Anforderungen explizit und redundant formuliert werden:

- genau eine objektiv richtige Antwort
- drei objektiv falsche Distraktoren
- keine kontextabhängigen oder verteidigbaren Alternativen
- Erklärung ohne Optionsreferenzen

### 2. Lokale Guards ergänzen

Vor einem optionalen Verifier-Call sollten nur wenige eindeutige Guards laufen:

- Duplicate-Check für Antworten
- Leerwert-Prüfungen
- explizite Optionsreferenzen in Erklärungen

### 3. Verifier kapseln

Statt die Hauptgenerierung zu überladen, sollte die Verifikation als eigener Schritt gekapselt werden:

- `requestGeneratedQuizQuestions(...)`
- `validateQuizQuestionsLocally(...)`
- `verifyQuizQuestions(...)`
- `generateQuizQuestions(...)` als Orchestrator mit Retry-Schleife

### 4. Retry-Verhalten festlegen

Empfohlenes Verhalten:

- maximale Zahl an Versuchen definieren, z.B. 2 bis 3
- bei Fehlern gezieltes Feedback in den nächsten Generierungsversuch übernehmen
- nach ausgeschöpften Versuchen keinen fragwürdigen Output ausliefern

### 5. Konfigurierbarkeit vorsehen

Falls ein Verifier eingeführt wird, sollte er von Anfang an schaltbar sein, zum Beispiel über einen Modus wie:

- `off`
- `sample`
- `strict`

Optional kann ein separates Modell für den Verifier vorgesehen werden.

Sinnvolle spätere Env-Var-Namen wären zum Beispiel:

- `QUIZ_VERIFICATION_MODE`
- `OPENAI_QUIZ_VERIFIER_MODEL`

Diese Namen sind in diesem Dokument als Vorschlag zu verstehen, nicht als bereits festgelegte Schnittstelle.

## Kosten- und Latenzbewertung

Die zusätzliche Belastung eines Verifiers sollte nicht über pauschale Schätzwerte im Dokument entschieden werden, sondern über Messung im Projektkontext.

Relevante Kostentreiber:

- Größe des Quiz-Batches
- Länge von Frage, Optionen und Erklärung je Item
- Zahl der Retry-Versuche
- gewähltes Modell für den Verifier

Relevante Latenztreiber:

- zusätzlicher serieller API-Call
- Modellantwortzeit des Verifiers
- mögliche Retry-Schleifen nach Ablehnung

Empfohlenes Vorgehen vor einem späteren Rollout:

- mittlere und p95-Latenz in Staging messen
- Tokenverbrauch für Generator und Verifier getrennt erfassen
- Retry-Rate beobachten
- Kosten pro Quiz-Batch anhand realer Requests statt Beispielwerten bewerten

## Betroffene Bereiche bei einer späteren Implementierung

Voraussichtlich relevant:

- [`server/quiz.ts`](../../server/quiz.ts)
- [`shared/quiz-question.ts`](../../shared/quiz-question.ts)
- [`__tests__/unit/server/quiz.test.ts`](../../__tests__/unit/server/quiz.test.ts)
- gegebenenfalls UI- und Rendering-Logik, falls das Produkt später echte Multi-Select-Fragen unterstützen soll

## Teststrategie

Mindestens folgende Fälle sollten abgesichert werden:

- Zwei Antwortoptionen sind korrekt oder vertretbar korrekt
- Erklärung widerspricht dem `correctIndex`
- Doppelte Antwortoptionen
- Lokaler Guard lehnt einen Batch vor dem Verifier ab
- Verifier lehnt ab und der nächste Generierungsversuch wird mit Feedback wiederholt
- Nach Ausschöpfen aller Versuche wird sauber abgebrochen

Wichtige Regression:

- Der Arrow-Function-Fall mit mehreren syntaktisch gültigen Antworten sollte als konkrete Fixture oder Testfall erhalten bleiben

## Metriken und Entscheidungsgrundlage

Wenn das Feature später ernsthaft evaluiert wird, sollten vor einer dauerhaften Aktivierung mindestens folgende Werte beobachtet werden:

- Anteil der lokal abgelehnten Generierungen
- Anteil der vom Verifier abgelehnten Generierungen
- Retry-Rate
- zusätzliche mittlere und p95-Latenz
- geschätzte Mehrkosten pro Quiz-Batch
- Nutzerfeedback oder intern gefundene fehlerhafte Fragen trotz Schutzmechanismen

## Offene Produktfragen

- Reicht eine schlanke Prompt-plus-Guard-Lösung mittelfristig aus?
- Ist die zusätzliche Latenz eines Verifiers für das Produkt akzeptabel?
- Soll Verifikation immer, nur für Stichproben oder nur für riskantere Themen laufen?
- Ist das Produkt langfristig wirklich rein Single-Choice, oder soll später echtes Multi-Select unterstützt werden?

## Empfehlung

Für den aktuellen Stand ist es sinnvoll, dieses Thema nicht weiter technisch auszubauen, solange der zusätzliche API-Call und die erhöhte Komplexität nicht gewünscht sind.

Wenn das Thema später wieder aufgenommen wird, sollte nicht direkt mit großflächigen Heuristiken begonnen werden. Der sauberste Pfad ist:

1. Prompt-Härtung
2. wenige lokale deterministische Guards
3. optionaler, schaltbarer Verifier
4. Metriken vor einer dauerhaften Aktivierung

Damit bleibt die Lösung technisch kontrollierbar und produktseitig bewusst steuerbar.
