import type { Application } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

export default function setupSwagger(app: Application, port: number | string) {
  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Backend API",
        version: "1.0.0",
        description: "API documentation",
      },
      servers: [{ url: `http://localhost:${port}` }],
      tags: [
        {
          name: "ExternalAuth",
          description:
            "Firebase Authentication (servicio externo). Estos endpoints no pertenecen a este backend; documentan el flujo real usado por el frontend.",
        },
        {
          name: "ExternalFirestore",
          description:
            "Firestore (servicio externo). Documenta como el frontend lee/escribe usuarios en la coleccion users.",
        },
      ],
      components: {
        schemas: {
          FirebaseUser: {
            type: "object",
            properties: {
              uid: { type: "string", example: "uid_123" },
              email: { type: "string", example: "user@example.com" },
              displayName: { type: "string", example: "Juan Perez" },
              emailVerified: { type: "boolean", example: true },
              providerId: { type: "string", example: "password" },
            },
          },
          FirebaseLoginRequest: {
            type: "object",
            required: ["email", "password"],
            properties: {
              email: { type: "string", example: "user@example.com" },
              password: { type: "string", example: "secret123" },
            },
          },
          FirebaseRegisterRequest: {
            type: "object",
            required: ["email", "password", "name"],
            properties: {
              email: { type: "string", example: "user@example.com" },
              password: { type: "string", example: "secret123" },
              name: { type: "string", example: "Juan Perez" },
            },
          },
          FirebaseForgotPasswordRequest: {
            type: "object",
            required: ["email"],
            properties: {
              email: { type: "string", example: "user@example.com" },
            },
          },
          FirebaseAuthResponse: {
            type: "object",
            properties: {
              user: { $ref: "#/components/schemas/FirebaseUser" },
              idToken: { type: "string", example: "firebase_id_token" },
              refreshToken: {
                type: "string",
                example: "firebase_refresh_token",
              },
            },
          },
          FirebaseGoogleLoginRequest: {
            type: "object",
            properties: {
              provider: { type: "string", example: "google" },
            },
          },
          FirebaseSessionResponse: {
            type: "object",
            properties: {
              authenticated: { type: "boolean", example: true },
              user: { $ref: "#/components/schemas/FirebaseUser" },
            },
          },
          FirestoreUser: {
            type: "object",
            properties: {
              uid: { type: "string", example: "uid_123" },
              name: { type: "string", example: "Juan Perez" },
              email: { type: "string", example: "user@example.com" },
              username: { type: "string", example: "juanp" },
              originalUsername: { type: "string", example: "JuanP" },
              role: { type: "string", example: "student" },
              provider: { type: "string", example: "email" },
              createdAt: { type: "string", format: "date-time" },
              lastLogin: { type: "string", format: "date-time" },
            },
          },
          FirestoreUsernameCheckRequest: {
            type: "object",
            required: ["username"],
            properties: {
              username: { type: "string", example: "juanp" },
            },
          },
          FirestoreUsernameUpdateRequest: {
            type: "object",
            required: ["username"],
            properties: {
              username: { type: "string", example: "juanp" },
            },
          },
        },
      },
      paths: {
        "/auth/login": {
          post: {
            tags: ["ExternalAuth"],
            summary: "Login via Firebase Authentication (servicio externo)",
            description:
              "El frontend usa Firebase SDK: signInWithEmailAndPassword(auth, email, password). Este endpoint es solo documental.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/FirebaseLoginRequest",
                  },
                },
              },
            },
            responses: {
              "200": {
                description:
                  "Autenticacion exitosa (respuesta del SDK de Firebase)",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/FirebaseAuthResponse",
                    },
                  },
                },
              },
              "401": {
                description: "Credenciales invalidas (Firebase Auth error)",
              },
            },
          },
        },
        "/auth/register": {
          post: {
            tags: ["ExternalAuth"],
            summary: "Registro via Firebase Authentication (servicio externo)",
            description:
              "El frontend usa Firebase SDK: createUserWithEmailAndPassword(auth, email, password) y luego guarda el perfil en Firestore.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/FirebaseRegisterRequest",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Registro exitoso (respuesta del SDK de Firebase)",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/FirebaseAuthResponse",
                    },
                  },
                },
              },
              "400": {
                description:
                  "Parametros invalidos o cuenta ya existente (Firebase Auth error)",
              },
            },
          },
        },
        "/auth/forgot-password": {
          post: {
            tags: ["ExternalAuth"],
            summary:
              "Recuperacion de password via Firebase Authentication (servicio externo)",
            description:
              "El frontend usa Firebase SDK: sendPasswordResetEmail(auth, email).",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/FirebaseForgotPasswordRequest",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Correo de recuperacion enviado (Firebase Auth)",
              },
              "400": {
                description:
                  "Email invalido o usuario no existe (Firebase Auth)",
              },
            },
          },
        },
        "/auth/google": {
          post: {
            tags: ["ExternalAuth"],
            summary: "Login con Google via Firebase (servicio externo)",
            description:
              "El frontend usa Firebase SDK: signInWithPopup(auth, new GoogleAuthProvider()).",
            requestBody: {
              required: false,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/FirebaseGoogleLoginRequest",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Autenticacion exitosa (Firebase Auth)",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/FirebaseAuthResponse",
                    },
                  },
                },
              },
              "401": {
                description: "Error al autenticar con Google (Firebase Auth)",
              },
            },
          },
        },
        "/auth/logout": {
          post: {
            tags: ["ExternalAuth"],
            summary: "Cerrar sesion via Firebase (servicio externo)",
            description: "El frontend usa Firebase SDK: signOut(auth).",
            responses: {
              "200": { description: "Sesion cerrada" },
            },
          },
        },
        "/auth/session": {
          get: {
            tags: ["ExternalAuth"],
            summary: "Estado de sesion via Firebase (servicio externo)",
            description:
              "El frontend escucha onAuthStateChanged(auth, callback) para conocer el estado de autenticacion.",
            responses: {
              "200": {
                description: "Estado de sesion",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/FirebaseSessionResponse",
                    },
                  },
                },
              },
            },
          },
        },
        "/users": {
          get: {
            tags: ["ExternalFirestore"],
            summary: "Consulta usuarios en Firestore (servicio externo)",
            description:
              "El frontend consulta la coleccion users en Firestore para leer perfiles y validar usernames.",
            responses: {
              "200": {
                description: "Lista de usuarios",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: { $ref: "#/components/schemas/FirestoreUser" },
                    },
                  },
                },
              },
            },
          },
        },
        "/users/{uid}": {
          get: {
            tags: ["ExternalFirestore"],
            summary: "Obtiene un usuario por uid (servicio externo)",
            parameters: [
              {
                name: "uid",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": {
                description: "Usuario encontrado",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/FirestoreUser" },
                  },
                },
              },
            },
          },
          patch: {
            tags: ["ExternalFirestore"],
            summary: "Actualiza username en Firestore (servicio externo)",
            description:
              "El frontend usa setDoc con merge para guardar username y originalUsername.",
            parameters: [
              {
                name: "uid",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/FirestoreUsernameUpdateRequest",
                  },
                },
              },
            },
            responses: {
              "200": { description: "Username actualizado" },
            },
          },
        },
        "/users/check-username": {
          post: {
            tags: ["ExternalFirestore"],
            summary: "Verifica disponibilidad de username (servicio externo)",
            description:
              "El frontend usa query sobre users donde username == lowerCaseUsername.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/FirestoreUsernameCheckRequest",
                  },
                },
              },
            },
            responses: {
              "200": {
                description: "Disponibilidad",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        available: { type: "boolean", example: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    apis: [],
  });

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
