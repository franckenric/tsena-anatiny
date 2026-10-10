# Image developpement du back-office Tsena Anatiny (serveur Vite)
# La source est montee en bind mount par docker-compose, cette image fournit
# les dependances (node_modules) via npm ci.
FROM node:22-alpine

WORKDIR /app

# Copie des fichiers de dependances (paquets utilises et lockfile)
COPY package.json package-lock.json ./
COPY vendor ./vendor
# npm install (et non npm ci) : le lockfile sert de contrainte mais tolere les
# ecarts de resolution lies a la plateforme (dependances optionnelles @emnapi/*).
RUN npm install --no-audit --no-fund

# Sources (android/ios/dist/node_modules sont exclus par .dockerignore)
COPY . .

# Port du serveur de developpement Vite (back-office)
EXPOSE 5175

CMD ["npm", "run", "dev"]