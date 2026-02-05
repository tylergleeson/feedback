# SME Feedback Loop Platform - MVP

A proof-of-concept platform demonstrating a continuous SME (Subject Matter Expert) feedback loop for AI tools.

## Overview

This platform shows the complete cycle:
1. **AI generates content** using a knowledge base of principles and rules
2. **SME reviews the output** and provides inline feedback
3. **Feedback gets parsed** by AI into structured changes
4. **Changes get approved/rejected** through a review queue
5. **Knowledge base updates** and AI output improves

## Architecture

```
Frontend (React + TypeScript + Tailwind)
    ↓
Backend API (FastAPI + Python)
    ↓
Data Layer (SQLite + Knowledge Base + Git)
```

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- (Optional) Anthropic API key for AI features

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (optional - for AI features)
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend runs on http://localhost:3000 and proxies API requests to the backend.

## Usage

### 1. Review Content Tab

- Enter a product description prompt
- Click "Generate" to create AI content
- Select text in the generated content
- Add feedback comments and ratings
- Submit feedback (automatically parsed into structured changes)

### 2. Approval Queue Tab

- View pending changes from SME feedback
- See change type (local edit, principle, rule, etc.)
- See tier level (auto-approve, review, explicit approval)
- Approve or reject changes
- Approved changes update the knowledge base

### 3. Demo Comparison Tab

- Compare content generated with/without knowledge base
- See which forbidden words appear in generic output
- Visualize the impact of SME feedback

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/feedback` | Submit SME feedback |
| GET | `/api/feedback` | List all feedback |
| GET | `/api/changes` | List pending changes |
| POST | `/api/changes/{id}/approve` | Approve a change |
| POST | `/api/changes/{id}/reject` | Reject a change |
| POST | `/api/generate` | Generate AI content |
| POST | `/api/generate/compare` | Compare with/without KB |
| GET | `/api/knowledge` | Get knowledge base |
| GET | `/api/knowledge/history` | Get version history |

## Knowledge Base

The knowledge base is stored in `backend/knowledge_base/`:

- `principles.md` - Content generation principles (clarity, tone, structure)
- `rules.json` - Structured rules (forbidden words, sentence limits)
- `examples/` - Good and bad example content

## Project Structure

```
/feedback
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Environment config
│   │   ├── database.py          # SQLite operations
│   │   ├── models.py            # Pydantic models
│   │   ├── routers/
│   │   │   ├── feedback.py      # Feedback endpoints
│   │   │   ├── changes.py       # Approval endpoints
│   │   │   └── generate.py      # Generation endpoints
│   │   └── services/
│   │       ├── ai_parser.py     # Feedback parsing
│   │       ├── ai_generator.py  # Content generation
│   │       ├── knowledge.py     # KB operations
│   │       └── versioning.py    # Git operations
│   ├── knowledge_base/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   └── package.json
└── README.md
```

## Development

### Running Without API Key

The platform works without an Anthropic API key - it uses mock responses for AI features. This is useful for testing the feedback loop workflow.

### Adding Your API Key

To enable real AI-powered feedback parsing and content generation:

1. Get an API key from https://console.anthropic.com
2. Add to `backend/.env`:
   ```
   ANTHROPIC_API_KEY=your-key-here
   ```
3. Restart the backend server

## Demo Scenario

The MVP uses a product description generator as the demo use case:

1. **Generate** a product description
2. **Review** as a marketing SME
3. **Provide feedback** like "Don't use buzzwords" or "Be more specific"
4. **Approve** the parsed changes
5. **Regenerate** and see improvement

This demonstrates the concept without needing a complex AI system.

# SME Review → Revision Platform (MVP)

A lightweight platform where a Subject Matter Expert (SME) reviews an AI (or human) output, leaves ratings + comments, and the system **synthesizes that feedback into**:

1) a **Version 2 (V2)** revision of the original artifact/output, and
2) a **review summary document** explaining what the SME said and how V2 differs from V1 (and why).

This repo is an MVP scaffold to prove the end-to-end loop: **Output → SME Review → Synthesized Revision + Summary**.

---

## What This MVP Should Do

### Core Workflow

1. **Provide an output (V1)**
   - An “artifact” is generated or uploaded (e.g., survey draft, customer email, requirements snippet, product copy).
2. **SME reviews V1**
   - The SME can:
     - grade (numeric rating)
     - leave freeform feedback
     - add inline comments on specific spans of text
3. **Platform synthesizes SME feedback**
   - The platform turns the SME’s review into actionable edits and decisions.
4. **Generate V2 + Summary**
   - **V2**: a revised version of the original artifact that incorporates the SME feedback.
   - **Summary document**: a structured explanation of:
     - key feedback themes
     - what changed from V1 → V2
     - what the system learned / should do differently next time (i.e., updated approach)

### Outputs Produced

- **V1 artifact** (what the SME reviewed)
- **SME review package**
  - rating(s)
  - general comments
  - inline annotations
- **V2 artifact** (revised)
- **Review Summary (diff + rationale)**
  - “Top feedback points”
  - “Edits applied”
  - “What changed in approach vs V1”

---

## Architecture

```
Frontend (React + TypeScript + Tailwind)
    ↓
Backend API (FastAPI + Python)
    ↓
Data Layer (SQLite + Artifact storage)
```

> Note: The MVP can optionally call an LLM to synthesize feedback into edits and generate the summary document. Without an API key, the system can run in a mocked / deterministic mode to validate the workflow.

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- (Optional) Anthropic API key for AI synthesis features

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (optional - for AI features)
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend runs on http://localhost:3000 and proxies API requests to the backend.

---

## Product Concept (How You Should Use It)

### 1) Submit / Generate V1

- Create or paste an artifact (e.g., a survey question set, an outreach email, a spec section)
- Generate V1 (optionally AI-assisted)

### 2) SME Review

- SME assigns a rating (e.g., 1–5)
- SME leaves overall feedback
- SME highlights text and leaves inline comments

### 3) Synthesis

- The platform consolidates and prioritizes feedback
- It translates feedback into a concrete revision plan

### 4) Outputs

- **V2**: revised artifact incorporating SME feedback
- **Summary doc**: a structured “review memo” describing:
  - what the SME said
  - what was changed and why
  - what should be done differently next time (updated approach)

---

## API Endpoints (Intended MVP Shape)

These are the conceptual endpoints the MVP should support.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/artifacts` | Create a new artifact (V1) |
| GET | `/api/artifacts` | List artifacts |
| GET | `/api/artifacts/{id}` | Get artifact details (V1/V2 + metadata) |
| POST | `/api/reviews` | Submit SME review (ratings + comments + inline annotations) |
| GET | `/api/reviews?artifact_id=...` | List reviews for an artifact |
| POST | `/api/synthesize/{artifact_id}` | Generate V2 + summary from SME feedback |
| GET | `/api/artifacts/{id}/v2` | Fetch revised artifact (V2) |
| GET | `/api/artifacts/{id}/summary` | Fetch feedback summary document |

> If the current implementation differs, that’s okay — the README is defining the *target behavior* for this repo’s MVP.

---

## Data Model (Conceptual)

- **Artifact**
  - `id`
  - `title`
  - `content_v1`
  - `content_v2` (nullable until synthesized)
  - `created_at`

- **Review (SME Submission)**
  - `id`
  - `artifact_id`
  - `overall_rating`
  - `overall_comment`
  - `inline_comments[]` (span ranges + comment + optional severity/category)
  - `created_at`

- **Synthesis Output**
  - `artifact_id`
  - `summary_markdown`
  - `changes_applied[]` (structured list of edits)
  - `created_at`

---

## Project Structure

```
/feedback
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── routers/
│   │   └── services/
│   ├── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   └── package.json
└── README.md
```

---

## Development Notes

### Running Without an API Key

The MVP should still be useful without an Anthropic API key:
- store artifacts
- collect SME ratings/comments
- run a mocked synthesis step that produces:
  - a deterministic “V2” (e.g., apply simple edit rules)
  - a templated summary document

### Enabling Real Synthesis

To enable AI-powered synthesis (revision + summary generation):

1. Get an API key from https://console.anthropic.com
2. Add to `backend/.env`:
   ```
   ANTHROPIC_API_KEY=your-key-here
   ```
3. Restart the backend server

---

## Example Scenario (Survey Draft)

1. Paste a **survey draft (V1)**.
2. SME rates it **2/5** and adds comments:
   - “Too leading”
   - “Double-barreled question”
   - “Needs clearer response options”
3. Click **Synthesize**.
4. Receive:
   - **V2** with rewritten, clearer, unbiased questions
   - **Summary doc** explaining each change, grouped by feedback theme, plus an updated approach for future drafts

---

## Goal of This Repo

Prove that we can reliably turn SME review inputs into:

- a revised output (V2), and
- an audit-friendly feedback summary documenting what changed and why.

That’s the MVP.