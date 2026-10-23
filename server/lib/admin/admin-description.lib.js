export const descriptions = {
  // + Authentication Operations
  login_request: adminName => `${adminName} initiated a login request`,
  login_request_failed: adminName =>
    `${adminName} failed to initiate a login request`,
  login_approved: adminName =>
    `${adminName} successfully authenticated and accessed the platform`,
  login_approved_failed: adminName => `${adminName}login authentication failed`,
  new_password: adminName => `${adminName} created a new password successfully`,
  new_password_failed: adminName =>
    `${adminName} failed to create a new password`,
  verify_reset_pass_otp: adminName =>
    `${adminName} successfully verified password reset OTP`,
  verify_reset_pass_otp_failed: adminName =>
    `${adminName} failed to verify password reset OTP`,
  verify_login_otp: adminName => `${adminName} successfully verified login OTP`,
  verify_login_otp_failed: adminName =>
    ` ${adminName} failed to verify login OTP`,
  forgot_password: adminName =>
    `${adminName} initiated a password reset request`,
  forgot_password_failed: adminName =>
    `${adminName} failed to initiate a password reset request`,
  reset_password: adminName =>
    `${adminName} reset account password successfully`,
  reset_password_failed: adminName =>
    `${adminName} account password reset failed`,
  change_password: adminName =>
    `${adminName} updated account password successfully`,
  change_password_failed: adminName =>
    `${adminName} account password update failed`,

  // ? Role Operations
  create_role: (adminName, roleName) => `${adminName} created role ${roleName}`,
  create_role_failed: (adminName, roleName) =>
    `${adminName} failed to create role ${roleName}`,
  edit_role: (adminName, roleName) => `${adminName} updated role ${roleName}`,
  edit_role_failed: (adminName, roleName) =>
    `${adminName} failed to update role ${roleName}`,
  activate_role: (adminName, roleName) =>
    `${adminName} activated role ${roleName}`,
  activate_role_failed: (adminName, roleName) =>
    `${adminName} failed to activate role ${roleName}`,
  deactivate_role: (adminName, roleName) =>
    `${adminName} deactivated role ${roleName}`,
  deactivate_role_failed: (adminName, roleName) =>
    `${adminName} failed to deactivate role ${roleName}`,
  delete_role: (adminName, roleName) => `${adminName} deleted role ${roleName}`,
  delete_role_failed: (adminName, roleName) =>
    `${adminName} failed to delete role ${roleName}`,

  // * Admin Operations
  invite_admin: (adminName, newAdmin) =>
    `${adminName} invited administrator ${newAdmin}`,
  invite_admin_failed: (adminName, newAdmin) =>
    `${adminName} failed to invite administrator ${newAdmin}`,
  activate_admin: (adminName, recipient) =>
    `${adminName} activated administrator${recipient} successfully`,
  activate_admin_failed: (adminName, recipient) =>
    `${adminName} failed to activate administrator ${recipient}`,
  deactivate_admin: (adminName, recipient) =>
    `${adminName} deactivated administrator ${recipient}`,
  deactivate_admin_failed: (adminName, recipient) =>
    `${adminName} failed to deactivate administrator ${recipient}`,
  delete_admin: (adminName, recipient) =>
    `${adminName} deleted administrator ${recipient}`,
  delete_admin_failed: (adminName, recipient) =>
    `${adminName} failed to delete administrator ${recipient}`,
  update_admin_status: (adminName, recipient) =>
    `${adminName} updated admin ${recipient}'s status`,
  update_admin_status_failed: (adminName, recipient) =>
    `${adminName} failed to update admin ${recipient} status`,

  // & Profile Operations
  completes_profile: adminName =>
    ` ${adminName} completed onboarding profile setup`,

  completes_profile_failed: adminName =>
    `${adminName} failed to complete onboarding profile setup`,
  edit_admin_profile: adminName => ` ${adminName} updated profile information`,
  edit_admin_profile_failed: adminName =>
    ` ${adminName} failed to update profile information`,

  // ` Blog Operations
  create_blog: (adminName, blogId) => `${adminName} created blog ${blogId}`,
  create_blog_failed: (adminName, blogId) =>
    `${adminName} failed to create blog ${blogId}`,
  edit_blog: (adminName, blogId) => `${adminName} edited blog ${blogId}`,
  edit_blog_failed: (adminName, blogId) =>
    `${adminName} failed to edit blog ${blogId}`,
  delete_blog: (adminName, blogId) => `${adminName} deleted blog ${blogId}`,
  delete_blog_failed: (adminName, blogId) =>
    `${adminName} failed to delete blog ${blogId}`,
  
  // > Blogger Operations
  create_blogger: (adminName, bloggerUsername) => `${adminName} creates blogger with username ${bloggerUsername}`,
  create_blogger_failed: (adminName, bloggerUsername) => `${adminName} failed to create blogger with username ${bloggerUsername}`,
  edit_blogger: (adminName, bloggerUsername) => `${adminName} edited blogger with username ${bloggerUsername}`,
  edit_blogger_failed: (adminName, bloggerUsername) => `${adminName} failed to edit blogger with username ${bloggerUsername}`,
  activate_blogger: (adminName, bloggerUsername) => `${adminName} activated blogger with username ${bloggerUsername}`,
  activate_blogger_failed: (adminName, bloggerUsername) => `${adminName} failed to activate blogger with username ${bloggerUsername}`,
  deactivate_blogger: (adminName, bloggerUsername) => `${adminName} deactivated blogger with username ${bloggerUsername}`,
  deactivate_blogger_failed: (adminName, bloggerUsername) => `${adminName} failed to deactivate blogger with username ${bloggerUsername}`,
  delete_blogger: (adminName, bloggerUsername) => `${adminName} deleted blogger with username ${bloggerUsername}`,
  delete_blogger_failed: (adminName, bloggerUsername) => `${adminName} failed to edit blogger with username ${bloggerUsername}`,

  // # Permission Operations
  edit_admin_permissions: (adminName, recipient) =>
    `${adminName} successfully updated permissions for administrator ${recipient}`,
  edit_admin_permissions_failed: (adminName, recipient) =>
    `${adminName} failed to update permissions for administrator ${recipient}`,
  create_role_permission: (adminName, roleName) =>
    `${adminName} successfully created role ${roleName} with permissions`,
  create_role_permission_failed: (adminName, roleName) =>
    `${adminName} failed to create role ${roleName} with permissions`,

  // = Logout Operations
  logout: adminName => `${adminName} logged out`,
  logout_failed: adminName => `${adminName} failed to log out`,
};
