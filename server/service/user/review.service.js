import { Review } from "../../models/review.model.js";

const ReviewService = {
  getReviewByBlogId: async blogId => {
    return await Review.find({ blogId });
  },
  getReviewByReviewId: async reviewId => {
    return await Review.find({ reviewId });
  },
  getReviewByBlogIdAndReviewId: async (blogId, reviewId) => {
    return await Review.findOne({ blogId, reviewId });
  },
  getReviewByBlogIdAndAuthor: async (blogId, author) => {
    return await Review.findOne({ blogId, author });
  },

  getAllReviews: async () => {
    return await Review.find();
  },
};

export default ReviewService;
