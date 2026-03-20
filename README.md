# NextFlow — AI Workflow Builder

A pixel-perfect Krea.ai clone for LLM workflow building. Built with Next.js, React Flow, Google Gemini, Prisma, and Clerk.

## Quick Start

```bash
# 1. Extract and enter project
tar -xzf nextflow-complete.tar.gz
cd nextflow

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys (see "Getting API Keys" below)

# 4. Push database schema
npx prisma db push

# 5. Start dev server
npm run dev

# 6. Open http://localhost:3000
```

## Getting API Keys

| Service | URL | What to get |
|---------|-----|-------------|
| **Clerk** | https://clerk.com | Create app → Publishable key + Secret key |
| **Neon** | https://neon.tech | Create project → Connection string |
| **Google AI** | https://aistudio.google.com/apikey | Create API key (free tier) |
| **Transloadit** | https://transloadit.com | Sign up → Auth key + Secret (optional for dev) |

### Minimum `.env.local` for development:
```
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/workflow"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/workflow"
GEMINI_API_KEY="your_key"
```

## Optional: Install sharp and FFmpeg

```bash
# For image cropping (Crop Image node):
npm install sharp

# For video frame extraction (Extract Frame node):
sudo apt install ffmpeg
```

## Features

- **6 Node Types**: Text, Upload Image, Upload Video, Run LLM, Crop Image, Extract Frame
- **React Flow Canvas**: Dot-grid background, pan/zoom, MiniMap
- **Type-Safe Connections**: Color-coded handles, invalid connections blocked
- **Parallel DAG Execution**: Kahn's topological sort, independent branches run concurrently
- **Google Gemini Integration**: Multimodal prompts with vision support
- **Workflow History**: Right sidebar with run details and node-level execution data
- **Auto-Save**: Debounced save to PostgreSQL
- **DAG Validation**: Cycle detection, missing input checks, warnings
- **Undo/Redo**: Full history stack
- **Export/Import**: JSON workflow files
- **Sample Workflow**: Pre-built Product Marketing Kit Generator
- **Clerk Auth**: Protected routes, user-scoped data
- **Dark Theme**: Matches Krea.ai aesthetic

## Project Structure

```
nextflow/
├── prisma/schema.prisma         # Database schema
├── public/
│   ├── sample-workflow.json     # Exportable demo workflow
│   └── uploads/                 # Server-side file storage
├── src/
│   ├── app/
│   │   ├── api/                 # All API routes
│   │   ├── sign-in/             # Clerk auth pages
│   │   ├── sign-up/
│   │   ├── workflow/            # Main editor (protected)
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Landing page
│   ├── components/
│   │   ├── canvas/              # React Flow wrapper
│   │   ├── edges/               # Animated purple edge
│   │   ├── layout/              # Sidebar, Toolbar
│   │   ├── nodes/               # All 6 node components
│   │   └── ui/                  # Toast notifications
│   ├── lib/
│   │   ├── dag-validation.ts    # DAG cycle + input validation
│   │   ├── execution-engine.ts  # Topological sort + execution
│   │   ├── gemini.ts            # Google Gemini API
│   │   ├── hooks/               # Auto-save, file upload hooks
│   │   ├── sample-workflow.ts   # Pre-built demo workflow
│   │   └── type-validation.ts   # Handle type checking
│   ├── store/
│   │   ├── workflow-store.ts    # Zustand - nodes, edges, undo
│   │   └── history-store.ts     # Zustand - run history
│   ├── trigger/                 # Trigger.dev task definitions
│   └── types/nodes.ts           # Core type system
├── middleware.ts                 # Clerk auth middleware
└── package.json
```

## Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Set all `.env.local` variables in Vercel's Environment Variables dashboard.

## Tech Stack

Next.js 15 · TypeScript · React Flow · Zustand · Prisma · PostgreSQL (Neon) · Clerk · Google Gemini · Zod · Tailwind CSS · Lucide Icons
