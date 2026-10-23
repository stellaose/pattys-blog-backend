export const descriptions = {
  // + Authentication Operations
  signup: userName => `${userName} created an account`,
  signup_failed: userName => `${userName} failed to create an account`,
  verify_email: userName => `${userName} verified email successfully`,
  verify_email_failed: userName => `${userName} failed to verify email`,
  resend_otp: userName => `${userName} requested a new OTP`,
  resend_otp_failed: userName => `${userName} failed to request a new OTP`,
  login: userName =>
    `${userName} successfully authenticated and accessed the platform`,
  login_failed: userName => `${userName} login authentication failed`,
  forgot_password: userName => `${userName} initiated a password reset request`,
  forgot_password_failed: userName =>
    `${userName} failed to initiate a password reset request`,
  verify_forgot_password: userName =>
    `${userName} successfully verified password reset OTP`,
  verify_forgot_password_failed: userName =>
    `${userName} failed to verify password reset OTP`,
  reset_password: userName => `${userName} reset account password successfully`,
  reset_password_failed: userName =>
    `${userName} account password reset failed`,
  change_password: userName =>
    `${userName} updated account password successfully`,
  change_password_failed: userName =>
    `${userName} account password update failed`,
  logout: userName => `${userName} logged out`,
  logout_failed: userName => `${userName} failed to log out`,

  // & Profile Operations
  edit_profile: userName => `${userName} updated profile information`,
  edit_profile_failed: userName =>
    `${userName} failed to update profile information`,
  delete_account: userName => `${userName} deleted their account`,
  delete_account_failed: userName =>
    `${userName} failed to delete their account`,

  // ` Blog Operations
  create_blog: (userName, title) => `${userName} created blog "${title}"`,
  create_blog_failed: (userName, title) =>
    `${userName} failed to create blog "${title}"`,
  edit_blog: (userName, blogId) => `${userName} edited blog ${blogId}`,
  edit_blog_failed: (userName, blogId) =>
    `${userName} failed to edit blog ${blogId}`,
  delete_blog: (userName, blogId) => `${userName} deleted blog ${blogId}`,
  delete_blog_failed: (userName, blogId) =>
    `${userName} failed to delete blog ${blogId}`,
  like_blog: (userName, blogId) => `${userName} liked blog ${blogId}`,
  like_blog_failed: (userName, blogId) =>
    `${userName} failed to like blog ${blogId}`,
  dislike_blog: (userName, blogId) => `${userName} disliked blog ${blogId}`,
  dislike_blog_failed: (userName, blogId) =>
    `${userName} failed to dislike blog ${blogId}`,
  remove_blog_reaction: (userName, blogId) =>
    `${userName} removed their reaction from blog ${blogId}`,
  remove_blog_reaction_failed: (userName, blogId) =>
    `${userName} failed to remove their reaction from blog ${blogId}`,

  // ? Review Operations
  create_review: (userName, blogId) => `${userName} reviewed blog ${blogId}`,
  create_review_failed: (userName, blogId) =>
    `${userName} failed to review blog ${blogId}`,
  delete_review: (userName, reviewId) =>
    `${userName} deleted review ${reviewId}`,
  delete_review_failed: (userName, reviewId) =>
    `${userName} failed to delete review ${reviewId}`,
};
