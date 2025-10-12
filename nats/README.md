# NATS Docker Setup

This repository provides a simple Docker Compose setup for running a NATS server with customizable configuration, plus a lightweight Web UI to visualize subjects and messages.

## Prerequisites
- Docker
- Docker Compose

## Project Structure
- `docker-compose.yml` — Compose file that defines the NATS service and the Web UI component
- `nats.conf` — NATS server configuration (authentication, ports, JetStream, etc.)
- `.env` — Environment variables used by the Compose file (kept out of Git)
- `.gitignore` — Git ignore rules for local files

## Configuration
- Edit `nats.conf` to customize NATS server settings.
  - HTTP monitoring is enabled on port `8222`.
  - JetStream is enabled with data stored at `/data/jetstream`.
- Use `.env` to manage environment variables without changing the Compose file.
  - Example variables:
    - `NATS_CLIENT_PORT=4222`
    - `NATS_MONITORING_PORT=8222`
    - `SURVEYOR_PORT=7777` (used as the exposed port for the Web UI in this setup)

## Quick Start
1. Start the stack:
   - `docker-compose up -d --remove-orphans`
2. Check services:
   - `docker-compose ps`
3. View NATS monitoring endpoints:
   - `http://localhost:8222/varz`
   - `http://localhost:8222/connz`
4. Open the NATS Web UI dashboard:
   - `http://localhost:7777/`
5. Stop services:
   - `docker-compose down`

## Notes
- Ensure `.env` is present with required variables before running Compose.
- Do not commit secrets to version control; `.gitignore` already excludes `.env` by default.
- The Web UI container is mapped to `SURVEYOR_PORT` for convenience. If that port is in use, change it in `.env` and in `docker-compose.yml`.

## Useful Commands
- Recreate containers after config changes:
  - `docker-compose up -d --force-recreate`
- Remove containers and volumes:
  - `docker-compose down -v`

## Troubleshooting
- If NATS fails to start, review `nats.conf` for syntax errors and check container logs.
- If the Web UI fails to start due to port conflicts, use `--remove-orphans` or change `SURVEYOR_PORT`.
- Verify that required ports (4222, 8222, and the Web UI port) are not in use by other processes.