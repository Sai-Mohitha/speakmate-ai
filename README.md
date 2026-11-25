# SpeakMate AI

**Speak English with Confidence.**

SpeakMate AI is a full-stack English speaking, grammar coaching, and communication practice platform built for students, job seekers, and working professionals. Practice real conversations, fix grammar mistakes in context, build your personal vocabulary bank, rehearse presentations in a 3D auditorium, and track measurable fluency growth week over week.

---

## Why SpeakMate AI?

Many learners read and understand English comfortably yet hesitate when speaking out loud in class seminars, HR interviews, technical rounds, or workplace standups. SpeakMate AI bridges that gap with a judgment-free studio that combines interactive AI dialogue, immediate side-by-side grammar feedback, hands-free voice practice, and tangible weekly analytics.

---

## Key Features

- **Student Dashboard & Goal Tracking**
  - At-a-glance KPIs for Completed Sessions, Grammar Accuracy Score, New Vocabulary Learned, and Daily Practice Streak.
  - Monday–Sunday Weekly Practice Activity chart, Daily Speaking Goal progress bar, Skill Breakdown bars (Fluency, Grammar, Pronunciation, Vocabulary), and Recent Practice Sessions.
- **AI Speaking Practice & Live Voice Call**
  - Topic-focused speaking modes: **Daily Life**, **Job Interviews**, **Education**, **Technology**, and **General Conversation**.
  - Interactive chat with microphone audio transcription and text-to-speech playback.
  - **Side-by-Side Grammar Correction Panel** highlighting the original phrasing, corrected sentence, and the specific tense or structure rule.
  - **Vocabulary Suggestion Card** displaying word, part of speech, definition, and example sentence with one-click **Mark as Learned** syncing straight to your Vocabulary Bank.
  - **Live Voice Call** mode for real-time, hands-free spoken English practice over WebSockets with live transcripts.
- **AI Coach Chat with Google Search Grounding**
  - Four specialist personas (Career & Interview Advisor, Current Events Discussion Coach, Grammar & Writing Strategist, Executive Communication Mentor) with clickable web sources.
- **3D Public Speaking Auditorium Studio**
  - Interactive Three.js WebGL stage with a procedural lectern, teleprompter cues, lighting presets, camera angles, and live microphone energy feedback.
- **Creative Video & Music Studio**
  - Generate presentation B-roll visuals and instrumental focus tracks via server-side Gemini media endpoints.
- **Conversation Partner Matching & Mentorship**
  - Filter speaking peers by proficiency, topic, practice purpose, and schedule with a transparent 100-point compatibility breakdown.
  - Browse communication coaches and schedule 1-on-1 mentorship sessions.
- **Learning Progress & Settings**
  - Weekly speaking minutes bar chart, Grammar Accuracy Progression trend line, actionable **Areas for Improvement** cards, Saved Vocabulary Bank, and customizable daily goals and proficiency levels (**Beginner**, **Intermediate**, **Interview Ready**).

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Three.js, Lucide React |
| **Backend** | Node.js, Express (`server.ts`), WebSockets (`ws`) |
| **AI & Media** | `@google/genai` server-side SDK (text coaching, structured grammar JSON, Live Voice API, audio transcription, Google Search grounding, video & audio generation) |
| **Auth & Database** | Firebase Authentication (Google Sign-In + Admin SDK ID token verification), Cloud SQL for PostgreSQL with Drizzle ORM (`users`, `practice_sessions`, `mentorship_bookings`, `chat_messages`), plus browser `localStorage` support for local workspaces |

---

## Project Structure

```text
├── index.html                  # App entry point & typography
├── server.ts                   # Express API, WebSocket Live Voice proxy, Drizzle DB routes
├── src/
│   ├── App.tsx                 # Multi-view workspace router & auth/persistence sync
│   ├── firebase.ts             # Client Firebase initialization
│   ├── components/             # Landing, Auth, Dashboard, AI Practice, Live Voice,
│   │                           # Coach Chat, 3D Stage, Media Studio, Partners, Mentorship,
│   │                           # Learning Progress, and Settings views
│   ├── db/                     # Drizzle PostgreSQL schema, pool, and query helpers
│   ├── lib/                    # Server-side Firebase Admin initialization
│   ├── middleware/             # Bearer ID token verification middleware
│   ├── utils/                  # Cloud SQL client, local storage, analytics & matching logic
│   └── types/                  # Shared TypeScript interfaces
├── firestore.rules             # Firestore security rules
├── .env.example                # Environment variable template
└── package.json                # Scripts and dependencies
```

---

## Getting Started

### Prerequisites

- **Node.js 20+** and **npm**
- A **Gemini API key** (configured server-side via `.env`)
- *(Optional)* PostgreSQL / Cloud SQL credentials and Firebase project config for cloud-synced Google accounts

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```env
GEMINI_API_KEY="your_gemini_api_key"
APP_URL="http://localhost:3000"
PORT=3000

# Optional: PostgreSQL / Cloud SQL for cloud-synced Google workspaces
SQL_HOST="your_postgres_host"
SQL_DB_NAME="your_database_name"
SQL_USER="your_database_user"
SQL_PASSWORD="your_database_password"
```

> **Security:** Never commit `.env` files or API keys to GitHub. `.gitignore` excludes `.env*` while keeping `.env.example`.

### 3. Run Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 4. Build & Type-Check

```bash
npm run lint
npm run build
NODE_ENV=production npm start
```

---

## Publishing to GitHub

To push this project to your own GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit: SpeakMate AI platform"
git branch -M main
git remote add origin https://github.com/<your-username>/speakmate-ai.git
git push -u origin main
```

---

## License

Built for educational and personal communication development. Feel free to customize and extend for your own learning workflow.
