import { Blog } from "../../models/user/blog.model.js";
import { Auth } from "../../models/user/auth.model.js";
import { Review } from "../../models/user/review.model.js";
import { Contact } from "../../models/user/contact.model.js";
import { AuthService } from "../../service/user/auth.service.js";
import ApiFeatures from "../../utils/apiFeatures.js";
import logger from "../../logger/logger.js";
import {
  adminLabelEnum,
  adminMessagesEnum,
  labelEnum,
  statusEnum,
} from "../../enums/index.js";

// # search, filter, sort (newest first by default) and paginate one collection
const listOf = async (Model, query, { searchableFields, filterAllowlist, select }) => {
  const queryParams = { sort: "-createdAt", ...query };
  const resultPerPage = Math.min(Number(queryParams.limit) || 10, 100);
  const currentPage = Number(queryParams.page) || 1;

  const features = new ApiFeatures(Model.find().select(select), queryParams, {
    searchableFields,
    filterAllowlist,
  });
  features.search().filter().sort();
  const total = await Model.countDocuments(features.query.getFilter());
  features.pagination(resultPerPage);
  const rows = await features.query.lean();

  return {
    rows,
    pagination: {
      count: rows.length,
      total,
      resultPerPage,
      totalPages: Math.max(1, Math.ceil(total / resultPerPage)),
      currentPage,
    },
  };
};

// ^ runs a list handler with the shared success/error envelope
const respond = (label, message, key, load) => async (req, res, next) => {
  try {
    const { rows, pagination } = await load(req.query);

    logger.info(`${labelEnum.CURRENT_TIME_STAMP}-${label}-${message}`);

    return res.status(statusEnum.statusCode.HTTP_OK).json({
      code: statusEnum.statusCode.HTTP_OK,
      success: true,
      message,
      [key]: rows,
      pagination,
    });
  } catch (error) {
    logger.error(`${label} failed::${labelEnum.CURRENT_TIME_STAMP}`, error.message);
    next(error);
  }
};

const withAuthors = async (rows, field = "author") => {
  const authors = await AuthService.getAuthorDetailsByUserIds(
    rows.map(row => row[field])
  );
  return rows.map(row => ({
    ...row,
    authorDetails: authors.get(row[field]) ?? null,
  }));
};

export const AdminContentController = {
  // ' every blog, flagged ones included, with author and comment count
  getBlogs: respond(
    adminLabelEnum.ADMIN_GET_BLOGS,
    adminMessagesEnum.ADMIN_BLOGS_FETCHED_SUCCESSFULLY,
    "blogs",
    async query => {
      const { rows, pagination } = await listOf(Blog, query, {
        searchableFields: ["title"],
        filterAllowlist: ["category", "isFlagged"],
        select:
          "blogId title category likeNo dislikeNo isFlagged author review createdAt -_id",
      });
      const blogs = rows.map(({ review, ...blog }) => ({
        ...blog,
        reviewCount: review?.length ?? 0,
      }));
      return { rows: await withAuthors(blogs), pagination };
    }
  ),

  // ' bloggers are the site's users, with how many blogs each has written
  getBloggers: respond(
    adminLabelEnum.ADMIN_GET_BLOGGERS,
    adminMessagesEnum.ADMIN_BLOGGERS_FETCHED_SUCCESSFULLY,
    "bloggers",
    async query => {
      const { rows, pagination } = await listOf(Auth, query, {
        searchableFields: ["first_name", "last_name", "user_name", "email"],
        filterAllowlist: ["isEmailVerified", "gender"],
        select:
          "userId first_name last_name user_name email phone_number gender isEmailVerified createdAt -_id",
      });
      const counts = await Blog.aggregate([
        { $match: { author: { $in: rows.map(row => row.userId) } } },
        { $group: { _id: "$author", count: { $sum: 1 } } },
      ]);
      const blogCounts = new Map(counts.map(row => [row._id, row.count]));
      return {
        rows: rows.map(row => ({
          ...row,
          blogCount: blogCounts.get(row.userId) ?? 0,
        })),
        pagination,
      };
    }
  ),

  // ' comments are stored as reviews; each comes with its blog's title
  getComments: respond(
    adminLabelEnum.ADMIN_GET_COMMENTS,
    adminMessagesEnum.ADMIN_COMMENTS_FETCHED_SUCCESSFULLY,
    "comments",
    async query => {
      const { rows, pagination } = await listOf(Review, query, {
        searchableFields: ["review"],
        filterAllowlist: ["blogId"],
        select: "reviewId blogId author review likeNo isEdited createdAt -_id",
      });
      const blogs = await Blog.find({
        blogId: { $in: rows.map(row => row.blogId) },
      })
        .select("blogId title -_id")
        .lean();
      const titles = new Map(blogs.map(blog => [blog.blogId, blog.title]));
      const comments = rows.map(row => ({
        ...row,
        blogTitle: titles.get(row.blogId) ?? null,
      }));
      return { rows: await withAuthors(comments), pagination };
    }
  ),

  getContacts: respond(
    adminLabelEnum.ADMIN_GET_CONTACTS,
    adminMessagesEnum.ADMIN_CONTACTS_FETCHED_SUCCESSFULLY,
    "contacts",
    query =>
      listOf(Contact, query, {
        searchableFields: ["name", "email", "topic", "message"],
        filterAllowlist: ["topic"],
        select: "contactId name email topic message isEmailSent createdAt -_id",
      })
  ),
};
