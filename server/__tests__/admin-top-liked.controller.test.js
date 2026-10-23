import { AdminDashboardController } from "../controller/admin/admin-dashboard.controller.js";
import { AdminBlogController } from "../controller/admin/admin-blog.controller.js";
import { Blog } from "../models/user/blog.model.js";
import { Review } from "../models/user/review.model.js";
import { AuthService } from "../service/user/auth.service.js";
import BlogsService from "../service/user/blog.service.js";
import { adminMessagesEnum, messagesEnum } from "../enums/index.js";
import ErrorResponse from "../utils/ErrorHandler.js";

// ! chainable find(): .sort().limit().select().lean() resolves to the rows given
const findReturning = rows => {
  const chain = {
    sort: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    select: jest.fn(() => chain),
    lean: jest.fn(async () => rows),
  };
  return chain;
};

jest.mock("../models/user/blog.model.js", () => ({
  Blog: {
    find: jest.fn(),
    findOne: jest.fn(),
    // > read when the dashboard service loads
    schema: { path: () => ({ enumValues: ["news", "other"] }) },
  },
}));
jest.mock("../models/user/review.model.js", () => ({
  Review: { find: jest.fn() },
}));

// # the dashboard service imports every model; only Blog and Review are used here
jest.mock("../models/user/auth.model.js", () => ({ Auth: {} }));
jest.mock("../models/user/contact.model.js", () => ({ Contact: {} }));
jest.mock("../models/user/user-activity-log.model.js", () => ({
  UserActivityLog: {},
}));
jest.mock("../models/admin/admin-auth.model.js", () => ({ AdminAuth: {} }));
jest.mock("../models/admin/admin-roles.model.js", () => ({ AdminRoles: {} }));

jest.mock("../service/user/auth.service.js", () => ({
  AuthService: { getAuthorDetailsByUserIds: jest.fn() },
}));
jest.mock("../service/user/blog.service.js", () => ({
  __esModule: true,
  default: { attachAuthorDetailsToOne: jest.fn() },
}));

// * nanoid ships ESM only, which jest's CJS transform cannot load
jest.mock("nanoid", () => ({
  nanoid: () => "abc123",
  customAlphabet: () => () => "123456",
}));

jest.mock("../logger/logger.js", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const callHandler = async (handler, req = {}) => {
  const res = makeRes();
  const next = jest.fn();
  await handler({ body: {}, params: {}, query: {}, ...req }, res, next);
  return { res, next, body: res.json.mock.calls[0]?.[0] };
};

const ada = {
  userId: "user-1",
  first_name: "Ada",
  last_name: "Lovelace",
  user_name: "ada",
};

beforeEach(() => {
  jest.clearAllMocks();
  AuthService.getAuthorDetailsByUserIds.mockResolvedValue(
    new Map([["user-1", ada]])
  );
});

describe("AdminDashboardController.getTopBlogs", () => {
  it("returns the most liked blogs with author and review count", async () => {
    const query = findReturning([
      {
        blogId: "blog-1",
        title: "Hello",
        category: "news",
        likeNo: 12,
        author: "user-1",
        review: [{ reviewId: "r1" }, { reviewId: "r2" }],
      },
    ]);
    Blog.find.mockReturnValue(query);

    const { res, body } = await callHandler(
      AdminDashboardController.getTopBlogs
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.message).toBe(
      adminMessagesEnum.DASHBOARD_TOP_BLOGS_FETCHED_SUCCESSFULLY
    );
    expect(query.sort).toHaveBeenCalledWith({ likeNo: -1, createdAt: -1 });
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(body.blogs).toEqual([
      {
        blogId: "blog-1",
        title: "Hello",
        category: "news",
        likeNo: 12,
        author: "user-1",
        reviewCount: 2,
        authorDetails: ada,
      },
    ]);
  });

  it("honours the limit", async () => {
    const query = findReturning([]);
    Blog.find.mockReturnValue(query);

    await callHandler(AdminDashboardController.getTopBlogs, {
      query: { limit: "3" },
    });

    expect(query.limit).toHaveBeenCalledWith(3);
  });

  it("passes database errors to next()", async () => {
    Blog.find.mockImplementation(() => {
      throw new Error("db down");
    });

    const { next, res } = await callHandler(
      AdminDashboardController.getTopBlogs
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("AdminDashboardController.getTopReviews", () => {
  it("returns the most liked reviews with their blog title and author", async () => {
    Review.find.mockReturnValue(
      findReturning([
        {
          reviewId: "r1",
          blogId: "blog-1",
          author: "user-1",
          review: "Great read",
          likeNo: 7,
        },
        {
          reviewId: "r2",
          blogId: "gone",
          author: "user-9",
          review: "Orphaned",
          likeNo: 1,
        },
      ])
    );
    Blog.find.mockReturnValue(
      findReturning([{ blogId: "blog-1", title: "Hello" }])
    );

    const { body } = await callHandler(AdminDashboardController.getTopReviews);

    expect(body.message).toBe(
      adminMessagesEnum.DASHBOARD_TOP_REVIEWS_FETCHED_SUCCESSFULLY
    );
    expect(Blog.find).toHaveBeenCalledWith({
      blogId: { $in: ["blog-1", "gone"] },
    });
    expect(body.reviews).toEqual([
      expect.objectContaining({
        reviewId: "r1",
        blogTitle: "Hello",
        authorDetails: ada,
      }),
      expect.objectContaining({
        reviewId: "r2",
        blogTitle: null,
        authorDetails: null,
      }),
    ]);
  });
});

describe("AdminBlogController.getBlog", () => {
  it("returns the blog with authors, without internal like lists", async () => {
    const doc = { blogId: "blog-1" };
    Blog.findOne.mockResolvedValue(doc);
    BlogsService.attachAuthorDetailsToOne.mockResolvedValue({
      _id: "mongo-id",
      blogId: "blog-1",
      title: "Hello",
      likes: ["user-2"],
      dislikes: [],
      authorDetails: ada,
      review: [],
    });

    const { res, body } = await callHandler(AdminBlogController.getBlog, {
      params: { blogId: "blog-1" },
    });

    expect(Blog.findOne).toHaveBeenCalledWith({ blogId: "blog-1" });
    expect(BlogsService.attachAuthorDetailsToOne).toHaveBeenCalledWith(doc);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.message).toBe(adminMessagesEnum.ADMIN_BLOG_FETCHED_SUCCESSFULLY);
    expect(body.blog).toEqual({
      blogId: "blog-1",
      title: "Hello",
      authorDetails: ada,
      review: [],
    });
  });

  it("responds 404 for an unknown blog", async () => {
    Blog.findOne.mockResolvedValue(null);

    const { next, res } = await callHandler(AdminBlogController.getBlog, {
      params: { blogId: "missing" },
    });

    expect(next).toHaveBeenCalledWith(expect.any(ErrorResponse));
    expect(next.mock.calls[0][0].message).toBe(messagesEnum.BLOG_NOT_FOUND);
    expect(next.mock.calls[0][0].statusCode).toBe(404);
    expect(res.json).not.toHaveBeenCalled();
  });
});
