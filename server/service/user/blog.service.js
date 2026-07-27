import { Blog } from "../../models/blog.model.js";

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
};

export default BlogsService;
