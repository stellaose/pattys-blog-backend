import { Router } from "express";
import authRoute from "./authRoute.js";
import blogRoute from './blogRoute.js'
import flaggedRoute from './flaggedRoute.js'

const router = Router();

router.use("/user", authRoute);
router.use("/blog", blogRoute);
router.use("/flag", flaggedRoute)

export default router;
