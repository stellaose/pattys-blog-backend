import { Router } from "express";
import authRoute from "./authRoute.js";

const router = Router();

router.use("/user", authRoute);

export default router;
