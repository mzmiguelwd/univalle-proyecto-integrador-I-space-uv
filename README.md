# Space UV

Space UV es una plataforma web para estudio colaborativo en tiempo real, con salas de videollamada, chat, presencia de usuarios, compartir pantalla y autenticación mediante Firebase.

## Características principales

- Autenticación con Firebase Auth
- Perfiles de usuario y configuración inicial
- Salas de estudio en tiempo real
- Video/audio mediante WebRTC + PeerJS
- Comunicación en tiempo real con Socket.IO
- Documentación de API con Swagger
- Diseño adaptable para escritorio y dispositivos móviles

## Stack tecnológico

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express, TypeScript, Socket.IO, PeerJS
- Autenticación y base de datos: Firebase Auth + Firestore
- Documentación: Swagger UI

## Requisitos previos

Asegúrate de tener instalado:

- Node.js 20 o superior
- npm 10 o superior
- Un navegador moderno con permisos de cámara y micrófono

## Estructura del proyecto

```text
/
├── backend/          # Servidor Express + Socket.IO + PeerJS
├── frontend/         # Aplicación React + Vite
└── package.json      # Scripts globales para correr el proyecto
```

## Setup local

1. Clona el repositorio.
2. Instala las dependencias del proyecto principal:

```bash
npm install
```

3. Instala las dependencias del frontend y del backend:

```bash
npm install --prefix frontend
npm install --prefix backend
```

4. Crea los archivos de variables de entorno.

## Variables de entorno

### Backend (.env en /backend)

Crea un archivo llamado `.env` dentro de la carpeta `backend` con el siguiente contenido base:

```env
PORT=3000
CLIENT_URL=http://localhost:5173
```

Variables explicadas:

- `PORT`: puerto en el que correrá el servidor backend.
- `CLIENT_URL`: URL del frontend permitida para las solicitudes CORS.

### Frontend (.env o .env.local en /frontend)

Crea un archivo llamado `.env` dentro de la carpeta `frontend` con las siguientes variables:

```env
VITE_SOCKET_SERVER_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

Variables explicadas:

- `VITE_SOCKET_SERVER_URL`: URL del servidor Socket.IO/PeerJS.
- `VITE_FIREBASE_*`: credenciales de Firebase para autenticación y Firestore.

> Importante: para que Firebase funcione correctamente, debes crear un proyecto en Firebase Console y habilitar Authentication y Firestore.

## Ejecutar la aplicación localmente

### Opción 1: ejecutar todo desde la raíz

```bash
npm run dev
```

Este comando levanta simultáneamente:

- Frontend en `http://localhost:5173`
- Backend en `http://localhost:3000`

### Opción 2: ejecutar por separado

Backend:

```bash
npm run dev --prefix backend
```

Frontend:

```bash
npm run dev --prefix frontend
```

## Endpoints y recursos útiles

- Frontend: `http://localhost:5173`
- Healthcheck del backend: `http://localhost:3000/health`
- Documentación Swagger: `http://localhost:3000/api-docs`
- PeerJS: `http://localhost:3000/peerjs`

## Verificaciones recomendadas

Antes de entregar o probar el sistema, verifica lo siguiente:

- El backend responde en `/health`.
- El frontend carga correctamente con las variables de entorno definidas.
- Firebase autentica correctamente.
- Se permite el acceso a cámara y micrófono desde el navegador.
- La conexión WebRTC funciona entre dos navegadores o pestañas.

## Build para producción

Backend:

```bash
npm run build --prefix backend
```

Frontend:

```bash
npm run build --prefix frontend
```

## Notas de hardening

- No compartas claves ni secretos en el repositorio.
- Usa variables de entorno para configuraciones sensibles.
- En producción, configura `CLIENT_URL` con la URL real del frontend desplegado.
- Asegura que el frontend y backend usen protocolos HTTPS válidos en entornos de producción.
- Mantén actualizadas las dependencias del proyecto.
