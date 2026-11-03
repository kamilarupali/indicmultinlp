#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=========================================="
echo "      IndicMultiNLP Research Platform     "
echo "=========================================="

# 1. Ensure Python virtual environment exists
if [ ! -d "backend/.venv" ]; then
    echo "Setting up Python virtual environment..."
    python3 -m venv backend/.venv
    ./backend/.venv/bin/pip install --upgrade pip
    ./backend/.venv/bin/pip install -r backend/requirements.txt
fi

# 2. Ensure frontend production bundle exists
if [ ! -f "frontend/dist/index.html" ]; then
    echo "Building production frontend bundle..."
    (cd frontend && npm run build)
fi

# 3. Handle dev vs standard single-command mode
if [ "$1" == "--dev" ]; then
    echo "Starting in full development mode (Vite dev server + FastAPI)..."
    ./backend/.venv/bin/uvicorn app.main:app --app-dir backend --port 8000 --reload &
    BACKEND_PID=$!
    
    cd frontend
    if command -v node >/dev/null 2>&1; then
        NODE_BIN="node"
    elif [ -f "$HOME/.local/bin/node" ]; then
        NODE_BIN="$HOME/.local/bin/node"
    else
        NODE_BIN="node"
    fi
    "$NODE_BIN" ./node_modules/vite/bin/vite.js --port 5173 &
    FRONTEND_PID=$!
    
    cleanup_dev() {
        echo ""
        echo "Shutting down development servers..."
        kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
        echo "Stopped."
        exit 0
    }
    trap cleanup_dev SIGINT SIGTERM EXIT
    wait
else
    echo "Starting IndicMultiNLP server on http://localhost:8000..."
    echo "Overview will open as the default landing page."
    echo "Press Control + C in this terminal anytime to stop the server."
    echo "---------------------------------------------------------"

    # Start the server process
    ./backend/.venv/bin/python backend/server.py 8000 &
    SERVER_PID=$!

    # Gracefully open browser to the Overview page once the server is listening
    (
        for i in {1..40}; do
            if curl -s http://localhost:8000/health >/dev/null 2>&1; then
                echo "✓ Server is active! Opening Overview (http://localhost:8000)..."
                open "http://localhost:8000" 2>/dev/null || true
                break
            fi
            sleep 0.25
        done
    ) &
    OPENER_PID=$!

    # Trap Control + C (SIGINT), SIGTERM, and EXIT for clean shutdown
    cleanup() {
        trap - EXIT SIGINT SIGTERM
        echo ""
        echo "Stopping IndicMultiNLP services cleanly..."
        kill "$OPENER_PID" 2>/dev/null || true
        if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
            kill -INT "$SERVER_PID" 2>/dev/null || true
            # Allow up to 2 seconds for graceful uvicorn shutdown
            for _ in {1..10}; do
                if ! kill -0 "$SERVER_PID" 2>/dev/null; then
                    break
                fi
                sleep 0.2
            done
            if kill -0 "$SERVER_PID" 2>/dev/null; then
                kill -TERM "$SERVER_PID" 2>/dev/null || true
            fi
            wait "$SERVER_PID" 2>/dev/null || true
        fi
        echo "IndicMultiNLP stopped cleanly."
        exit 0
    }
    trap cleanup EXIT SIGINT SIGTERM

    # Keep terminal open and attached to server
    wait "$SERVER_PID" 2>/dev/null || true
    cleanup
fi
 