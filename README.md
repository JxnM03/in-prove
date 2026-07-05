# in:prove 🏋️

**Voice-based nutrition tracking for athletes.**

in:prove is a full-stack web application that allows athletes to log their meals by speaking naturally. The app uses OpenAI's Whisper model to transcribe audio, GPT-4o mini to extract food items, quantities and macronutrients, and stores everything in a PostgreSQL database. Athletes can track their daily calorie and macro progress, view their meal history, and edit entries after saving.

---

## Features

- **Voice & text input** — Record a meal description or type it; both are processed identically
- **AI-powered extraction** — GPT-4o mini detects food items, quantities and macronutrients automatically
- **Smart clarification loop** — If quantities are missing, the AI asks targeted follow-up questions with portion-size hints
- **Macro tracking** — Protein, carbohydrates and fat are estimated per item and tracked against configurable daily targets
- **Daily check-in** — Half-circle progress charts show calorie and macro progress at a glance
- **Meal history** — Filter by today, this week, this month or a custom date range; keyword search included
- **Inline editing** — Edit quantities after saving; calories and macros recalculate proportionally
- **Athlete login** — JWT authentication; each athlete has their own private food log

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Speech-to-Text | OpenAI Whisper API |
| AI Extraction | OpenAI GPT-4o mini |
| Authentication | JSON Web Tokens (JWT) |

---

## Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org) (v18 or higher, includes npm)
- [PostgreSQL](https://www.postgresql.org/download/) (v14 or higher)
- [Git](https://git-scm.com)
- An **OpenAI API key** — create one at [platform.openai.com](https://platform.openai.com)
  - You will need to add a payment method and set a usage limit (a few euros is more than enough for testing)
  - The app uses `whisper-1` for transcription and `gpt-4o-mini` for extraction

> **Windows users:** After installing PostgreSQL, add its `bin` folder to your system PATH (e.g. `C:\Program Files\PostgreSQL\18\bin`). After installing Node.js, if `npm` commands are blocked in PowerShell, switch to **Git Bash** instead.

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/JxnM03/in-prove.git
cd in-prove
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 4. Configure environment variables

```bash
cd ../backend
cp .env.example .env
```

Open `.env` and fill in your own values:

```env
OPENAI_API_KEY=your-openai-api-key-here
PORT=3001
DATABASE_URL=postgresql://postgres:your-postgres-password@localhost:5432/inprove
```

### 5. Set up the database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE inprove;"

# Apply the schema
psql -U postgres -d inprove -f db/schema.sql
```

### 6. Load demo data (optional but recommended)

The repository includes a demo setup script that creates three athlete accounts with realistic meal history:

```bash
psql -U postgres -d inprove -f demo_setup.sql
```

This creates the following demo accounts (password for all: `password`):

| Username | Name | Calorie Goal |
|---|---|---|
| `messi` | Lionel Messi | 3200 kcal |
| `ronaldo` | Cristiano Ronaldo | 3500 kcal |
| `mueller` | Thomas Müller | 2800 kcal |

---

## Running the Application

You need two terminals running simultaneously.

**Terminal 1 — Start the backend:**

```bash
cd backend
node server.js
```

You should see:
```
🚀 Server running on port 3001
✅ Database connection successful
```

**Terminal 2 — Start the frontend:**

```bash
cd frontend
npm start
```

The browser will open automatically at `http://localhost:3000`.

---

## Using in:prove

### Logging a meal

1. Log in with one of the demo accounts (or create your own via the database)
2. On the **Track** tab, select the meal type (Breakfast, Lunch, Dinner or Snack)
3. Click **Start recording** and describe your meal — for example: *"I had 250 grams of grilled chicken with rice and a salad"*
4. Click **Stop recording** — Whisper will transcribe your speech and GPT will extract the food items
5. If any quantities are unclear, the app will ask follow-up questions — answer them by recording or typing
6. Review the detected food items and click **Confirm** to save to the database
7. Alternatively, click **Type it instead** to enter the meal description as text

### Viewing history

- Switch to the **Entries** tab to see all saved meals
- Use the quick filters (Today, This week, This month, All time) or set a custom date range
- Click on a quantity to edit it inline — calories and macros update automatically
- Use the 🗑️ icon next to a food item to delete just that item, or **Delete** to remove the entire meal

### Configuring goals

- Go to the **Settings** tab to set your daily calorie goal and macro split (protein / carbs / fat)
- The daily check-in on the Track tab updates immediately to reflect the new targets

---

## Project Structure

```
in-prove/
├── backend/
│   ├── controllers/
│   │   ├── audioController.js    # Whisper transcription
│   │   ├── foodController.js     # GPT food extraction & clarification
│   │   ├── logController.js      # Save, retrieve, edit, delete food logs
│   │   ├── authController.js     # Login & JWT
│   │   └── athleteController.js  # Calorie goal & macro settings
│   ├── db/
│   │   ├── index.js              # PostgreSQL connection pool
│   │   └── schema.sql            # Database schema
│   ├── routes/
│   │   ├── audio.js
│   │   ├── food.js
│   │   ├── log.js
│   │   ├── auth.js
│   │   └── athletes.js
│   ├── uploads/                  # Temporary audio files (auto-deleted)
│   ├── .env.example
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AudioRecorder.js
│       │   ├── CheckIn.js
│       │   ├── ConfirmDialog.js
│       │   ├── FoodList.js
│       │   ├── Login.js
│       │   ├── MealTypeConflict.js
│       │   └── Settings.js
│       ├── App.js
│       └── App.css
├── demo_setup.sql
└── README.md
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate athlete, return JWT |
| POST | `/api/audio/transcribe` | Audio file → transcribed text (Whisper) |
| POST | `/api/food/extract` | Transcript → food items + macros (GPT) |
| POST | `/api/food/clarify` | Clarification loop for missing quantities |
| POST | `/api/log/save` | Save confirmed meal to database |
| GET | `/api/log/all` | Retrieve logs filtered by athlete |
| PATCH | `/api/log/update-item` | Edit quantity, recalculate macros proportionally |
| DELETE | `/api/log/delete-item` | Delete a single food item |
| DELETE | `/api/log/delete` | Delete an entire meal entry |
| GET | `/api/athletes/goal` | Get athlete's calorie goal and macro split |
| PATCH | `/api/athletes/goal` | Update daily calorie goal |
| PATCH | `/api/athletes/macros` | Update macro split percentages |
| GET | `/api/athletes/today-calories` | Get today's consumed calories and macros |

---

## Git Workflow

This project uses a feature-branch workflow:

```
main          ← stable, production-ready code
└── dev       ← main development branch
    ├── feature/jan-...       ← Jan's feature branches
    └── feature/mikhail-...   ← Mikhail's feature branches
```

When working on a new feature:

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-name-feature-description

# ... develop and commit regularly ...

git push origin feature/your-name-feature-description
# Then open a Pull Request on GitHub: feature → dev
```

---

## Authors

**Jan Michel & Mikhail Vereshchagin**
Data Science Praktikum — Praktikum DBMS — 2026