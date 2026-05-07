# =============================================================================
# CodeScan — AI Code Analyzer
# Next.js Frontend + FastAPI Backend + Ollama
# =============================================================================

.PHONY: help install install-backend install-frontend install-ollama \
        dev dev-backend dev-frontend \
        build start stop restart \
        pull-models check-ollama \
        clean clean-backend clean-frontend \
        lint format

# ── Config ────────────────────────────────────────────────────────────────────
SHELL         := /bin/bash
BACKEND_DIR   := backend
FRONTEND_DIR  := frontend
VENV_DIR      := $(BACKEND_DIR)/.venv
PYTHON        := python3
PIP           := $(VENV_DIR)/bin/pip
UVICORN       := $(VENV_DIR)/bin/uvicorn
BACKEND_PORT  := 8000
FRONTEND_PORT := 3000
OLLAMA_MODELS := qwen2.5-coder llama3.2 deepseek-coder

# Colors
CYAN  := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED   := \033[0;31m
RESET := \033[0m
BOLD  := \033[1m

# ── Default target ─────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "$(BOLD)$(CYAN)  ⟨/⟩ CodeScan — AI Code Analyzer$(RESET)"
	@echo "$(CYAN)  ─────────────────────────────────$(RESET)"
	@echo ""
	@echo "$(BOLD)  Setup$(RESET)"
	@echo "  $(GREEN)make install$(RESET)          Install all dependencies (backend + frontend)"
	@echo "  $(GREEN)make install-ollama$(RESET)   Install Ollama CLI"
	@echo "  $(GREEN)make pull-models$(RESET)      Pull all required Ollama models"
	@echo ""
	@echo "$(BOLD)  Development$(RESET)"
	@echo "  $(GREEN)make dev$(RESET)              Start both services in split terminals"
	@echo "  $(GREEN)make dev-backend$(RESET)      Start FastAPI backend only (port $(BACKEND_PORT))"
	@echo "  $(GREEN)make dev-frontend$(RESET)     Start Next.js frontend only (port $(FRONTEND_PORT))"
	@echo ""
	@echo "$(BOLD)  Production$(RESET)"
	@echo "  $(GREEN)make build$(RESET)            Build Next.js for production"
	@echo "  $(GREEN)make start$(RESET)            Start both services in production mode"
	@echo "  $(GREEN)make stop$(RESET)             Stop all running services"
	@echo ""
	@echo "$(BOLD)  Utilities$(RESET)"
	@echo "  $(GREEN)make check-ollama$(RESET)     Verify Ollama is running + list models"
	@echo "  $(GREEN)make clean$(RESET)            Remove build artifacts and cache"
	@echo ""

# ── Installation ───────────────────────────────────────────────────────────
install: install-backend install-frontend
	@echo ""
	@echo "$(GREEN)$(BOLD)✓ All dependencies installed!$(RESET)"
	@echo "  Run $(CYAN)make dev$(RESET) to start development servers."
	@echo "  Run $(CYAN)make pull-models$(RESET) to download Ollama models."
	@echo ""

install-backend:
	@echo "$(CYAN)→ Setting up Python virtual environment...$(RESET)"
	@$(PYTHON) -m venv $(VENV_DIR)
	@$(PIP) install --quiet --upgrade pip
	@$(PIP) install --quiet -r $(BACKEND_DIR)/requirements.txt
	@echo "$(GREEN)  ✓ Backend dependencies installed$(RESET)"

install-frontend:
	@echo "$(CYAN)→ Installing Node.js dependencies...$(RESET)"
	@cd $(FRONTEND_DIR) && npm install --silent
	@echo "$(GREEN)  ✓ Frontend dependencies installed$(RESET)"

install-ollama:
	@echo "$(CYAN)→ Installing Ollama...$(RESET)"
	@if command -v ollama &> /dev/null; then \
		echo "$(YELLOW)  ⚠ Ollama already installed: $$(ollama --version)$(RESET)"; \
	else \
		curl -fsSL https://ollama.ai/install.sh | sh; \
		echo "$(GREEN)  ✓ Ollama installed$(RESET)"; \
	fi

# ── Model Management ───────────────────────────────────────────────────────
pull-models: check-ollama-running
	@echo "$(CYAN)→ Pulling Ollama models...$(RESET)"
	@echo "  $(YELLOW)This may take a while depending on your connection.$(RESET)"
	@for model in $(OLLAMA_MODELS); do \
		echo "$(CYAN)  Pulling $$model...$(RESET)"; \
		ollama pull $$model && echo "$(GREEN)  ✓ $$model ready$(RESET)" || echo "$(RED)  ✗ Failed to pull $$model$(RESET)"; \
	done

check-ollama:
	@echo "$(CYAN)→ Checking Ollama status...$(RESET)"
	@if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then \
		echo "$(GREEN)  ✓ Ollama is running$(RESET)"; \
		echo "$(CYAN)  Available models:$(RESET)"; \
		curl -sf http://localhost:11434/api/tags | $(PYTHON) -c "import sys,json; [print('    •', m['name']) for m in json.load(sys.stdin).get('models',[])]" 2>/dev/null || echo "    (none pulled yet)"; \
	else \
		echo "$(RED)  ✗ Ollama is not running$(RESET)"; \
		echo "  Start it with: $(CYAN)ollama serve$(RESET)"; \
	fi

check-ollama-running:
	@if ! curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then \
		echo "$(RED)Error: Ollama is not running.$(RESET)"; \
		echo "Start it first: $(CYAN)ollama serve$(RESET)"; \
		exit 1; \
	fi

# ── Development ────────────────────────────────────────────────────────────
dev:
	@echo "$(CYAN)$(BOLD)→ Starting CodeScan development servers...$(RESET)"
	@echo ""
	@echo "  $(GREEN)Frontend:$(RESET) http://localhost:$(FRONTEND_PORT)"
	@echo "  $(GREEN)Backend: $(RESET) http://localhost:$(BACKEND_PORT)"
	@echo "  $(GREEN)API Docs:$(RESET) http://localhost:$(BACKEND_PORT)/docs"
	@echo ""
	@echo "  $(YELLOW)Press Ctrl+C to stop all services$(RESET)"
	@echo ""
	@trap 'kill %1 %2 2>/dev/null; echo ""; echo "$(YELLOW)  Services stopped.$(RESET)"' INT; \
	$(UVICORN) $(BACKEND_DIR).main:app --reload --port $(BACKEND_PORT) --host 0.0.0.0 & \
	cd $(FRONTEND_DIR) && npm run dev -- --port $(FRONTEND_PORT) & \
	wait

dev-backend:
	@echo "$(CYAN)→ Starting FastAPI backend on port $(BACKEND_PORT)...$(RESET)"
	@$(UVICORN) $(BACKEND_DIR).main:app --reload --port $(BACKEND_PORT) --host 0.0.0.0

dev-frontend:
	@echo "$(CYAN)→ Starting Next.js frontend on port $(FRONTEND_PORT)...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run dev -- --port $(FRONTEND_PORT)

# ── Production ─────────────────────────────────────────────────────────────
build:
	@echo "$(CYAN)→ Building Next.js for production...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run build
	@echo "$(GREEN)  ✓ Build complete$(RESET)"

start: build
	@echo "$(CYAN)$(BOLD)→ Starting CodeScan in production mode...$(RESET)"
	@trap 'kill %1 %2 2>/dev/null' INT; \
	$(UVICORN) $(BACKEND_DIR).main:app --port $(BACKEND_PORT) --host 0.0.0.0 --workers 2 & \
	cd $(FRONTEND_DIR) && npm run start -- --port $(FRONTEND_PORT) & \
	wait

stop:
	@echo "$(CYAN)→ Stopping services...$(RESET)"
	@pkill -f "uvicorn backend.main" 2>/dev/null && echo "$(GREEN)  ✓ Backend stopped$(RESET)" || echo "  (backend was not running)"
	@pkill -f "next dev\|next start" 2>/dev/null && echo "$(GREEN)  ✓ Frontend stopped$(RESET)" || echo "  (frontend was not running)"

restart: stop
	@sleep 1
	@$(MAKE) dev

# ── Cleanup ────────────────────────────────────────────────────────────────
clean: clean-backend clean-frontend
	@echo "$(GREEN)  ✓ Clean complete$(RESET)"

clean-backend:
	@echo "$(CYAN)→ Cleaning backend...$(RESET)"
	@find $(BACKEND_DIR) -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@find $(BACKEND_DIR) -name "*.pyc" -delete 2>/dev/null || true

clean-frontend:
	@echo "$(CYAN)→ Cleaning frontend...$(RESET)"
	@rm -rf $(FRONTEND_DIR)/.next $(FRONTEND_DIR)/out

clean-all: clean
	@echo "$(CYAN)→ Removing node_modules and venv...$(RESET)"
	@rm -rf $(FRONTEND_DIR)/node_modules $(VENV_DIR)
	@echo "$(GREEN)  ✓ Full clean done$(RESET)"

# ── Lint / Format ──────────────────────────────────────────────────────────
lint:
	@echo "$(CYAN)→ Linting frontend...$(RESET)"
	@cd $(FRONTEND_DIR) && npm run lint

format:
	@echo "$(CYAN)→ Formatting backend with black...$(RESET)"
	@$(VENV_DIR)/bin/black $(BACKEND_DIR)/ 2>/dev/null || echo "  (pip install black to enable formatting)"