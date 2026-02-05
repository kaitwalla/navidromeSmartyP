.PHONY: build dev clean test frontend-build ensure-dist

# Build the single executable with embedded frontend
build: frontend-build
	go build -o smartyp

# Build the frontend (Vite production build)
frontend-build:
	cd frontend && npm install && npm run build

# Print instructions for running frontend + backend separately during development
dev:
	@echo "Run these in separate terminals:"
	@echo "  Backend:  CORS_ALLOWED_ORIGINS=http://localhost:5173 go run main.go"
	@echo "  Frontend: cd frontend && npm install && npm run dev"

# Run Go tests (creates placeholder dist if needed for embed to compile)
test: ensure-dist
	go test -v

# Ensure frontend/dist exists so go:embed compiles even without a real build
ensure-dist:
	@mkdir -p frontend/dist
	@[ -f frontend/dist/index.html ] || echo '<!doctype html><html><body>placeholder</body></html>' > frontend/dist/index.html

# Remove build artifacts
clean:
	rm -f smartyp
	rm -rf frontend/dist
	rm -rf frontend/node_modules
