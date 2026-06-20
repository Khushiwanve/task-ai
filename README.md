# TaskFlow AI 🧠⚡

A full-stack **AI-powered task manager** — Claude breaks your goals into subtasks, coaches you on productivity, and tells you what to work on next. Dark glassmorphism UI, zero database setup required.

This is portfolio-ready: it shows full-stack skills (Express API + vanilla JS frontend), real AI integration (not just a wrapper), and a polished, original UI — not a Bootstrap template.

---

## ✨ Features

- **AI Task Breakdown** — type a goal like "Build a portfolio site," get back subtasks with time estimates
- **AI Productivity Coach** — ask it anything about your workload, get direct advice
- **AI "What's Next"** — analyzes all your tasks and picks the one to focus on right now
- **Subtasks with auto-complete** — finish all subtasks, parent task marks itself done
- **Tags, priorities, due dates** — real task management, not just a list
- **Dark, original UI** — glassmorphism cards, animated gradient border while AI "thinks"
- **No database setup** — JSON file storage locally; ready to swap in Postgres/Mongo later

---

## 🛠 Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** Vanilla HTML/CSS/JS (no framework — shows you understand the fundamentals)
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`)
- **Storage:** JSON file (local) — swappable for a real DB later
- **Deployment:** Vercel (serverless)

---

## 📁 Project Structure

```
task-ai/
├── api/
│   ├── index.js                  # Express app entry
│   ├── routes/
│   │   ├── taskRoutes.js
│   │   └── aiRoutes.js
│   ├── controllers/
│   │   ├── taskController.js     # CRUD logic
│   │   └── aiController.js       # Claude API calls
│   ├── middleware/
│   │   ├── logger.js
│   │   └── errorHandler.js
│   └── utils/
│       └── db.js                 # File-based storage
├── public/
│   ├── index.html
│   ├── css/style.css             # Design system + components
│   └── js/app.js                 # Frontend logic
├── data/                         # Auto-created, stores tasks.json (local only)
├── vercel.json                   # Vercel deployment config
├── .env.example
└── package.json
```

---

## 🚀 Run Locally in VS Code

### 1. Install Node.js
Download the **LTS version** from [nodejs.org](https://nodejs.org). Verify in terminal:
```bash
node --version
npm --version
```

### 2. Open the project
Unzip the folder, then in VS Code: **File → Open Folder** → select `task-ai`.

### 3. Install dependencies
```bash
npm install
```

### 4. Get a Claude API key (for AI features)
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up / log in → **API Keys** → **Create Key**
3. Copy the key (starts with `sk-ant-...`)

### 5. Set up your environment variable
Create a file named `.env` in the project root (copy `.env.example`):
```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

> ⚠️ Never commit `.env` to GitHub — it's already in `.gitignore`.

That's it — `dotenv` is already wired up, so `npm start` will pick up the key automatically.

### 6. Run it
```bash
npm start
```
Open **http://localhost:3000** in your browser. 🎉

The task CRUD features work immediately with no API key. AI features (Breakdown, Coach, Suggest Next) need the key from step 4.

---

## ☁️ Deploy to Vercel

### Option A — Vercel CLI (fastest)

1. Install the CLI:
```bash
npm install -g vercel
```

2. From the project folder:
```bash
vercel
```
Follow the prompts (link to your Vercel account, accept defaults).

3. Add your API key as an environment variable:
```bash
vercel env add ANTHROPIC_API_KEY
```
Paste your key when prompted, choose all environments (Production/Preview/Development).

4. Deploy to production:
```bash
vercel --prod
```

You'll get a live URL like `https://task-ai-yourname.vercel.app`.

### Option B — Vercel Dashboard (no CLI)

1. Push this project to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Before deploying, go to **Environment Variables** and add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key
4. Click **Deploy**

### ⚠️ Important: Vercel storage limitation
Vercel's serverless functions have a **read-only filesystem** except for `/tmp`, and `/tmp` is **wiped on every cold start**. This project already detects Vercel (`process.env.VERCEL`) and writes to `/tmp` automatically — but that means **tasks won't persist long-term** on Vercel's free tier. This is fine for a portfolio demo, but for real persistence you'd want to add a database.

### 🗄️ Want tasks to actually persist on Vercel? (Optional upgrade)
Easiest free option: **Vercel Postgres** or **Vercel KV** (Redis). Mention in your interview that you're aware of this limitation and know how to solve it — that's a great signal on its own. If you want, ask me to wire up Vercel Postgres next.

---

## 🧪 Testing the API directly (curl)

```bash
# Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn Express","priority":"high"}'

# AI breakdown
curl -X POST http://localhost:3000/api/ai/breakdown \
  -H "Content-Type: application/json" \
  -d '{"goal":"Launch a SaaS product"}'

# AI coach
curl -X POST http://localhost:3000/api/ai/coach \
  -H "Content-Type: application/json" \
  -d '{"question":"How do I stop procrastinating?"}'
```

---

## 💡 Good Talking Points for Interviews

- Explain the **MVC-style separation** (routes → controllers → utils)
- Explain why you used `asyncHandler` to catch promise rejections in Express (common real-world gotcha)
- Explain the **Vercel filesystem limitation** and how you'd fix it with a real database
- Walk through the **AI prompt design** in `aiController.js` — how you constrain Claude to return strict JSON

## 🔭 Ideas to Extend Further
- Swap JSON file storage for Postgres (Vercel Postgres, Supabase, or Neon)
- Add user accounts + JWT auth (multi-user support)
- Add streaming AI responses (typewriter effect)
- Add a calendar/timeline view
- Write tests with Jest + Supertest
