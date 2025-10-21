# GunsRemake-V2 — réplique locale de guns.lol

Ce projet fournit une réplique autonome du concept **guns.lol** : un site "link-in-bio" multi-utilisateurs où toutes les données sont stockées en fichiers locaux. Aucun SGBD n'est requis — les profils, la configuration et les assets sont conservés sur disque sous un répertoire configurable (`/data/guns` par défaut).

## Caractéristiques principales

- **Backend Node.js sans dépendances externes** : API REST servie par `node:http`, avec verrouillage de fichiers et écritures atomiques pour sécuriser les mises à jour concurrentes.
- **Stockage 100% fichiers** :
  - `users.json` gère l'authentification (mots de passe chiffrés avec `scrypt`).
  - Chaque profil public est un fichier `users/<username>.json`.
  - Les assets sont stockés dans `assets/<username>/` et servis directement.
  - Les badges, templates et sauvegardes sont également persistés en JSON ou ZIP.
- **Front-end statique inspiré de guns.lol** : une UI légère (Vanilla JS) livrée depuis `backend/public`, proposant démonstration, connexion et panneau d'administration simplifié.
- **Gestion des assets** : upload via JSON (contenu base64) avec validation des types MIME autorisés, taille max 100 Mo, respect du quota utilisateur et génération de dérivés (`.thumb`, `.web`).
- **Admin panel** : endpoints pour gérer badges, quotas utilisateurs, créer des sauvegardes ZIP et importer des templates.
- **Rate limiting & CORS** : protection intégrée contre l'abus avec un jeton en mémoire par IP.
- **Seed de démonstration** : script `npm run seed` qui crée 3 utilisateurs, 1 admin, badges et pages d'exemple (`swift`, `moh`, `hris`).
- **Docker & docker-compose** : exécution containerisée avec montage du dossier `/data/guns` pour la persistance.
- **Sauvegarde & restauration** : scripts shell `scripts/backup.sh` et `scripts/restore.sh` utilisant `zip`/`unzip`.

## Structure du dépôt

```
backend/
  public/               # UI statique (landing + panneau admin)
  src/
    config.js           # Gestion des chemins et création des dossiers
    index.js            # Serveur HTTP et routes
    lib/                # Router minimaliste, parsing JSON, réponses HTTP
    middleware/         # Rate limiting, auth JWT maison
    routes/             # Auth, utilisateurs, assets, badges, templates, backup
    services/           # Gestion des utilisateurs, pages, badges, assets
    scripts/lint.js     # Vérification rapide de la présence du dossier data
  package.json
scripts/
  backup.sh             # Sauvegarde ZIP de /data/guns
  restore.sh            # Restauration d’une archive ZIP
Dockerfile
docker-compose.yml
README.md
```

La donnée persistée est attendue dans `data/guns` (répertoire versionné vide, cf. `.gitkeep`). Vous pouvez modifier l’emplacement via la variable d’environnement `GUNS_DATA_DIR`.

## Prérequis

- Node.js ≥ 18 (Node 22 conseillé).
- `zip` et `unzip` pour les opérations de backup.
- (Optionnel) Docker / Docker Compose.

## Installation & exécution locale

1. **Installer les dépendances** : aucun `npm install` n’est requis, le backend n’utilise que l’API standard Node.js.
2. **Seed de démonstration** :
   ```bash
   cd backend
   npm run seed
   ```
   Les fichiers nécessaires seront créés sous `../data/guns`.
3. **Lancer l’API + front** :
   ```bash
   npm start
   ```
   Le serveur écoute sur `http://localhost:3001`. L’UI statique est accessible à la racine (`/`).
4. **Comptes de test** :
   - Utilisateurs : `swift/swiftpass`, `moh/mohpass`, `hris/hrispass`
   - Admin : `admin/adminpass`

### Via Docker Compose

```bash
docker compose up --build
```

Le service écoute sur `http://localhost:3001` et monte le volume `./data/guns` dans le container.

## Endpoints principaux

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/auth/register` | Création de compte (stocké dans `users.json`). |
| `POST` | `/api/auth/login` | Retourne un JWT HS256 interne. |
| `GET`  | `/api/auth/me` | Informations utilisateur authentifié. |
| `PUT`  | `/api/users/:username` | Mise à jour du profil (sections, liens, badges, etc.). |
| `POST` | `/api/users/:username/assets` | Upload d’asset base64 (types image/audio/vidéo). |
| `DELETE` | `/api/users/:username/assets/:filename` | Suppression d’un asset. |
| `GET` | `/api/badges` | Lecture des badges disponibles. |
| `POST/PATCH/DELETE` | `/api/badges` | Gestion des badges (admin). |
| `GET` | `/api/admin/users` | Liste complète des comptes (admin). |
| `PATCH` | `/api/admin/users/:username` | Ajustement quotas/roles (admin). |
| `POST` | `/api/admin/backup` | Génère un ZIP de `/data/guns/backups`. |
| `GET` | `/api/templates` | Liste les templates (`templates/*.json`). |
| `POST` | `/api/templates` | Import manuel d’un template (admin). |

> **Upload d’assets** : envoyer un JSON `{"type":"image","filename":"banner.png","mimeType":"image/png","base64Content":"..."}`.
> Le serveur valide le MIME, limite la taille à 100 Mo par fichier, vérifie le quota utilisateur, enregistre l’original + dérivés `.thumb` / `.web` et met à jour l’usage disque.

## Notes techniques

- **Concurrence d’écriture** : chaque fichier JSON est verrouillé via un fichier `.lock` et écrit dans un fichier temporaire avant renommage.
- **Sécurité des mots de passe** : hashés avec `crypto.scrypt` + salt aléatoire.
- **JWT** : implémentation maison HS256, clé persistée dans `/.sessions/secret.json`.
- **Rate limiting** : mémoire (120 requêtes/minute/IP) configurable dans `src/index.js`.
- **Thumbnails/versions web** : pour limiter la taille, des fichiers dérivés sont générés (`.thumb` tronqué à 32 KiB, `.web` copie compressée) — remplaçables par un pipeline plus évolué si nécessaire.
- **Statique** : `/assets/<username>/` est servi directement, le front-end est disponible dans `backend/public`.
- **Backup/restore** : scripts shell + endpoint admin pour créer des archives. La restauration se fait via `scripts/restore.sh` ou manuellement.

## Tests & vérifications

- `npm run lint` : vérifie la présence du dossier data.
- `npm run seed` : génère les données de démo.

## OAuth Discord (esquisse)

Le projet ne dépend pas d’une base de données. Pour ajouter OAuth Discord :
- Créer un endpoint `/api/auth/discord` qui initie l’autorisation (state stocké dans un fichier temporaire chiffré ou en mémoire).
- À la redirection, échanger le code contre un token Discord, créer/associer un compte dans `users.json` et conserver le token seulement en mémoire ou fichier chiffré à durée de vie courte.

## Roadmap suggérée

- Remplacer les dérivés d’assets par de la vraie compression (ffmpeg/ImageMagick).
- Ajouter un watcher pour recharger automatiquement les pages sur modifications de fichiers.
- Implémenter une vraie bibliothèque front-end (React/Vite) si l’accès à npm est disponible.
- Ajouter des tests automatisés (integration + e2e) une fois un runner configuré.

## Licence

Projet fourni sans licence explicite — adaptez selon vos besoins.
