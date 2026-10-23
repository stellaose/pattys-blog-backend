import { AdminContentController } from "../controller/admin/admin-content.controller.js";
import { Blog } from "../models/user/blog.model.js";
import { Auth } from "../models/user/auth.model.js";
import { Review } from "../models/user/review.model.js";
import { Contact } from "../models/user/contact.model.js";
import { AuthService } from "../service/user/auth.service.js";
import { adminMessagesEnum } from "../enums/index.js";

// ! a fake mongoose query that records what ApiFeatures asks of it
const fakeQuery = rows => {
  const state = { filter: {}, sort: null, limit: null, skip: null };
  const query = {
    state,
    select: jest.fn(() => query),
    find: jest.fn(filter => {
      Object.assign(state.filter, filter);
      return query;
    }),
    sort: jest.fn(sort => {
      state.sort = sort;
      return query;
    }),
    limit: jest.fn(limit => {
      state.limit = limit;
      return query;
    }),
    skip: jest.fn(skip => {
      state.skip = skip;
      return query;
    }),
    getFilter: jest.fn(() => state.filter),
    lean: jest.fn(async () => rows),
  };
  return query;
};

const model = () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
});

jest.mock("../models/user/blog.model.js", () => ({ Blog: model() }));
jest.mock("../models/user/auth.model.js", () => ({ Auth: model() }));
jest.mock("../models/user/review.model.js", () => ({ Review: model() }));
jest.mock("../models/user/contact.model.js", () => ({ Contact: model() }));
jest.mock("../service/user/auth.service.js", () => ({
  AuthService: { getAuthorDetailsByUserIds: jest.fn() },
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

const callHandler = async (handler, query = {}) => {
  const res = makeRes();
  const next = jest.fn();
  await handler({ query }, res, next);
  return { res, next, body: res.json.mock.calls[0]?.[0] };
};

const ada = { userId: "user-1", first_name: "Ada" };

beforeEach(() => {
  jest.clearAllMocks();
  AuthService.getAuthorDetailsByUserIds.mockResolvedValue(
    new Map([["user-1", ada]])
  );
});

describe("AdminContentController.getBlogs", () => {
  it("searches, filters, sorts and paginates blogs", async () => {
    const query = fakeQuery([
      { blogId: "blog-1", title: "Lagos", author: "user-1", review: [{}, {}] },
    ]);
    Blog.find.mockReturnValue(query);
    Blog.countDocuments.mockResolvedValue(31);

    const { res, body } = await callHandler(AdminContentController.getBlogs, {
      keyword: "lagos",
      category: "news",
      sort: "-likeNo",
      page: "2",
      limit: "10",
      ignored: "x",
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.message).toBe(adminMessagesEnum.ADMIN_BLOGS_FETCHED_SUCCESSFULLY);
    expect(query.state.filter).toEqual({
      $or: [{ title: { $regex: "lagos", $options: "i" } }],
      category: "news",
    });
    expect(query.state.sort).toEqual({ likeNo: -1 });
    expect(query.state.skip).toBe(10);
    expect(query.state.limit).toBe(10);
    expect(body.blogs).toEqual([
      {
        blogId: "blog-1",
        title: "Lagos",
        author: "user-1",
        reviewCount: 2,
        authorDetails: ada,
      },
    ]);
    expect(body.pagination).toEqual({
      count: 1,
      total: 31,
      resultPerPage: 10,
      totalPages: 4,
      currentPage: 2,
    });
  });

  it("defaults to newest first", async () => {
    const query = fakeQuery([]);
    Blog.find.mockReturnValue(query);
    Blog.countDocuments.mockResolvedValue(0);

    await callHandler(AdminContentController.getBlogs);

    expect(query.state.sort).toEqual({ createdAt: -1 });
  });

  it("passes errors to next()", async () => {
    Blog.find.mockImplementation(() => {
      throw new Error("db down");
    });

    const { next, res } = await callHandler(AdminContentController.getBlogs);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("AdminContentController.getBloggers", () => {
  it("adds each blogger's blog count", async () => {
    Auth.find.mockReturnValue(
      fakeQuery([
        { userId: "user-1", first_name: "Ada" },
        { userId: "user-2", first_name: "Grace" },
      ])
    );
    Auth.countDocuments.mockResolvedValue(2);
    Blog.aggregate.mockResolvedValue([{ _id: "user-1", count: 4 }]);

    const { body } = await callHandler(AdminContentController.getBloggers);

    expect(Blog.aggregate.mock.calls[0][0][0]).toEqual({
      $match: { author: { $in: ["user-1", "user-2"] } },
    });
    expect(body.bloggers.map(row => row.blogCount)).toEqual([4, 0]);
  });
});

describe("AdminContentController.getComments", () => {
  it("adds each comment's blog title and author", async () => {
    Review.find.mockReturnValue(
      fakeQuery([{ reviewId: "r1", blogId: "blog-1", author: "user-1" }])
    );
    Review.countDocuments.mockResolvedValue(1);
    Blog.find.mockReturnValue(fakeQuery([{ blogId: "blog-1", title: "Lagos" }]));

    const { body } = await callHandler(AdminContentController.getComments);

    expect(body.comments).toEqual([
      {
        reviewId: "r1",
        blogId: "blog-1",
        author: "user-1",
        blogTitle: "Lagos",
        authorDetails: ada,
      },
    ]);
  });
});

describe("AdminContentController.getContacts", () => {
  it("lists contact messages", async () => {
    Contact.find.mockReturnValue(
      fakeQuery([{ contactId: "c1", name: "Sam", message: "Hello" }])
    );
    Contact.countDocuments.mockResolvedValue(1);

    const { body } = await callHandler(AdminContentController.getContacts, {
      topic: "support",
    });

    expect(body.message).toBe(
      adminMessagesEnum.ADMIN_CONTACTS_FETCHED_SUCCESSFULLY
    );
    expect(body.contacts).toEqual([
      { contactId: "c1", name: "Sam", message: "Hello" },
    ]);
  });
});
