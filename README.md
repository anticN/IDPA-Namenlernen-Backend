# IDPA-Namenlernen

## Projektbeschreibung
Das Projekt IDPA-Namenlernen ist ein Projekt, welches im Rahmen des Interdisziplinären Arbeit der dritten IMS-Klasse stattfindet. Das Ziel des Projektes ist es, ein Programm zu entwickeln, welches das Lernen von Namen erleichtert. Das Programm soll Lehpersonen dabei helfen, sich die Namen von neuen Schülern und Schülerinnen zu merken, indem es die Namen in regelmäßigen Abständen abfragt. Das Programm soll dabei so gestaltet sein, dass es möglichst einfach zu bedienen ist und die Namen in einer übersichtlichen Form präsentiert werden.

## Projektmitglieder
- Nikola Antic
- <a href="https://github.com/FernandoMeier">Fernando Meier</a>
- <a href="https://github.com/FischerNils06">Nils Fischer</a>

## Backend
Das hier ist das Backend der Applikation. Es ist ein NodeJS basiertes Express-Backend, welches die Datenbankanbindung und die API bereitstellt.

## Frontend
Das Frontend zu unserer Applikation finden Sie <a href="https://github.com/anticN/IDPA-Namenlernen-Frontend">hier</a>.

## Setup
1. Repository klonen
```
git clone https://github.com/anticN/IDPA-Namenlernen-Backend.git
```
2. In das Verzeichnis wechseln
3. Abhängigkeiten installieren
```
npm install
```
4. .env Datei erstellen für die MySQL Verbindung
```
#example
DB_HOST=localhost
DB_USER=idpa
DB_PASSWORD=IDPA2024
DB_NAME=learnnames_DB
SECRET="Very Secret String"
```
5. Ordner namens "uploads" erstellen
```
Ornder erstellen: /path/to/IDPA-Namenlernen-Backend/uploads
```
6. Namenlernen_DB.sql in MySQL importieren bzw. ausführen
```
mysql -u root -p
```
```
source /path/to/IDPA-Namenlernen-Backend/Namenlernen_DB.sql
```
7. Server starten
```
npm run start
```

