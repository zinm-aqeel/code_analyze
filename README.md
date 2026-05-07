# CodeScan — AI Code Quality Analyzer

A premium full-stack application that analyzes code quality, effort, and provides actionable insights using local LLMs (via Ollama) or Cloud LLMs (via Groq).

## Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons, Axios.
- **Backend**: FastAPI, Pydantic, HTTPX.
- **AI Engine**: Ollama (Local) or Groq Cloud (Remote).

## Project Structure
```text
/
├── backend/            # FastAPI Backend
│   ├── main.py         # API Logic
│   └── requirements.txt # Python Dependencies
└── frontend/           # Next.js Frontend
    ├── src/app/        # App Router Pages
    ├── src/components/ # Extracted UI Components
    └── package.json    # Frontend Dependencies
```

## Local Setup

### 1. Prerequisites
- [Ollama](https://ollama.com/) installed and running.
- Pull the recommended models:
  ```bash
  ollama pull qwen2.5-coder
  ollama pull deepseek-coder-v2
  ```

### 2. Backend Setup
1. Navigate to `backend/`.
2. Create a `.env` file:
   ```env
   GROQ_API_KEY=your_key_here
   ALLOWED_ORIGINS=http://localhost:3000
   ```
3. Install dependencies: `pip install -r requirements.txt`
4. Run the server: `uvicorn main:app --reload` (Runs on `http://localhost:8000`)

### 3. Frontend Setup
1. Navigate to `frontend/`.
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev` (Runs on `http://localhost:3000`)

---

## Deployment Guide

### Deployment Overview
- **Frontend**: Best deployed on **Vercel**.
- **Backend**: Best deployed on **Railway**, **Render**, or **DigitalOcean**. 
  - *Note: Vercel is not recommended for the FastAPI backend as it requires a persistent server or specific serverless configuration.*

### 1. Backend Deployment (Railway/Render)
1. Push your code to GitHub.
2. Connect your repo to Railway or Render.
3. **Important Environment Variables**:
   - `GROQ_API_KEY`: Your Groq Cloud API Key.
   - `ALLOWED_ORIGINS`: Your frontend URL (e.g., `https://codescan.vercel.app`).
   - `OLLAMA_URL`: If you have a remote Ollama server, set it here.
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 2. Frontend Deployment (Vercel)
1. Connect your repo to Vercel.
2. Set the **Root Directory** to `frontend`.
3. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: Your deployed backend URL (e.g., `https://api-codescan.railway.app`).
4. Vercel will automatically build and deploy.

### 3. Usage Tips
- If Ollama is not installed on the server (common for cloud deployments), the app will automatically prompt users to use **Groq Cloud** or provide them with commands to set up Ollama locally.

## License
MIT
