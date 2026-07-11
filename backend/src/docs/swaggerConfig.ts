import type { Application } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

export default function setupSwagger(app: Application, port: number | string) {
  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: {
      title: "Space UV API",
      version: "1.0.0",
      description: `
    Documentación técnica del Salón de Estudio Colaborativo en Tiempo Real Space UV.

    La aplicación utiliza:

    - Firebase Authentication para el registro e inicio de sesión.
    - Firestore para usuarios, salas y mensajes.
    - Socket.IO para comunicación en tiempo real.
    - WebRTC para videollamadas, audio y compartir pantalla.

    Algunas operaciones descritas en esta documentación se ejecutan directamente desde el frontend mediante Firebase SDK y se incluyen como endpoints documentales para representar el funcionamiento real del sistema.
      `,
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: "Servidor local de desarrollo",
      },
    ],
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
        {
          name: "StudyRooms",
          description:
            "Operaciones realizadas desde el frontend sobre la colección rooms de Firestore: crear, consultar, listar, editar y finalizar salas de estudio.",
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
          StudyRoom: {
          type: "object",
          required: [
            "id",
            "title",
            "topic",
            "ownerId",
            "type",
            "limit",
            "privacy",
            "isActive",
          ],
          properties: {
            id: {
              type: "string",
              example: "9KmX4pQ2nLBv7sYt6WcD",
              description:
                "Identificador generado automáticamente por Firestore. También funciona como código de acceso a la sala.",
            },
            title: {
              type: "string",
              minLength: 3,
              maxLength: 80,
              example: "Preparación parcial de cálculo",
            },
            topic: {
              type: "string",
              minLength: 3,
              maxLength: 120,
              example: "Integrales y ecuaciones diferenciales",
            },
            ownerId: {
              type: "string",
              example: "firebase_uid_123",
              description: "UID del usuario creador de la sala.",
            },
            type: {
              type: "string",
              example: "study",
              description: "Tipo o modalidad de la sala.",
            },
            limit: {
              type: "integer",
              minimum: 1,
              example: 8,
              description: "Cantidad máxima de participantes.",
            },
            privacy: {
              type: "string",
              example: "private",
              description: "Nivel de privacidad configurado para la sala.",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2026-07-10T20:30:00.000Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2026-07-10T21:15:00.000Z",
            },
            isActive: {
              type: "boolean",
              example: true,
              description:
                "Indica si la sala continúa disponible para ser consultada e ingresada.",
            },
          },
        },

        CreateStudyRoomRequest: {
          type: "object",
          required: [
            "title",
            "topic",
            "ownerId",
            "type",
            "limit",
            "privacy",
          ],
          properties: {
            title: {
              type: "string",
              minLength: 3,
              maxLength: 80,
              example: "Preparación parcial de cálculo",
            },
            topic: {
              type: "string",
              minLength: 3,
              maxLength: 120,
              example: "Integrales y ecuaciones diferenciales",
            },
            ownerId: {
              type: "string",
              example: "firebase_uid_123",
            },
            type: {
              type: "string",
              example: "study",
            },
            limit: {
              type: "integer",
              minimum: 1,
              example: 8,
            },
            privacy: {
              type: "string",
              example: "private",
            },
          },
        },

        CreateStudyRoomResponse: {
          type: "object",
          properties: {
            roomId: {
              type: "string",
              example: "9KmX4pQ2nLBv7sYt6WcD",
              description:
                "ID generado por Firestore para la nueva sala de estudio.",
            },
          },
        },

        UpdateStudyRoomRequest: {
          type: "object",
          properties: {
            title: {
              type: "string",
              minLength: 3,
              maxLength: 80,
              example: "Preparación final de cálculo",
            },
            topic: {
              type: "string",
              minLength: 3,
              maxLength: 120,
              example: "Repaso general de integrales",
            },
            type: {
              type: "string",
              example: "study",
            },
            limit: {
              type: "integer",
              minimum: 1,
              example: 10,
            },
            privacy: {
              type: "string",
              example: "private",
            },
          },
        },

        RoomValidationError: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Error de validación en la sala de estudio.",
            },
            errors: {
              type: "object",
              additionalProperties: {
                type: "string",
              },
              example: {
                title: "El nombre de la sala debe tener al menos 3 caracteres.",
                topic: "El tema debe tener al menos 3 caracteres.",
              },
            },
          },
        },

        FirestoreError: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "No fue posible completar la operación en Firestore.",
            },
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
        "/rooms": {
          post: {
            tags: ["StudyRooms"],
            summary: "Crear una sala de estudio",
            description:
              "Documenta la creación de una sala mediante Firebase Firestore. El frontend ejecuta addDoc sobre la colección rooms, agrega createdAt con serverTimestamp e inicializa isActive en true.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CreateStudyRoomRequest",
                  },
                },
              },
            },
            responses: {
              "201": {
                description: "Sala creada correctamente",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/CreateStudyRoomResponse",
                    },
                  },
                },
              },
              "400": {
                description: "Los datos enviados no superaron la validación",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/RoomValidationError",
                    },
                  },
                },
              },
              "500": {
                description: "Error al crear la sala en Firestore",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/FirestoreError",
                    },
                  },
                },
              },
            },
          },

          get: {
            tags: ["StudyRooms"],
            summary: "Listar las salas propias del usuario",
            description:
              "Documenta la consulta de salas activas creadas por un usuario. El frontend filtra la colección rooms por ownerId e isActive igual a true, y ordena los resultados por createdAt de forma descendente.",
            parameters: [
              {
                name: "ownerId",
                in: "query",
                required: true,
                description:
                  "UID de Firebase del usuario propietario de las salas.",
                schema: {
                  type: "string",
                  example: "firebase_uid_123",
                },
              },
            ],
            responses: {
              "200": {
                description: "Lista de salas activas del usuario",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/StudyRoom",
                      },
                    },
                  },
                },
              },
              "400": {
                description: "No se proporcionó el identificador del propietario",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        message: {
                          type: "string",
                          example: "El parámetro ownerId es obligatorio.",
                        },
                      },
                    },
                  },
                },
              },
              "500": {
                description: "Error al consultar las salas en Firestore",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/FirestoreError",
                    },
                  },
                },
              },
            },
          },
        },
        "/rooms/{roomId}": {
          get: {
            tags: ["StudyRooms"],
            summary: "Consultar una sala por su código",
            description:
              "Documenta la búsqueda de una sala mediante su identificador de Firestore. El frontend utiliza getDoc para recuperar la información de la sala antes de permitir el ingreso.",

            parameters: [
              {
                name: "roomId",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
                example: "9KmX4pQ2nLBv7sYt6WcD",
              },
            ],

            responses: {
              "200": {
                description: "Sala encontrada",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/StudyRoom",
                    },
                  },
                },
              },

              "404": {
                description: "La sala no existe",
              },

              "500": {
                description: "Error consultando Firestore",
              },
            },
          },

          patch: {
            tags: ["StudyRooms"],
            summary: "Actualizar una sala",

            description:
              "Documenta la actualización parcial de una sala utilizando updateDoc sobre Firestore.",

            parameters: [
              {
                name: "roomId",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],

            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/UpdateStudyRoomRequest",
                  },
                },
              },
            },

            responses: {
              "200": {
                description: "Sala actualizada correctamente",
              },

              "400": {
                description: "Datos inválidos",
              },

              "404": {
                description: "Sala no encontrada",
              },
            },
          },

          delete: {
            tags: ["StudyRooms"],

            summary: "Finalizar una sala",

            description:
              "Documenta el cierre lógico de una sala estableciendo isActive=false.",

            parameters: [
              {
                name: "roomId",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],

            responses: {
              "204": {
                description: "Sala finalizada",
              },

              "404": {
                description: "Sala no encontrada",
              },
            },
          },
        },
      },
    },
    apis: [],
  });

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "Space UV | Documentación API",
      swaggerOptions: {
        docExpansion: "none",
        filter: true,
        displayRequestDuration: true,
        persistAuthorization: true,
        tryItOutEnabled: false,
      },
    }),
  );
}
