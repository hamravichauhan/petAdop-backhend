import { Router } from "express";
import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import petsRoutes from "./pets.routes.js";
import adoptionsRoutes from "./adoptions.routes.js";
// import chatRoutes from "./chat.routes.js"; // <-- add this
import passwordRoutes from "./password.routes.js"; 
const router = Router();

router.get("/", (_req, res) => res.json({ ok: true, where: "api-index" }));

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/pets", petsRoutes);
router.use("/adoptions", adoptionsRoutes);
router.use("/auth/password", passwordRoutes); 
// router.use("/chat", chatRoutes);     // <-- mount here

export default router;
