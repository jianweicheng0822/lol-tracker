# =============================================================
# Stage 1: Build the React frontend
# =============================================================
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
# Output: /app/frontend/dist/

# =============================================================
# Stage 2: Build the Spring Boot backend (with frontend baked in)
# =============================================================
FROM maven:3.9-eclipse-temurin-21 AS backend-build

WORKDIR /app/backend
COPY backend/pom.xml ./
# Download dependencies first (cached layer)
RUN mvn dependency:go-offline -B

COPY backend/src ./src

# Copy the frontend build into Spring Boot's static resources
# Spring Boot auto-serves anything in /static on the classpath
COPY --from=frontend-build /app/frontend/dist/ ./src/main/resources/static/

# Build the JAR (skip tests — they run in CI, not in Docker build)
RUN mvn package -DskipTests -B
# Output: /app/backend/target/backend-0.0.1-SNAPSHOT.jar

# =============================================================
# Stage 3: Minimal runtime image
# =============================================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the built JAR from stage 2
COPY --from=backend-build /app/backend/target/backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

# Environment variables are injected at runtime via `docker run -e` or .env file
# RIOT_API_KEY and OPENAI_API_KEY must be set — they are NOT baked into the image
ENTRYPOINT ["java", "-jar", "app.jar"]
