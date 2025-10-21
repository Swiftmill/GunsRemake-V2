# Frontend placeholder

Le front-end livré par défaut est une application statique (Vanilla JS) servie depuis `backend/public` pour éviter toute dépendance npm dans cet environnement sandboxé.

Si vous disposez d’un accès au registre npm, vous pouvez remplacer cette UI par un projet React (Vite ou Next.js) en pointant l’API vers `http://localhost:3001`. Suggestions :

1. `npm create vite@latest frontend -- --template react`.
2. Configurer un proxy Vite vers `http://localhost:3001` pour `/api`.
3. Reproduire les écrans (landing, dashboard, admin) en s’appuyant sur les endpoints décrits dans le README racine.

Ce dossier est laissé volontairement minimal pour accueillir cette implémentation ultérieure.
