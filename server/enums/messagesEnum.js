export const messagesEnum = {
  // $ General
  FORBIDDEN: "Forbidden",
  UNAUTHORIZED: "Unauthorized",
  USER_ID_REQUIRED: "User ID is required",
  REQUEST_BODY_REQUIRED: "Request body is required",

  // ! Authentication related messages
  EMAIL_REQUIRED: "Email is required",
  EMAIL_EXISTS: "Email already exists",
  EMAIL_NOT_VERIFIED: "Email not verified",
  EMAIL_ALREADY_VERIFIED: "This e-mail has already been verified.",
  EMAIL_VERIFIED_SUCCESSFULLY: "Email verified successfully",
  EMAIL_SENT_SUCCESSFULLY: "Email sent successfully",
  INVALID_EMAIL: "Invalid email",

  // + Password
  PASSWORD_REQUIRED: "Password is required (min 8 chars)",
  INVALID_PASSWORD: "Invalid password",
  PASSWORD_MISMATCH: "Passwords do not match",
  PASSWORD_RESET_SUCCESSFUL: "Password reset successful",
  NEW_PASSWORD_REQUIRED: "New password is required",
  NEW_PASSWORD_SAME_AS_OLD: "New password cannot be same as old password",
  PASSWORD_CHANGED_SUCCESSFUL: "Password changed successfully",

  // = Username
  USERNAME_REQUIRED: "Username is required",
  USERNAME_EXISTS: "Username already exists",
  INVALID_USERNAME: "Invalid username",
  USER_FOUND_SUCCESSFULLY: "User found successfully",

  // > Phone Number
  PHONE_NUMBER_REQUIRED: "Phone Number is required",
  INVALID_PHONE_NUMBER: "Invalid phone number",

  // ? Verification
  VERIFICATION_CODE_REQUIRED: "Verification code is required",
  INVALID_VERIFICATION_CODE: "Invalid verification code",
  VERIFICATION_CODE_EXPIRED: "Verification code has expired",
  INVALID_TOKEN: "Invalid token",
  VERIFICATION_SUCCESSFUL: "Verification successful",
  VERIFICATION_CODE_NOT_FOUND: "Verification code not found",

  // < User
  USER_CREATED: "User created successfully",
  INVALID_USER: "Invalid user",
  USER_NOT_FOUND: "User not found",
  USER_NOT_VERIFIED: "User not verified",
  USER_VERIFIED_SUCCESSFULLY: "User verified successfully",
  USER_VERIFICATION_FAILED: "User verification failed",
  USER_FOUND: "User found successfully",
  USER_UPDATED_SUCCESSFULLY: "User updated successfully",
  USER_DELETED_SUCCESSFULLY: "User deleted successfully",

  // ' Sign up
  SIGNUP_SUCCESSFUL:
    "Thank you for signing up! Please check your email to verify your account.",

  // ; Resend OTP
  RESEND_OTP_SUCCESSFUL:
    "Check your email for a 6-digit code to verify your account.",

  // : Forget Password
  FORGET_PASSWORD_SUCCESSFUL:
    "Check your email for a 6-digit code to reset your password.",

  // ? Logout
  LOGOUT_SUCCESSFUL: "Logout successful",

  // @ Middleware
  NO_RESOURCE_ENTRY: role =>
    `Role ${role} is not allowed to access this resource`,

  // # Blogs
  BLOG_TITLE_REQUIRED: "Blog title is required",
  BLOG_DESCRIPTION_REQUIRED: "Blog description is required",
  BLOG_CREATED_SUCCESSFULLY: "Blog created successfully",
  BLOG_UPDATED_SUCCESSFULLY: "Blog updated successfully",
  BLOG_DELETED_SUCCESSFULLY: "Blog deleted successfully",
  BLOG_NOT_FOUND: "Blog not found",
  BLOG_FOUND: "Blog found successfully",
  BLOG_UNFLAGGED_SUCCESSFULLY: "Blog unflagged successfully",
  BLOG_FLAGGED_SUCCESSFULLY: "Blog flagged successfully",
  BLOG_LIKED_SUCCESSFULLY: "Blog liked successfully",
  BLOG_DISLIKED_SUCCESSFULLY: "Blog disliked successfully",
  BLOG_REACTION_REMOVED_SUCCESSFULLY: "Blog reaction removed successfully",
  BLOG_FETCHED_SUCCESSFULLY: "Blogs fetched successfully",
  BLOG_ID_REQUIRED: "Blog id is required",
  USER_BLOG_UPDATE: "User blog updated successfully",

  // $ Reviews
  REVIEW_CREATED_SUCCESSFULLY: "Review created successfully",
  REVIEW_UPDATED_SUCCESSFULLY: "Review updated successfully",
  REVIEW_DELETED_SUCCESSFULLY: "Review deleted successfully",
  REVIEW_NOT_FOUND: "Review not found",
  REVIEW_FOUND: "Review found successfully",
  REVIEW_FETCHED_SUCCESSFULLY: "Reviews fetched successfully",
  REVIEW_ID_REQUIRED: "Review id is required",
  USER_REVIEW_UPDATE: "User review updated successfully",
  REVIEW_NOT_CREATED: "Review not created",

  // # Contact
  CONTACT_MESSAGE_SENT_SUCCESSFULLY:
    "Thanks for reaching out, we will get back to you soon",
  CONTACT_MESSAGES_FETCHED_SUCCESSFULLY:
    "Contact messages fetched successfully",
  CONTACT_EMAIL_NOT_SENT: "Contact message saved but the e-mail was not sent",
  CONTACT_RECEIVER_NOT_SET: "CONTACT_RECEIVER_EMAIL is not set",
};

export const adminMessagesEnum = {
  // + Login & passwords
  INVALID_CREDENTIALS: "Invalid email or password",
  ACCOUNT_NOT_ACTIVE: status =>
    `Your account is ${status}; contact a super admin`,
  LOGIN_OTP_SENT: "Enter the code to finish signing in",
  LOGIN_SUCCESSFUL: "Login successful",
  PASSWORD_ALREADY_CREATED: "You have already created your password",
  PASSWORD_CREATED_SUCCESSFULLY: "Password created successfully",
  RESET_OTP_SENT: "Enter the code to reset your password",
  INVALID_RESET_TOKEN: "Password reset link is invalid or has expired",

  // + Auth
  ADMIN_EMAIL_EXISTS: "An admin with this email already exists",
  ADMIN_ALREADY_DELETED:
    "An admin with this email was deleted; restore them instead of inviting again",
  ADMIN_INVITED_SUCCESSFULLY: "Admin invited successfully",
  ROLE_INACTIVE: "This role is inactive and cannot be assigned",

  // * Admins
  ADMIN_NOT_FOUND: "Admin not found",
  PROFILE_ALREADY_COMPLETED: "Profile has already been completed",
  PROFILE_COMPLETED_SUCCESSFULLY: "Profile completed successfully",
  PROFILE_FETCHED_SUCCESSFULLY: "Profile fetched successfully",
  ADMINS_FETCHED_SUCCESSFULLY: "Admins fetched successfully",
  ADMIN_FETCHED_SUCCESSFULLY: "Admin fetched successfully",
  ADMIN_UPDATED_SUCCESSFULLY: "Admin updated successfully",
  SUPER_ADMIN_ROLE_NOT_ALLOWED:
    "Only a super admin can assign the super admin role",
  ADMIN_STATUS_UNCHANGED: status => `Admin is already ${status}`,
  ADMIN_STATUS_UPDATED_SUCCESSFULLY: "Admin status updated successfully",
  CANNOT_UPDATE_OWN_STATUS: "You cannot update your own status",
  CANNOT_DELETE_SELF: "You cannot delete your own account",
  ADMIN_DELETED_SUCCESSFULLY: "Admin deleted successfully",

  // # Resources
  RESOURCE_NOT_FOUND: "Resource not found",
  RESOURCE_EXISTS: "A resource with this name already exists",
  RESOURCE_CREATED_SUCCESSFULLY: "Resource created successfully",
  RESOURCE_RESTORED_SUCCESSFULLY:
    "A deleted resource with this name was restored",
  RESOURCE_FETCHED_SUCCESSFULLY: "Resource fetched successfully",
  RESOURCES_FETCHED_SUCCESSFULLY: "Resources fetched successfully",
  RESOURCE_UPDATED_SUCCESSFULLY: "Resource updated successfully",
  RESOURCE_DELETED_SUCCESSFULLY: "Resource deleted successfully",
  RESOURCES_NOT_FOUND: ids => `Resource(s) not found: ${ids.join(", ")}`,
  RESOURCE_REPEATED: id => `Resource ${id} is listed more than once`,

  // ? Roles
  ROLE_NOT_FOUND: "Role not found",
  ROLE_EXISTS: "A role with this name already exists",
  ROLE_IN_USE: "This role is still assigned to one or more admins",
  ROLE_STATUS_UNCHANGED: status => `Role is already ${status}`,
  ROLE_CREATED_SUCCESSFULLY: "Role created successfully",
  ROLES_FETCHED_SUCCESSFULLY: "Roles fetched successfully",
  ROLE_FETCHED_SUCCESSFULLY: "Role fetched successfully",
  ROLE_UPDATED_SUCCESSFULLY: "Role updated successfully",
  ROLE_STATUS_UPDATED_SUCCESSFULLY: "Role status updated successfully",
  ROLE_DELETED_SUCCESSFULLY: "Role deleted successfully",
  ROLE_PERMISSIONS_UPDATED_SUCCESSFULLY:
    "Role permissions updated successfully",

  // % Dashboard
  DASHBOARD_SUMMARY_FETCHED_SUCCESSFULLY:
    "Dashboard summary fetched successfully",
  DASHBOARD_TRENDS_FETCHED_SUCCESSFULLY:
    "Dashboard trends fetched successfully",
  DASHBOARD_BREAKDOWN_FETCHED_SUCCESSFULLY:
    "Dashboard breakdown fetched successfully",
  DASHBOARD_TOP_BLOGS_FETCHED_SUCCESSFULLY:
    "Most liked blogs fetched successfully",
  DASHBOARD_TOP_REVIEWS_FETCHED_SUCCESSFULLY:
    "Most liked reviews fetched successfully",
  DASHBOARD_TOTALS_FETCHED_SUCCESSFULLY:
    "Dashboard totals fetched successfully",
  ADMIN_BLOG_FETCHED_SUCCESSFULLY: "Blog fetched successfully",
  USER_ACTIVITY_FETCHED_SUCCESSFULLY: "User activity fetched successfully",
  ADMIN_ACTIVITY_FETCHED_SUCCESSFULLY: "Admin activity fetched successfully",
  ADMIN_BLOGS_FETCHED_SUCCESSFULLY: "Blogs fetched successfully",
  ADMIN_BLOGGERS_FETCHED_SUCCESSFULLY: "Bloggers fetched successfully",
  ADMIN_COMMENTS_FETCHED_SUCCESSFULLY: "Comments fetched successfully",
  ADMIN_CONTACTS_FETCHED_SUCCESSFULLY: "Contact messages fetched successfully",
};
