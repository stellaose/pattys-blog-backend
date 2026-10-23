import { Blog } from "../../models/user/blog.model.js";
import { AuthService } from "./auth.service.js";

const BlogsService = {
  getAllBlogs: async () => {
    return await Blog.find();
  },

  getAllUnflaggedBlogs: () => {
    return Blog.find({ isFlagged: false });
  },

  countDocuments: async filter => {
    return await Blog.countDocuments(filter);
  },

  getUserUnflaggedBlogs: userId => {
    return Blog.find({ author: userId, isFlagged: false });
  },
  getUserBlogs: userId => {
    return Blog.find({ author: userId }).sort({ createdAt: -1 });
  },

  getOneBlog: async blogId => {
    return await Blog.findOne({ blogId });
  },

  attachAuthorDetails: async blogs => {
    const plainBlogs = blogs.map(blog => blog.toObject());
    const authorsById = await AuthService.getAuthorDetailsByUserIds(
      plainBlogs.flatMap(blog => [
        blog.author,
        ...(blog.review ?? []).map(review => review.author),
      ])
    );

    return plainBlogs.map(blog => ({
      ...blog,
      authorDetails: authorsById.get(blog.author) ?? null,
      review: (blog.review ?? []).map(review => ({
        ...review,
        authorDetails: authorsById.get(review.author) ?? null,
      })),
    }));
  },

  attachAuthorDetailsToOne: async blog => {
    const [blogWithAuthors] = await BlogsService.attachAuthorDetails([blog]);
    return blogWithAuthors;
  },
};

export default BlogsService;
