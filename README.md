# CodeScan — AI Code Quality Analyzer

A premium full-stack application that analyzes code quality, effort, and provides actionable insights using local LLMs (via Ollama).

## Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons, Axios.
- **Backend**: FastAPI, Pydantic, HTTPX.
- **AI Engine**: Ollama (Local LLMs like Qwen 2.5 Coder or Llama 3.2).

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

## Getting Started

### 1. Prerequisites
- [Ollama](https://ollama.com/) installed and running.
- Pull the recommended models:
  ```bash
  ollama pull qwen2.5-coder
  ollama pull llama3.2
  ```

### 2. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the server:
   ```bash
   uvicorn main:app --reload
   ```
   The backend will run on `http://localhost:8000`.

### 3. Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## Features
- **Effort Scoring**: Estimates how much thought and skill went into the code.
- **Quality Dimensions**: Breakdown of security, performance, maintainability, and best practices.
- **Actionable Insights**: High/Medium/Low priority suggestions with code examples.
- **File Upload**: Support for various programming languages via file upload or paste.
- **Local AI**: Privacy-focused analysis using your own hardware.

## License
MIT
