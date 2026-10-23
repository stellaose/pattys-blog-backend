import { Router } from "express";
import adminRoute from "./adminRoute.js";
import activityRoute from "./activityRoute.js";
import authRoute from "./authRoute.js";
import bloggerRoute from "./bloggerRoute.js";
import commentRoute from "./commentRoute.js";
import contactRoute from "./contactRoute.js";
import blogRoute from "./blogRoute.js";
import dashboardRoute from "./dashboardRoute.js";
import resourceRoute from "./resourceRoute.js";
import roleRoute from "./roleRoute.js";

const router = Router();

router.use("/auth", authRoute);
router.use("/admins", adminRoute);
router.use("/resource", resourceRoute);
router.use("/role", roleRoute);
router.use("/dashboard", dashboardRoute);
router.use("/blogs", blogRoute);
router.use("/activity", activityRoute);
router.use("/bloggers", bloggerRoute);
router.use("/comments", commentRoute);
router.use("/contacts", contactRoute);

export default router;
