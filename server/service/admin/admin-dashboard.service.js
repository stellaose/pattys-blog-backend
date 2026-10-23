import { Auth } from "../../models/user/auth.model.js";
import { Blog } from "../../models/user/blog.model.js";
import { Review } from "../../models/user/review.model.js";
import { Contact } from "../../models/user/contact.model.js";
import { UserActivityLog } from "../../models/user/user-activity-log.model.js";
import { AdminAuth } from "../../models/admin/admin-auth.model.js";
import { AdminRoles } from "../../models/admin/admin-roles.model.js";
import { AuthService } from "../user/auth.service.js";
import { userOperations } from "../../lib/user/user-operations.lib.js";
import { statusEnum } from "../../enums/index.js";

const { opCodes, activityStatus, adminStatus } = statusEnum;

// ! aggregate() skips the soft-delete plugin's hooks, so deleted admins are excluded by hand
const liveAdmins = { isDeleted: { $ne: true } };

// ? a visit is one successful login, counted every time (not per user): the app
// has no page-view tracking, so logins in the user activity log measure visits
const LOGIN_ACTIVITY = userOperations[opCodes.LOGIN];

// ? accounts are hard-deleted, so deletions are counted from the activity log
const DELETE_ACCOUNT_ACTIVITY = userOperations[opCodes.DELETE_ACCOUNT];

const createdBetween = (from, to) => ({ createdAt: { $gte: from, $lt: to } });

// & documents created in the range, per collection
const contentModels = {
  signups: [Auth, {}],
  deletedUsers: [
    UserActivityLog,
    {
      activity_type: DELETE_ACCOUNT_ACTIVITY,
      activity_status: activityStatus.SUCCESS,
    },
  ],
  admins: [AdminAuth, liveAdmins],
  blogs: [Blog, {}],
  flaggedBlogs: [Blog, { isFlagged: true }],
  reviews: [Review, {}],
  contactMessages: [Contact, {}],
};

const emptyLoginStats = () => ({
  visits: 0,
  failedLogins: 0,
});

const toLoginStats = groups => {
  const stats = emptyLoginStats();

  for (const group of groups) {
    if (group.status === activityStatus.SUCCESS) {
      stats.visits = group.count;
    }
    if (group.status === activityStatus.FAILED) {
      stats.failedLogins = group.count;
    }
  }

  return stats;
};

const loginGroupStage = bucket => ({
  $group: {
    _id: { ...(bucket && { bucket }), status: "$activity_status" },
    count: { $sum: 1 },
  },
});

const truncateTo = interval => ({
  $dateTrunc: {
    date: "$createdAt",
    unit: interval,
    timezone: "UTC",
    ...(interval === "week" && { startOfWeek: "monday" }),
  },
});

const AdminDashboardService = {
  getLoginStats: async (from, to) => {
    const groups = await UserActivityLog.aggregate([
      {
        $match: { activity_type: LOGIN_ACTIVITY, ...createdBetween(from, to) },
      },
      loginGroupStage(),
      {
        $project: {
          _id: 0,
          status: "$_id.status",
          count: 1,
        },
      },
    ]);

    return toLoginStats(groups);
  },

  getContentCounts: async (from, to) => {
    const entries = await Promise.all(
      Object.entries(contentModels).map(async ([metric, [Model, filter]]) => [
        metric,
        await Model.countDocuments({ ...filter, ...createdBetween(from, to) }),
      ])
    );

    return Object.fromEntries(entries);
  },

  getMetrics: async (from, to) => {
    const [loginStats, contentCounts] = await Promise.all([
      AdminDashboardService.getLoginStats(from, to),
      AdminDashboardService.getContentCounts(from, to),
    ]);

    return { ...loginStats, ...contentCounts };
  },

  getAllTimeTotals: async () => {
    const [users, blogs, reviews, contactMessages, visits, admins] =
      await Promise.all([
        Auth.estimatedDocumentCount(),
        Blog.estimatedDocumentCount(),
        Review.estimatedDocumentCount(),
        Contact.estimatedDocumentCount(),
        UserActivityLog.countDocuments({
          activity_type: LOGIN_ACTIVITY,
          activity_status: activityStatus.SUCCESS,
        }),
        AdminAuth.countDocuments(),
      ]);

    return { users, admins, blogs, reviews, contactMessages, visits };
  },

  // # per-bucket metrics as { "<bucket ISO date>": { metric: count } }
  getTrendMetrics: async (interval, from, to) => {
    const bucket = truncateTo(interval);
    const byBucket = {};
    const add = (date, values) => {
      const key = date.toISOString();
      byBucket[key] = { ...byBucket[key], ...values };
    };

    const loginGroups = UserActivityLog.aggregate([
      {
        $match: { activity_type: LOGIN_ACTIVITY, ...createdBetween(from, to) },
      },
      loginGroupStage(bucket),
      {
        $project: {
          _id: 0,
          bucket: "$_id.bucket",
          status: "$_id.status",
          count: 1,
        },
      },
    ]);

    const contentGroups = Object.entries(contentModels).map(
      async ([metric, [Model, filter]]) => {
        const rows = await Model.aggregate([
          { $match: { ...filter, ...createdBetween(from, to) } },
          { $group: { _id: bucket, count: { $sum: 1 } } },
        ]);
        rows.forEach(row => add(row._id, { [metric]: row.count }));
      }
    );

    const [logins] = await Promise.all([loginGroups, ...contentGroups]);

    const loginsByBucket = {};
    for (const row of logins) {
      const key = row.bucket.toISOString();
      (loginsByBucket[key] ??= []).push(row);
    }
    for (const [key, rows] of Object.entries(loginsByBucket)) {
      add(new Date(key), toLoginStats(rows));
    }

    return byBucket;
  },
};

// ~ { label, value } slices in a fixed order, with 0 for labels that have no records,
// so a pie or bar chart keeps the same segments from one period to the next
const toSlices = (rows, labels) => {
  const counts = new Map(rows.map(row => [row._id, row.count]));
  const known = labels.map(label => ({
    label,
    value: counts.get(label) ?? 0,
  }));
  const others = rows
    .filter(row => !labels.includes(row._id))
    .map(row => ({ label: row._id ?? "unspecified", value: row.count }));
  return [...known, ...others];
};

const countBy = field => [
  { $group: { _id: field, count: { $sum: 1 } } },
  { $sort: { count: -1 } },
];

const blogCategories = Blog.schema.path("category").enumValues;

// # breakdowns of users, admins and blogs for pie, donut and bar charts;
// without a range they cover all time
AdminDashboardService.getBreakdown = async range => {
  const created = range ? createdBetween(range.from, range.to) : {};

  const [[users], [admins], [blogs]] = await Promise.all([
    Auth.aggregate([
      { $match: created },
      {
        $facet: {
          total: [{ $count: "count" }],
          byGender: countBy("$gender"),
          byVerification: countBy({
            $cond: ["$isEmailVerified", "verified", "unverified"],
          }),
        },
      },
    ]),
    AdminAuth.aggregate([
      { $match: { ...liveAdmins, ...created } },
      {
        $facet: {
          total: [{ $count: "count" }],
          byStatus: countBy("$status"),
          byRole: [
            { $group: { _id: "$roleId", count: { $sum: 1 } } },
            {
              $lookup: {
                from: AdminRoles.collection.name,
                localField: "_id",
                foreignField: "roleId",
                as: "role",
              },
            },
            {
              $project: {
                _id: { $ifNull: [{ $first: "$role.name" }, "unknown role"] },
                count: 1,
              },
            },
            { $sort: { count: -1 } },
          ],
        },
      },
    ]),
    Blog.aggregate([
      { $match: created },
      {
        $facet: {
          total: [{ $count: "count" }],
          byCategory: countBy("$category"),
          byStatus: countBy({
            $cond: ["$isFlagged", "flagged", "published"],
          }),
        },
      },
    ]),
  ]);

  const totalOf = facet => facet.total[0]?.count ?? 0;

  return {
    users: {
      total: totalOf(users),
      byGender: toSlices(users.byGender, ["male", "female"]),
      byVerification: toSlices(users.byVerification, [
        "verified",
        "unverified",
      ]),
    },
    admins: {
      total: totalOf(admins),
      byStatus: toSlices(admins.byStatus, Object.values(adminStatus)),
      byRole: toSlices(admins.byRole, []),
    },
    blogs: {
      total: totalOf(blogs),
      byCategory: toSlices(blogs.byCategory, blogCategories),
      byStatus: toSlices(blogs.byStatus, ["published", "flagged"]),
    },
  };
};

// ^ most liked blogs, newest first on ties; flagged blogs are included and marked
AdminDashboardService.getTopBlogs = async limit => {
  const blogs = await Blog.find({})
    .sort({ likeNo: -1, createdAt: -1 })
    .limit(limit)
    .select(
      "blogId title category likeNo dislikeNo isFlagged author review createdAt -_id"
    )
    .lean();

  const authors = await AuthService.getAuthorDetailsByUserIds(
    blogs.map(blog => blog.author)
  );

  return blogs.map(({ review, ...blog }) => ({
    ...blog,
    reviewCount: review?.length ?? 0,
    authorDetails: authors.get(blog.author) ?? null,
  }));
};

// ^ most liked reviews, each with the blog it belongs to
AdminDashboardService.getTopReviews = async limit => {
  const reviews = await Review.find({})
    .sort({ likeNo: -1, createdAt: -1 })
    .limit(limit)
    .select("reviewId blogId author review likeNo isEdited createdAt -_id")
    .lean();

  const [authors, blogs] = await Promise.all([
    AuthService.getAuthorDetailsByUserIds(reviews.map(review => review.author)),
    Blog.find({ blogId: { $in: reviews.map(review => review.blogId) } })
      .select("blogId title -_id")
      .lean(),
  ]);
  const titles = new Map(blogs.map(blog => [blog.blogId, blog.title]));

  return reviews.map(review => ({
    ...review,
    blogTitle: titles.get(review.blogId) ?? null,
    authorDetails: authors.get(review.author) ?? null,
  }));
};

export const dashboardMetricKeys = [
  ...Object.keys(emptyLoginStats()),
  ...Object.keys(contentModels),
];

export default AdminDashboardService;
