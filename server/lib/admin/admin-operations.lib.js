export const adminOperations = {
  // + Authentication Operations
  1: "ADMLGR", // admin login request
  2: "ADMLGA", // admin login approved
  3: "ADMCRPD", // admin creates new password
  4: "VRYRPDOP", // verify reset password otp
  5: "VRYLGOP", // verify login otp
  6: "ADMFGPD", // admin forgot password
  7: "ADRSPD", // admin reset password
  8: "ADCHPD", // admin change password

  // ? Role Operations
  9: "ADMCRTARLE", // create role type with permission
  10: "ADMEDTRLE", // edit role type with permission
  11: "ADMACTRLE", // admin activate role type
  12: "ADMDCTRLE", // admin deactivate role type
  13: "ADMDELRLE", // admin delete role type

  // * Admin Operations
  14: "ADMINVADM", // invite other admin
  15: "ADMACTADM", // admin activate admin
  16: "ADMDCTADM", // admin deactivate admin

  17: "ADMSUSADM", // admin suspends admin
  18: "ADMBLADM", // admin blacklists admin
  19: "ADMWLTADM", // admin watch lists admin
  20: "ADMDELADM", // admin deletes admin

  21: "UPTADMSTAS", // admin updates admin status

  // & Profile Operations
  22: "ADMCPPR", // admin completes profile
  23: "EDTADMPM", // admin edits profile


  //  - Admin Reources
  24: "ADMCRRES", // admin creates resources
  25: "ADMEDRES", // admin edits resources
  26: 'ADMDELRES', // admin deletes resources,
  
  //  _ Admin Permissions
  27: "EDTADMPM", // edit admin permissions,
  28: "ADMSTRLPM", // admin sets a role's permissions on resources

  // = Logout
  29: "ADMLGOUT", // admin logs out

  
};
