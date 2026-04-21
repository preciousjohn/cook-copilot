# GenAI Food Fabrication (CookCopilot)

CookCopilot is an end-to-end **prompt-to-fabrication** system for food 3D printing.
Given a user prompt (e.g., target user, dietary constraints, shape), the system runs a structured pipeline:

1. **Dietitian Agent** → nutrition targets
2. **Chef Agent** → multi-syringe printable paste recipes
3. **Engineer (Compiler) Agent** → shape planning and executable **G-code** generation

This repository contains:

- `backend/` — FastAPI server, agents, and RAG (ChromaDB)
- `frontend/` — Next.js user interface

---

## Requirements

- Python 3.10 or higher
- Node.js 18 or higher
- OpenAI API key (Ask Suk Min Hwang, sukmin@berkeley.edu)
- USDA FDC API KEY (Go to https://fdc.nal.usda.gov/api-key-signup to get an api key & set in terminal)

## Setup & Run

#### Backend

```
cd backend
 
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### Frontend

```
cd frontend
npm install
npm run dev
```

### Usage

```
1. Open http://localhost:3000
2. Enter a prompt describing the desired food
(e.g., target user, shape, dietary constraints)
3. Click Run to execute the full pipeline
4. Download or copy the generated G-code for food 3D printing
```

## Notes

- The backend automatically indexes the Dietitian knowledge base into ChromaDB on startup.
- If RAG retrieval returns empty results, check that the knowledge base file exists and is indexed.
- If you encounter OpenAI authentication errors, verify that OPENAI_API_KEY is correctly set in backend/.env.

# GitHub Workflow Guide

Hey everyone! We're introducing **branch protection rules** on our repo starting now.
Please follow the guidelines below for all future work.

---

## 🚫 What's Changing

- **No more direct pushes to `main`**
- All code changes must go through a **Pull Request (PR)**
- Each PR requires **at least 1 reviewer approval** before merging

---

## 🌿 Branch Naming Convention

Use the format: **`yourname/short-description`**

```
mako/fix-gcode-template
```

- Lowercase, separate words with `-` (hyphens)
- Keep it short and descriptive

---

## 💬 Commit Message Convention

Start with a **present-tense verb**. Keep it simple and clear.

```
✅ Good
Add chef agent display page
Update API endpoint for nutrition data
Remove unused dependencies

❌ Bad
Added chef agent display page    ← past tense
adding stuff                     ← vague
fix                              ← too short
```

---

## 📋 Workflow (Step by Step)

```bash
# 1. Make sure your main is up to date
git checkout main
git pull origin main

# 2. Create a new branch
git checkout -b yourname/feature-description

# 3. Work, commit, and push
git add .
git commit -m "Add some feature"
git push origin yourname/feature-description

# 4. Open a PR on GitHub
#    → base: main ← compare: yourname/feature-description
#    → Assign a reviewer (Suk Min Hwang)
#    → Merge after getting approved!

# 5. Clean up after merge
git checkout main
git pull origin main
git branch -d yourname/feature-description
```

---
