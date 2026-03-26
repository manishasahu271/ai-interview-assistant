<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenAI-Whisper%20%2B%20GPT-412991?style=for-the-badge&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Live-Vercel-000?style=for-the-badge&logo=vercel" />
</p>

# InterviewIQ — AI Interview Assistant

A full-stack, AI-powered interview preparation platform that listens to your answers, gives real-time feedback, and uses spaced repetition to make sure you never forget what you've learned.

**Live Demo:** [ai-interview-assistant-rho-six.vercel.app](https://ai-interview-assistant-rho-six.vercel.app)

---

## Features

### Speech-to-Text Recording
Record your interview answers directly in the browser. Audio is transcribed in real-time via OpenAI Whisper with a live waveform visualization. The transcript is editable, so you can fix any errors before submitting for feedback.

### AI-Powered Feedback
Every answer is evaluated by GPT-4o-mini across five criteria — completeness, depth, structure, communication, and technical accuracy — each scored 1-10 with specific, actionable feedback. Includes an AI-rewritten "ideal answer" you can compare against your own.

### Resume-Based Question Generation
Upload your PDF resume and the system auto-extracts skills using pattern matching against 60+ technologies. GPT then generates personalized interview questions targeting your actual experience — not generic textbook questions.

### Spaced Repetition (SM-2)
Questions you struggle with come back sooner. Questions you nail get pushed further out. The same algorithm behind Anki flashcards ensures you retain what matters most with minimum review time.

### Progress Dashboard
Track your improvement over time with interactive Recharts visualizations — score progression, skills radar, performance breakdown by question type, weak spot detection, and a percentile benchmark against other candidates.

### Full Authentication
Email/password signup and signin with NextAuth.js, JWT sessions, bcrypt password hashing, and forgot/reset password flow.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | JavaScript / TypeScript (React) |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | NextAuth.js (JWT + bcrypt) |
| Speech-to-Text | OpenAI Whisper |
| AI Feedback | OpenAI GPT-4o-mini |
| PDF Parsing | unpdf (serverless-compatible) |
| Charts | Recharts |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database ([Neon](https://neon.tech) free tier works)
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Installation

```bash
git clone https://github.com/manishasahu271/ai-interview-assistant.git
cd ai-interview-assistant
npm install
cp .env.example .env.local
# Edit .env.local with your actual values
npx prisma db push
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and start practicing.

---

## Environment Variables

Create a `.env.local` file in the project root:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random 32+ char string for JWT signing |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` (dev) or your Vercel URL (prod) |
| `OPENAI_API_KEY` | Yes | Powers Whisper transcription and GPT feedback |

Generate `NEXTAUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## License

MIT
