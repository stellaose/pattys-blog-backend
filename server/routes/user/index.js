import { Router } from "express";
import authRoute from "./authRoute.js";
import blogRoute from "./blogRoute.js";
import reviewRoute from "./reviewRoute.js";
import userRoute from "./userRoute.js";
import contactRoute from "./contactRoute.js";

const router = Router();

router.use("/auth", authRoute);
router.use("/blog", blogRoute);
router.use("/review", reviewRoute);
router.use("/user", userRoute);
router.use("/contact", contactRoute);

export default router;
