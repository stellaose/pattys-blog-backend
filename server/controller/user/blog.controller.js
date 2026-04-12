import { Auth } from "../../models/auth.model.js";
import { Blog } from "../../models/blog.model.js";
import ErrorResponse from "../../utils/ErrorHandler.js";
import ApiFeatures from "../../utils/apiFeatures.js";
import { nanoid } from "nanoid";

const toAuthBlogEntry = doc => ({
  id: doc._id,
  title: doc.title,
  description: doc.description,
});

export const BlogController = {
  getAllBlogs: async (req, res, next) => {
    try {
      const queryParams = { ...req.query };
      if (!queryParams.sort) {
        queryParams.sort = "-createdAt";
      }

      const resultPerPage = Math.min(Number(queryParams.limit) || 10, 100);
      const currentPage = Number(queryParams.page) || 1;

      const features = new ApiFeatures(
        Blog.find({ isFlagged: false }),
        queryParams,
        {
          searchableFields: ["title", "description"],
          filterAllowlist: ["category"],
        }
      );

      features.search().filter().sort();

      const filter = features.query.getFilter();
      const blogsCount = await Blog.countDocuments(filter);

      features.pagination(resultPerPage);
      const blogs = await features.query;

      return res.status(200).json({
        success: true,
        message: "Blogs fetched successfully",
        blogs,
        pagination: {
          count: blogs.length,
          totalBlogs: blogsCount,
          resultPerPage,
          totalPages: Math.max(1, Math.ceil(blogsCount / resultPerPage)),
          currentPage,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  getMyBlogs: async (req, res, next) => {
    try {
      const queryParams = { ...req.query };
      if (!queryParams.sort) {
        queryParams.sort = "-createdAt";
      }
      delete queryParams.author;

      const resultPerPage = Math.min(Number(queryParams.limit) || 10, 100);
      const currentPage = Number(queryParams.page) || 1;

      const features = new ApiFeatures(Blog.find({ author: req.userId, isFlagged: false }), queryParams,
        {
          searchableFields: ["title", "description"],
          filterAllowlist: ["category"],
        }
      );

      features.search().filter().sort();

      const filter = features.query.getFilter();
      const blogsCount = await Blog.countDocuments(filter);

      features.pagination(resultPerPage);
      const blog = await features.query;

      const allForAuth = await Blog.find({ author: req.userId }).sort({
        createdAt: -1,
      });
      await Auth.updateOne(
        { userId: req.userId },
        { $set: { blogs: allForAuth.map(toAuthBlogEntry) } }
      );

      return res.status(200).json({
        success: true,
        message: "Your blogs fetched successfully",
        blog,
        pagination: {
          count: blog.length,
          totalBlogs: blogsCount,
          resultPerPage,
          totalPages: Math.max(1, Math.ceil(blogsCount / resultPerPage)),
          currentPage,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  createPost: async (req, res, next) => {
    try {
      const { title, description, category } = req.body;

      if (!title) {
        return next(new ErrorResponse("Title is required", 400));
      }

      if (!description) {
        return next(new ErrorResponse("Description is required", 400));
      }

      const blog = await Blog.create({
        author: req.userId,
        blogId: `blog-${nanoid(24).replaceAll("_", "").replaceAll("-", "")}`,
        title,
        description,
        category: category ? category : "Other",
      });

      await Auth.findOneAndUpdate(
        { userId: req.userId },
        { $push: { blogs: toAuthBlogEntry(blog) } }
      );

      return res.status(200).json({
        success: true,
        message: "Blog created successfully",
        blog,
      });
    } catch (error) {
      next(error);
    }
  },

  editPost: async (req, res, next) => {
    try {
      const { title, description, category } = req.body;

      const blog = await Blog.findOneAndUpdate(
        { blogId: req.params.blogId },
        {
          title,
          description,
          category: category ? category : "Other",
        },
        { new: true }
      );
      if (!blog) return next(new ErrorResponse("Blog not found", 404));

      return res.status(200).json({
        success: true,
        message: "Blog updated successfully",
        blog,
      });
    } catch (error) {
      next(error);
    }
  },

};
