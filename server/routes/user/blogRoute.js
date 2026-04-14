import { Router } from "express";
import { BlogController } from "../../controller/user/blog.controller.js";
import { Auth } from "../../middleware/AuthMiddleware.js";

const router = Router();

router.get("/all", BlogController.getAllBlogs);
router.get("/my-posts", Auth, BlogController.getMyBlogs);
router.post("/create", Auth, BlogController.createPost);
router.patch("/edit/:blogId", Auth, BlogController.editPost);
router.patch("/status/:blogId", Auth, BlogController.likeDislikePost);
router.delete("/delete/:blogId", Auth, BlogController.deletePost);

export default router;
