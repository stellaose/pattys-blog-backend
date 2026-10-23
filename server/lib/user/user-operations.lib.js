export const operations = {
  // + Authentication Operations
  1: "USRSGNUP", // user signs up
  2: "USRVRYEML", // user verifies email
  3: "USRRSDOTP", // user resends otp
  4: "USRLGN", // user logs in
  5: "USRFGPD", // user forgot password
  6: "USRVRYFGPD", // user verifies forgot password otp
  7: "USRRSPD", // user resets password
  8: "USRCHPD", // user changes password
  9: "USRLGOUT", // user logs out

  // & Profile Operations
  10: "USREDTPR", // user edits profile
  11: "USRDELACC", // user deletes account

  // ` Blog Operations
  12: "USRCRBLG", // user creates blog
  13: "USREDTBLG", // user edits blog
  14: "USRDELBLG", // user deletes blog
  15: "USRLKBLG", // user likes blog
  16: "USRDLKBLG", // user dislikes blog

  // ? Review Operations
  17: "USRCRRVW", // user creates review
  18: "USRDELRVW", // user deletes review
};
