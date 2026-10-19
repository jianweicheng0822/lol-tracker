# =============================================================
# Stage 1: Build the React frontend
# =============================================================
FROM node:26-alpine AS frontend-build

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
# Retry flaky downloads (and give up on stuck ones) instead of failing or hanging the whole deploy
ENV MAVEN_ARGS="-B -Daether.connector.http.retryHandler.count=5 -Daether.connector.connectTimeout=60000 -Daether.connector.requestTimeout=60000"

COPY backend/pom.xml ./
# Download dependencies AND every plugin the package phase needs into this cached layer.
# go-offline alone misses some plugin dependencies, so also package the (still empty) project;
# start-class gives Spring Boot's repackage a placeholder main class so it runs too.
RUN mvn dependency:go-offline \
 && mvn package -DskipTests -Dstart-class=placeholder.Main \
 && rm -rf target

COPY backend/src ./src

# Copy the frontend build into Spring Boot's static resources
# Spring Boot auto-serves anything in /static on the classpath
COPY --from=frontend-build /app/frontend/dist/ ./src/main/resources/static/

# Build the JAR offline: everything was fetched above, so a network blip can't break this step.
# (Tests are skipped here — they run in CI.)
RUN mvn -o package -DskipTests
# Output: /app/backend/target/backend-0.0.1-SNAPSHOT.jar

# =============================================================
# Stage 3: Minimal runtime image
# =============================================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Run as non-root user for security
RUN addgroup --system app && adduser --system --ingroup app app

# Copy the built JAR from stage 2
COPY --from=backend-build /app/backend/target/backend-0.0.1-SNAPSHOT.jar app.jar

RUN chown app:app app.jar
USER app

EXPOSE 8080

# Environment variables are injected at runtime via `docker run -e` or .env file
# RIOT_API_KEY and OPENAI_API_KEY must be set — they are NOT baked into the image
ENTRYPOINT ["java", "-jar", "app.jar"]
