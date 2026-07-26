import { Router } from "express";
import { BlogController } from "../../controller/user/blog.controller.js";
import AuthMiddleware from "../../middleware/AuthMiddleware.js";
import {
  processJoiValidation,
  createBlog,
  editBlog,
  blogParams,
  likeDislikeBlog,
} from "../../utils/utils.validation.js";

const router = Router();

router.get("/all", AuthMiddleware.auth, BlogController.getAllBlogs);

router.get("/my-posts", AuthMiddleware.auth, BlogController.getMyBlogs);

router.post(
  "/create",
  processJoiValidation(createBlog, "payload"),
  AuthMiddleware.auth,
  BlogController.createBlog
);

router.patch(
  "/edit/:blogId",
  processJoiValidation(editBlog, "payload"),
  processJoiValidation(blogParams, "params"),
  AuthMiddleware.auth,
  BlogController.editBlog
);

router.patch(
  "/status/:blogId",
  processJoiValidation(blogParams, "params"),
  processJoiValidation(likeDislikeBlog, "payload"),
  AuthMiddleware.auth,
  BlogController.likeDislikeBlog
);
router.delete(
  "/delete/:blogId",
  AuthMiddleware.auth,
  BlogController.deleteBlog
);

export default router;
