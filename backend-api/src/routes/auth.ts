import { Router } from "express";

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesion con email y password
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@correo.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "********"
 *     responses:
 *       200:
 *         description: Login correcto
 *       401:
 *         description: Usuario o contrasena incorrectos
 */
router.post("/login", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    message: "Login correcto",
  });
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - username
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@correo.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "********"
 *               username:
 *                 type: string
 *                 example: "space_uv"
 *     responses:
 *       201:
 *         description: Registro correcto
 *       409:
 *         description: Usuario ya existe
 */
router.post("/register", (_req, res) => {
  return res.status(201).json({
    status: "ok",
    message: "Registro correcto",
  });
});

export default router;
