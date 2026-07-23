import { Blog } from "../../models/blog.model.js";

const BlogsService = {
  getAllBlogs: async () => {
    return await Blog.find();
  },

  getAllUnflaggedBlogs: async () => {
    return await Blog.find({ isFlagged: false });
  },

  countDocuments: async filter => {
    return await Blog.countDocuments(filter);
  },

  getUserUnflaggedBlogs: async userId => {
    return await Blog.find({ author: userId, isFlagged: false });
  },
  getUserBlogs: async userId => {
    return await Blog.find({ author: userId });
  },
  
  getOneBlog: async blogId => {
    return await Blog.findOne({ blogId });
  },
};

export default BlogsService;
