import { Router } from "express";
import resourceRoute from "./resourceRoute.js";

const router = Router();

router.use("/resource", resourceRoute);

export default router;
