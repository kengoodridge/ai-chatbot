# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=22.14.0
ARG PNPM_VERSION=10.5.2

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-slim as base

# Set working directory for all build stages.
WORKDIR /usr/src/app

# Install pnpm and necessary packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    python3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@${PNPM_VERSION}

################################################################################
# Create a stage for installing production dependecies.
FROM base as deps

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.local/share/pnpm/store to speed up subsequent builds.
# Leverage bind mounts to package.json and pnpm-lock.yaml to avoid having to copy them
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

################################################################################
# Create a stage for building the application.
FROM deps as build

# Download additional development dependencies before building, as some projects require
# "devDependencies" to be installed to build. If you don't need this, remove this step.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy the rest of the source files into the image.
COPY . .
# Make sure we have the production env file
COPY .env.production .env.production
# Create directory for migrations
RUN mkdir -p lib/db/migrations-sqlite
RUN mkdir -p .next

# Skip database migration during build
ENV SKIP_DB_MIGRATE=true

# Run the build script with modified next build command - skip type checking
RUN pnpm next build --no-lint

################################################################################
# Create a new stage to run the application with minimal runtime dependencies
# where the necessary files are copied from the build stage.
FROM base as final

# Enable development mode to see detailed error messages
ENV NODE_ENV development

# Create directories with proper permissions
RUN mkdir -p /usr/src/app/data /usr/src/app/.next && \
    chown -R node:node /usr/src/app/data /usr/src/app/.next && \
    chmod 755 /usr/src/app/data

# Copy the entrypoint script (should already be executable)
COPY docker-entrypoint.sh /usr/local/bin/

# Run the application as a non-root user.
USER node

# Copy package.json so that package manager commands can be used.
COPY package.json .

# Copy both production and development dependencies + built application
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/.next ./.next
COPY --from=build /usr/src/app/public ./public
COPY --from=build /usr/src/app/lib ./lib
COPY --from=build /usr/src/app/.env.production ./.env.production


# Expose the port that the application listens on.
EXPOSE 5555

# Set environment variables for the application
ENV DATABASE_URL="file:/usr/src/app/data/local.db"
ENV NEXTAUTH_URL="http://localhost:5555" 
ENV NEXTAUTH_SECRET="ThisIsASecretValueForNextAuthReplaceInProduction"
ENV NEXTAUTH_TRUST_HOST="true"
ENV AUTH_TRUST_HOST="true"
ENV NEXT_TELEMETRY_DISABLED=1
ENV DEBUG="*"
ENV PYTHONUNBUFFERED=1
ENV PYTHONIOENCODING=UTF-8
CMD ["docker-entrypoint.sh"]
