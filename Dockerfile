# ==============================================================================
# STAGE 1: Base image setup with pnpm
# ==============================================================================
FROM node:22-alpine AS base

# Install libc6-compat for compatible native dependencies on alpine
RUN apk add --no-cache libc6-compat
# Enable corepack and activate pnpm to match local package manager
RUN corepack enable && corepack prepare pnpm@latest --activate

# ==============================================================================
# STAGE 2: Dependency installation
# ==============================================================================
FROM base AS deps

WORKDIR /app

# Copy dependency definition files first to leverage Docker layer caching
COPY package.json pnpm-lock.yaml* ./

# Install both production and devDependencies (required for compiling Next.js)
RUN pnpm install --frozen-lockfile --ignore-scripts

# ==============================================================================
# STAGE 3: Build application
# ==============================================================================
FROM base AS builder

WORKDIR /app

# Copy installed node_modules from dependency stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the entire workspace code
COPY . .

# --- Next.js Build-Time Arguments ---
# Next.js statically compiles NEXT_PUBLIC_* variables during 'build'.
# We declare these args so they can be injected during the docker build phase.
ARG NEXT_PUBLIC_LIVEKIT_URL
ARG NEXT_PUBLIC_APP_CONFIG
ENV NEXT_PUBLIC_LIVEKIT_URL=${NEXT_PUBLIC_LIVEKIT_URL}
ENV NEXT_PUBLIC_APP_CONFIG=${NEXT_PUBLIC_APP_CONFIG}

# Disable Next.js telemetry to speed up build and protect privacy
ENV NEXT_TELEMETRY_DISABLED=1

# Compile/build the Next.js production bundle (output: standalone)
RUN pnpm build

# ==============================================================================
# STAGE 4: Production runner
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Set node environment to production
ENV NODE_ENV=production
# Disable Next.js telemetry in production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a secure, non-root user/group to run the application
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets and public files needed in production
COPY --from=builder /app/public ./public

# Copy the standalone output bundle generated in the builder stage
# Standalone mode copies only the code and dependencies strictly required to run.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to the non-root user for security
USER nextjs

# Expose Next.js application port
EXPOSE 3000

# Set environment variables for the standalone Node.js server
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Execute Next.js standalone server
CMD ["node", "server.js"]
