import { Router } from "express";
import authRoute from "./authRoute.js";
import blogRoute from "./blogRoute.js";
import reviewRoute from "./reviewRoute.js";

const router = Router();

router.use("/auth", authRoute);
router.use("/blog", blogRoute);
router.use("/review", reviewRoute);

export default router;
