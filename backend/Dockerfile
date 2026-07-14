FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY . .
# Normally we would use maven wrapper, but just in case we don't have it, we can use a maven image
# But let's assume we use maven image to build
# Actually, let's use maven image directly:
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
