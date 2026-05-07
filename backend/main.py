import os
import re
import json
import httpx
import logging
import time
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_stats():
    if not os.path.exists(STATS_FILE):
        return {}
    try:
        with open(STATS_FILE, "r") as f:
            return json.load(f)
    except:
        return {}

def save_stats(stats):
    try:
        with open(STATS_FILE, "w") as f:
            json.dump(stats, f, indent=2)
    except Exception as e:
        logger.warning(f"Could not save stats to {STATS_FILE}: {str(e)}")

def recalculate_ranks(stats: Dict[str, Any]) -> Dict[str, Any]:
    # Sort models by SPL (lower is better/faster)
    # Filter out models that haven't been run yet (though spl should be 0 if lines=0)
    sorted_models = sorted(
        [m for m in stats.keys() if stats[m].get("spl", 0) > 0],
        key=lambda x: stats[x]["spl"]
    )
    
    for i, model_name in enumerate(sorted_models):
        rank = i + 1
        stats[model_name]["rank"] = rank
        
        # Dynamically assign speed label based on relative rank
        if rank == 1:
            stats[model_name]["speed_label"] = "ultra-fast ⚡"
        elif rank == 2:
            stats[model_name]["speed_label"] = "fast 🚀"
        elif rank == 3:
            stats[model_name]["speed_label"] = "medium 🐢"
        else:
            stats[model_name]["speed_label"] = "slow 🐌"
    
    return stats

def update_model_stats(model, lines, seconds):
    stats = get_stats()
    m_stats = stats.get(model, {"total_lines": 0, "total_seconds": 0, "count": 0, "spl": 0})
    
    # Update totals
    m_stats["total_lines"] += lines
    m_stats["total_seconds"] += seconds
    m_stats["count"] += 1
    
    # Calculate Seconds Per Line (SPL)
    if m_stats["total_lines"] > 0:
        m_stats["spl"] = m_stats["total_seconds"] / m_stats["total_lines"]
    
    # Calculate Average Time Per Request
    if m_stats["count"] > 0:
        m_stats["avg_time_per_request"] = m_stats["total_seconds"] / m_stats["count"]
        m_stats["avg_time_minutes"] = m_stats["avg_time_per_request"] / 60
    
    stats[model] = m_stats
    
    # Recalculate ranks for all models
    stats = recalculate_ranks(stats)
    
    save_stats(stats)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("codescan-api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    logger.info("Starting CodeScan API...")
    stats = get_stats()
    if stats:
        for model in stats:
            m_stats = stats[model]
            # Ensure avg fields exist
            if m_stats.get("count", 0) > 0:
                m_stats["avg_time_per_request"] = m_stats["total_seconds"] / m_stats["count"]
                m_stats["avg_time_minutes"] = m_stats["avg_time_per_request"] / 60
        
        stats = recalculate_ranks(stats)
        save_stats(stats)
        logger.info("Stats recalculated on startup.")
    
    yield
    # Shutdown logic
    logger.info("Shutting down CodeScan API...")

app = FastAPI(
    title="CodeScan API",
    version="1.1.0",
    description="AI-powered code quality and effort analysis",
    lifespan=lifespan,
    root_path=os.getenv("ROOT_PATH", "")
)

# Configuration
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
ALLOW_GROQ = bool(GROQ_API_KEY)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
STATS_FILE = "stats.json"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_MAP = {
    "qwen2.5-coder": "qwen2.5-coder:7b",
    "deepseek-coder-v2": "deepseek-coder-v2:16b",
    "codellama": "codellama:7b-instruct",
    "deepseek-coder-latest": "deepseek-coder:latest",
    "groq-llama": "llama-3.3-70b-versatile",
}

ANALYSIS_PROMPT = """You are an expert code reviewer and software quality analyst. Analyze the following code and return a JSON response ONLY (no markdown, no explanation outside JSON).

Analyze across these dimensions:
1. Code Quality (readability, naming, structure)
2. Best Practices (patterns, SOLID principles, DRY)
3. Performance (efficiency, complexity, bottlenecks)
4. Security (vulnerabilities, input validation, exposure)
5. Maintainability (modularity, testability, documentation)
6. Developer Effort (complexity of implementation, thoughtfulness)

Return this exact JSON structure:
{{
  "language": "detected programming language",
  "overall_score": <integer 0-100>,
  "effort_score": <integer 0-100, how much effort/skill the developer put in>,
  "grade": "A/B/C/D/F",
  "summary": "2-3 sentence executive summary of the code",
  "dimensions": {{
    "quality": {{"score": <0-100>, "label": "Code Quality", "insight": "brief insight"}},
    "best_practices": {{"score": <0-100>, "label": "Best Practices", "insight": "brief insight"}},
    "performance": {{"score": <0-100>, "label": "Performance", "insight": "brief insight"}},
    "security": {{"score": <0-100>, "label": "Security", "insight": "brief insight"}},
    "maintainability": {{"score": <0-100>, "label": "Maintainability", "insight": "brief insight"}},
    "effort": {{"score": <0-100>, "label": "Developer Effort", "insight": "brief insight"}}
  }},
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": [
    {{
      "priority": "high/medium/low",
      "title": "improvement title",
      "description": "detailed description",
      "example": "optional code example or null"
    }}
  ],
  "complexity_metrics": {{
    "lines_of_code": <estimated integer>,
    "cyclomatic_complexity": "low/medium/high",
    "cognitive_load": "low/medium/high"
  }},
  "developer_profile": {{
    "level": "Junior/Mid-Level/Senior/Expert",
    "traits": ["trait1", "trait2", "trait3"],
    "effort_summary": "2 sentence assessment of the developer's effort and skill level"
  }}
}}

Code to analyze:
```
{code}
```"""

class AnalyzeRequest(BaseModel):
    code: str
    model: str = "auto"
    filename: Optional[str] = None

async def call_ollama(model: str, prompt: str) -> str:
    actual_model = MODEL_MAP.get(model, model)
    logger.info(f"Calling Ollama with model: {actual_model}")
    
    try:
        # Increase timeout significantly for CPU inference (no GPU)
        async with httpx.AsyncClient(timeout=900.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": actual_model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                },
            )
            
            if response.status_code != 200:
                logger.error(f"Ollama error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=502,
                    detail=f"Ollama returned {response.status_code}: {response.text}"
                )
                
            data = response.json()
            return data.get("response", "")
    except httpx.ConnectError:
        logger.error("Could not connect to Ollama. Is it running?")
        raise HTTPException(
            status_code=503, 
            detail=(
                "Ollama is not installed or running. To use local models, install Ollama from ollama.com "
                "and run 'ollama run qwen2.5-coder' or 'ollama run deepseek-coder-v2' in your terminal. "
                "Alternatively, select 'Groq Cloud' for instant analysis without any local setup."
            )
        )
    except httpx.TimeoutException:
        logger.error(f"Ollama request timed out after 900s for model {actual_model}")
        raise HTTPException(status_code=504, detail="AI engine timed out. CPU-only inference can be very slow. Try a smaller model like Llama 3.2 or Qwen 7B.")
    except Exception as e:
        logger.error(f"Unexpected error calling Ollama ({type(e).__name__}): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal AI engine error: {type(e).__name__}")

async def call_groq(model: str, prompt: str) -> str:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=400, detail="Groq API key not configured in .env")
        
    actual_model = MODEL_MAP.get(model, model)
    logger.info(f"Calling Groq Cloud with model: {actual_model}")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": actual_model,
                    "messages": [
                        {"role": "system", "content": "You are a professional code analyzer. Respond ONLY in valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2,
                },
            )
            
            if response.status_code != 200:
                logger.error(f"Groq error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=502, detail=f"Groq API error: {response.status_code}")
                
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"Unexpected error calling Groq: {str(e)}")
        raise HTTPException(status_code=500, detail="Groq cloud engine error")

def extract_code_from_ipynb(content: str) -> str:
    """Extract code from Jupyter Notebook JSON content."""
    try:
        nb = json.loads(content)
        code_cells = []
        for cell in nb.get("cells", []):
            if cell.get("cell_type") == "code":
                source = cell.get("source", [])
                if isinstance(source, list):
                    code_cells.append("".join(source))
                else:
                    code_cells.append(str(source))
        return "\n\n".join(code_cells)
    except Exception as e:
        logger.warning(f"Failed to parse as notebook: {str(e)}")
        return content # Fallback to raw content

def extract_json(text: str) -> Dict[str, Any]:
    text = text.strip()
    
    # Strategy 1: Direct parse
    try:
        return json.loads(text)
    except: pass
    
    # Strategy 2: Markdown block
    match = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except: pass
        
    # Strategy 3: Find first { and last }
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1:
        try:
            return json.loads(text[start:end+1])
        except: pass
        
    logger.error(f"Failed to parse JSON from: {text[:500]}...")
    raise ValueError("Could not extract valid JSON from model response")

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.1.0"}

@app.get("/stats")
async def stats():
    return get_stats()

@app.get("/ollama/status")
async def ollama_status():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{OLLAMA_URL}/api/tags")
            if r.status_code == 200:
                data = r.json()
                models = [m["name"] for m in data.get("models", [])]
                return {"available": True, "models": models}
    except Exception as e:
        logger.warning(f"Ollama status check failed: {str(e)}")
        
    return {"available": False, "models": []}

@app.post("/estimate")
async def estimate_time(request: AnalyzeRequest):
    code = request.code
    model = request.model
    
    lines = len(code.split("\n"))
    stats = get_stats()
    m_stats = stats.get(model)
    
    if not m_stats or m_stats.get("spl", 0) == 0:
        return {
            "estimated_seconds": None,
            "message": "No historical data for this model yet. Fallback to default estimate.",
            "fallback": True
        }
    
    spl = m_stats["spl"]
    estimated_seconds = round(lines * spl, 2)
    
    return {
        "estimated_seconds": estimated_seconds,
        "lines": lines,
        "spl": spl,
        "speed_label": m_stats.get("speed_label", "unknown"),
        "rank": m_stats.get("rank", "N/A")
    }

@app.post("/analyze")
async def analyze_code(request: AnalyzeRequest):
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")

    logger.info(f"Analyzing code. Filename: {request.filename or 'Snippet'}, Model: {request.model}")
    
    start_time = time.time()
    code_to_analyze = request.code
    
    # If it looks like a notebook, try to extract code
    if request.filename and request.filename.endswith(".ipynb") or code_to_analyze.strip().startswith("{"):
        code_to_analyze = extract_code_from_ipynb(code_to_analyze)

    # Cap code at 10k chars to avoid token limits on smaller models
    code_snippet = code_to_analyze[:10000]
    prompt = ANALYSIS_PROMPT.format(code=code_snippet)

    if request.model == "groq-llama":
        raw = await call_groq(request.model, prompt)
    else:
        raw = await call_ollama(request.model, prompt)

    execution_time = round(time.time() - start_time, 2)

    try:
        result = extract_json(raw)
    except ValueError as e:
        logger.error(f"JSON extraction failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to parse model response. Please try again or with a different model."
        )

    result["filename"] = request.filename
    result["model_used"] = MODEL_MAP.get(request.model, request.model)
    result["execution_time"] = execution_time
    
    # Include estimate in response for verification
    stats = get_stats()
    m_stats = stats.get(request.model)
    if m_stats and m_stats.get("spl", 0) > 0:
        lines_count = len(code_snippet.split("\n"))
        result["estimated_time"] = round(lines_count * m_stats["spl"], 2)
    else:
        result["estimated_time"] = None
    
    # Update persistent stats based on actual lines and time
    complexity = result.get("complexity_metrics")
    if isinstance(complexity, dict):
        lines = complexity.get("lines_of_code") or len(code_snippet.split("\n"))
    else:
        lines = len(code_snippet.split("\n"))
        
    try:
        lines = int(lines)
    except (ValueError, TypeError):
        lines = len(code_snippet.split("\n"))
        
    update_model_stats(request.model, lines, execution_time)
    
    logger.info(f"Analysis complete for {request.filename or 'Snippet'}. Score: {result.get('overall_score')}, Time: {execution_time}s")
    return result

@app.post("/analyze/upload")
async def analyze_upload(
    file: UploadFile = File(...),
    model: str = "auto"
):
    content = await file.read()
    try:
        code = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be a text/code file (UTF-8)")

    if len(code) > 100000:
        raise HTTPException(status_code=400, detail="File too large (max 100KB)")

    req = AnalyzeRequest(code=code, model=model, filename=file.filename)
    return await analyze_code(req)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)