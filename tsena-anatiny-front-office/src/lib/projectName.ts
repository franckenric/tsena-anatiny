/**
 * Nom du projet, pilote par la variable d'environnement VITE_PROJECT_NAME.
 *
 * En docker, la valeur vient du fichier .env racine (docker-compose.yml) et
 * passe devant le .env local (Vite donne la priorite a process.env). En dev
 * local elle se regle dans le .env du projet.
 *
 * Partout ou cette constante est importee (header, footer, login, PWA, meta
 * tags, traductions...), changer VITE_PROJECT_NAME suffit a renommer
 * l'application.
 */
export const PROJECT_NAME: string =
  (import.meta.env.VITE_PROJECT_NAME as string | undefined)?.trim() ||
  "Tsena Anatiny";