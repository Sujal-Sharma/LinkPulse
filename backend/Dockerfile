# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S linkpulse -u 1001

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY --chown=linkpulse:nodejs src/ ./src/
COPY --chown=linkpulse:nodejs package.json ./

# Create logs directory
RUN mkdir -p logs && chown linkpulse:nodejs logs

# Switch to non-root user
USER linkpulse

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "src/index.js"]
