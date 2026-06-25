# in:prove 🏋️
Ernährungsassistent für Sportler – Voice-basierte Kalorienverfolgung.

---

## Voraussetzungen

Stelle sicher, dass folgendes installiert ist:
- [Node.js](https://nodejs.org) (inkl. npm)
- [PostgreSQL](https://www.postgresql.org/download/windows/)
- [Git](https://git-scm.com)
- [VS Code](https://code.visualstudio.com)

---

## Projekt einrichten (einmalig)

### 1. Repository klonen
```bash
git clone https://github.com/JxnM03/in-prove.git
cd in-prove
```

### 2. Backend Dependencies installieren
```bash
cd backend
npm install
```

### 3. Frontend Dependencies installieren
```bash
cd ../frontend
npm install
```

### 4. Eigene `.env` Datei erstellen
```bash
cd ../backend
cp .env.example .env
```
Öffne die `.env` Datei und trage deine eigenen Werte ein:
- Deinen eigenen OpenAI API Key (erstellen auf [platform.openai.com](https://platform.openai.com))
- Dein PostgreSQL Passwort
- Den gewünschten Port (z.B. 3001)

### 5. Datenbank einrichten
```bash
psql -U postgres -c "CREATE DATABASE inprove;"
psql -U postgres -d inprove -f db/schema.sql
```

### 6. Auf den dev Branch wechseln
```bash
cd ..
git checkout dev
```

---

## Projekt starten

Du brauchst zwei Terminals gleichzeitig (in VS Code oben rechts auf `+` klicken):

**Terminal 1 – Backend starten:**
```bash
cd backend
node server.js
```
✅ Erfolgreich wenn du siehst: `Server läuft auf Port 3001` und `Datenbankverbindung erfolgreich`

**Terminal 2 – Frontend starten:**
```bash
cd frontend
npm start
```
✅ Der Browser öffnet sich automatisch auf `http://localhost:3000`

---

## Mit Git arbeiten

### Nur testen, nichts ändern
Auf dem `dev` Branch bleiben – kein weiterer Schritt nötig.

### Eigene Änderungen machen

**1. Sicherstellen dass dev aktuell ist:**
```bash
git checkout dev
git pull origin dev
```

**2. Eigenen Branch erstellen:**
```bash
git checkout -b feature/dein-name-beschreibung
# Beispiel: git checkout -b feature/tim-login
```

**3. Änderungen committen (regelmäßig während der Arbeit):**
```bash
git add .
git commit -m "Kurze Beschreibung was du geändert hast"
```

**4. Branch auf GitHub hochladen:**
```bash
git push origin feature/dein-name-beschreibung
```

**5. Pull Request erstellen (wenn fertig):**
- Auf GitHub → **"Pull requests"** → **"New pull request"**
- **base:** `dev` ← **compare:** `feature/dein-name-beschreibung`
- Titel eingeben → **"Create pull request"**
- Jan schaut drüber und merged es in `dev`

**6. Nach dem Merge – aufräumen:**
```bash
git checkout dev
git pull origin dev
git branch -d feature/dein-name-beschreibung
```

---

## Wichtige Regeln

- **Nie direkt in `main` oder `dev` pushen** – immer über einen Feature-Branch
- **Immer `git pull` bevor du anfängst** – sonst kann es zu Konflikten kommen
- Die `.env` Datei **nie** in Git hochladen – sie enthält deine privaten API Keys

---

## Projektstruktur

```
in-prove/
├── backend/
│   ├── controllers/      # Logik für Audio, GPT, Datenbank
│   ├── db/               # Datenbankverbindung und Schema
│   ├── routes/           # API Endpunkte
│   ├── uploads/          # Temporäre Audiodateien
│   ├── .env              # Deine lokalen Umgebungsvariablen (nicht im Repo)
│   ├── .env.example      # Vorlage für die .env
│   └── server.js         # Einstiegspunkt des Servers
└── frontend/
    └── src/
        ├── components/   # React Komponenten
        ├── App.js        # Haupt-Komponente
        └── App.css       # Styling
```

---

## API Übersicht

| Route | Methode | Funktion |
|---|---|---|
| `/api/audio/transcribe` | POST | Audio → Text (Whisper) |
| `/api/food/extract` | POST | Text → Lebensmittel (GPT) |
| `/api/food/clarify` | POST | Rückfragen bei unklaren Mengen |
| `/api/log/save` | POST | Mahlzeit in Datenbank speichern |
| `/api/log/all` | GET | Alle gespeicherten Mahlzeiten abrufen |