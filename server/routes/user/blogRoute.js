import { Router } from "express";
import { BlogController } from "../../controller/user/blog.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";

const router = Router();

router.get("/all", BlogController.getAllBlogs);
router.get("/my-posts", AuthMiddleware.auth, BlogController.getMyBlogs);
router.post("/create", AuthMiddleware.auth, BlogController.createPost);
router.patch("/edit/:blogId", AuthMiddleware.auth, BlogController.editPost);
router.patch(
  "/status/:blogId",
  AuthMiddleware.auth,
  BlogController.likeDislikePost
);
router.delete(
  "/delete/:blogId",
  AuthMiddleware.auth,
  BlogController.deletePost
);

export default router;
