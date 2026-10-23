import { Review } from "../../models/user/review.model.js";
import { AuthService } from "./auth.service.js";

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

  attachAuthorDetails: async reviews => {
    const authorsById = await AuthService.getAuthorDetailsByUserIds(
      reviews.map(review => review.author)
    );

    return reviews.map(review => ({
      ...review.toObject(),
      authorDetails: authorsById.get(review.author) ?? null,
    }));
  },
};

export default ReviewService;
