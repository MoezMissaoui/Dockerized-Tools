# Centrifugo (Admin Web intégrée)

Ce projet fournit une stack Docker minimale pour exécuter Centrifugo avec l’interface d’administration intégrée, sans service "Cento" séparé.

## Prérequis

- Docker et Docker Compose installés

## Configuration

Modifiez les valeurs sensibles dans le fichier `.env` avant le démarrage:

- `COMPOSE_PROJECT_NAME`: nom du projet Compose
- `CENTRIFUGO_PORT`: port hôte pour exposer Centrifugo (par défaut 3333)
- `CENTRIFUGO_HTTP_API_KEY`: clé pour appeler l’HTTP API de Centrifugo
- `CENTRIFUGO_ADMIN_PASSWORD`: mot de passe de l’interface admin
- `CENTRIFUGO_ADMIN_SECRET`: secret d’authentification admin

Le fichier de configuration serveur est <code>config.json</code> et lit ces valeurs via variables d’environnement.

## Démarrage

- Lancer la stack:
  - `docker compose up -d`

## Accès

- Interface d’administration: `http://localhost:3333`
- Identifiez-vous avec `CENTRIFUGO_ADMIN_PASSWORD`
- Santé du service: `http://localhost:3333/health`

## HTTP API (exemples)

- Obtenir les informations du cluster:
  - `curl -s -X POST http://localhost:3333/api/info -H "Content-Type: application/json" -H "X-API-Key: YOUR_SUPER_SECRET_API_KEY" -d "{}"`
- Publier un message dans un canal:
  - `curl -s -X POST http://localhost:3333/api/publish -H "Content-Type: application/json" -H "X-API-Key: YOUR_SUPER_SECRET_API_KEY" -d "{\"channel\":\"demo\",\"data\":{\"msg\":\"Hello\"}}"`

## Arrêt

- `docker compose down`

## Dépannage

- Conflit de port (Bind failed): modifiez `CENTRIFUGO_PORT` dans `.env` pour utiliser un port libre (ex. 3333, 8080, etc.), puis relancez `docker compose up -d`.
- Accès admin: assurez-vous d’avoir défini des secrets forts et de ne pas exposer l’interface admin à Internet sans protection.
