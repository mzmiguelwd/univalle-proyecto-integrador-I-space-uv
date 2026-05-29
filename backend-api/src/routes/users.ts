import { Router } from "express";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - id
 *         - email
 *         - username
 *       properties:
 *         id:
 *           type: string
 *           example: "uid_12345"
 *         email:
 *           type: string
 *           format: email
 *           example: "usuario@correo.com"
 *         username:
 *           type: string
 *           example: "space_uv"
 *         role:
 *           type: string
 *           example: "student"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-05-28T12:00:00.000Z"
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Listar usuarios
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/User"
 */
router.get("/", (_req, res) => {
  return res.status(200).json([
    {
      id: "uid_12345",
      email: "usuario@correo.com",
      username: "space_uv",
      role: "student",
      createdAt: new Date().toISOString(),
    },
  ]);
});

export default router;
