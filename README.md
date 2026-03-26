<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenAI-Whisper-412991?style=for-the-badge&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Deployed-Vercel-000?style=for-the-badge&logo=vercel" />
</p>

# InterviewIQ — AI Interview Assistant

A full-stack, AI-powered interview preparation platform that listens to your answers, gives real-time feedback, and uses spaced repetition to make sure you never forget what you've learned.

> **Built with:** Next.js 14 · PostgreSQL · OpenAI Whisper · GPT-4o · Prisma · NextAuth.js · Recharts

---

## Features

### Speech-to-Text Recording
Record your interview answers using your microphone. Audio is transcribed in real-time via **OpenAI Whisper**, with an editable transcript so you can fix any errors before submitting.

### AI-Powered Feedback
Every answer is evaluated by **GPT-4o-mini** across 5 criteria — completeness, depth, structure, communication, and technical accuracy — each scored 1-10 with specific, actionable feedback. Includes an AI-rewritten "ideal answer" for comparison.

### Resume-Based Question Generation
Upload your PDF resume, skills are auto-extracted using pattern matching against 60+ tech skills, then **Claude / GPT** generates personalized interview questions targeting your experience — not generic textbook questions.

### Spaced Repetition (SM-2 Algorithm)
Questions you struggle with come back sooner. Questions you nail get pushed further out. The same algorithm behind Anki flashcards ensures optimal retention with minimum review time.

### Progress Dashboard
Track your improvement over time with interactive charts — score progression, skills radar, performance by question type, weak spot detection, and a percentile benchmark against other candidates.

### Full Authentication
Email/password signup and signin with **NextAuth.js**, JWT sessions, bcrypt password hashing, and forgot/reset password flow.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Frontend (React)                   │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │  Dashboard  │ │  Practice  │ │  Resume Upload   │  │
│  │  (Recharts) │ │ (SM-2 Queue│ │  (PDF Parse +    │  │
│  │             │ │  + Audio)  │ │   AI Questions)  │  │
│  └──────┬─────┘ └──────┬─────┘ └────────┬─────────┘  │
├─────────┼──────────────┼────────────────┼────────────┤
│         │     Next.js API Routes        │            │
│  ┌──────┴─────┐ ┌──────┴─────┐ ┌───────┴────────┐   │
│  │ /analytics │ │ /feedback  │ │ /transcribe    │   │
│  │ /sessions  │ │ /questions │ │ /resume        │   │
│  │ /spaced-   │ │ /answers/  │ │ /auth/signup   │   │
│  │  repetition│ │  sample    │ │ /auth/[...next]│   │
│  └──────┬─────┘ └──────┬─────┘ └───────┬────────┘   │
├─────────┼──────────────┼────────────────┼────────────┤
│         │          Services             │            │
│  ┌──────┴──────────────┴────────────────┴────────┐   │
│  │  PostgreSQL (Neon)  │  OpenAI API  │  Prisma  │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## Key Algorithms

### SM-2 Spaced Repetition (`lib/sm2.js`)
```
Score 0-2  →  Reset interval to 1 day (you forgot)
Score 3-4  →  Keep interval, lower ease factor (shaky)
Score 5    →  Multiply interval x ease factor (nailed it)

Ease Factor:  EF' = EF + (0.1 - (5-q) x (0.08 + (5-q) x 0.02))
              Floor: 1.3
```

### Adaptive Difficulty
- Avg score < 6 across last 10 sessions — recommend **Junior** questions
- Avg score 6-8 — recommend **Mid-level** questions
- Avg score > 8 — unlock **Senior** questions

### Weak Spot Detection
- Groups answers by question type (Technical, Behavioral, System Design, Coding)
- Flags any category averaging below 6/10
- Surfaces on dashboard with one-click targeted drill

---

## Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database ([Neon](https://neon.tech) free tier works great)
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/interview-assistant.git
cd interview-assistant

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Then edit .env.local with your actual values

# Push database schema
npx prisma db push

# Generate Prisma client
npx prisma generate

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and start practicing.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random 32+ char string for JWT signing |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` (dev) or your Vercel URL (prod) |
| `OPENAI_API_KEY` | Yes | For Whisper transcription + GPT feedback |
| `ANTHROPIC_API_KEY` | No | Optional — for Claude-powered feedback |
| `OPENAI_FEEDBACK_MODEL` | No | Override feedback model (default: `gpt-4o-mini`) |

Generate `NEXTAUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Project Structure

```
app/
├── api/
│   ├── auth/
│   │   ├── [...nextauth]/route.js    # NextAuth handler
│   │   ├── signup/route.js           # User registration
│   │   ├── forgot-password/route.js  # Password reset request
│   │   └── reset-password/route.js   # Password reset confirm
│   ├── resume/route.js               # PDF upload + skill extraction
│   ├── questions/
│   │   ├── route.js                  # Fetch questions by role/difficulty
│   │   └── resume/route.js           # AI question generation from resume
│   ├── feedback/route.js             # AI answer evaluation
│   ├── transcribe/route.js           # Whisper speech-to-text
│   ├── spaced-repetition/route.js    # SM-2 card management
│   ├── analytics/route.js            # Dashboard aggregations
│   └── answers/sample/route.js       # AI sample answer generation
├── auth/
│   ├── signin/page.jsx
│   ├── signup/page.jsx
│   ├── forgot-password/page.jsx
│   └── reset-password/page.jsx
├── dashboard/page.jsx                # Progress analytics
├── practice/page.jsx                 # Spaced repetition review
└── resume/page.jsx                   # Upload CV + personalized Qs

components/
├── AudioRecorder.jsx                 # Mic recording + waveform
├── FeedbackPanel.jsx                 # Score + criteria + improved answer
├── ModelAnswer.jsx                   # Collapsible sample answer
├── ResumeUploader.jsx                # Drag-and-drop PDF
├── DifficultySelector.jsx            # Junior / Mid / Senior toggle
├── ProgressChart.jsx                 # Recharts visualizations
├── WeakSpotCard.jsx                  # Weak area alert card
└── BenchmarkBadge.jsx                # Percentile ranking badge

lib/
├── sm2.js                            # SM-2 spaced repetition algorithm
├── pdf-parser.js                     # PDF → text → skill extraction
├── prisma.js                         # Prisma client singleton
└── auth.js                           # NextAuth configuration

prisma/
└── schema.prisma                     # 10 models, full relational schema
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in Vercel dashboard
4. Set build command: `npx prisma generate && npx prisma db push && next build`
5. Deploy

After first deploy, update `NEXTAUTH_URL` to your `https://your-app.vercel.app` URL and redeploy.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | JavaScript (React) |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | NextAuth.js (JWT + bcrypt) |
| Speech-to-Text | OpenAI Whisper |
| AI Feedback | GPT-4o-mini / Claude (optional) |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Deployment | Vercel |

---

## License

MIT — use it, fork it, build on it.