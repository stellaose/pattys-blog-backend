import { customAlphabet, nanoid } from "nanoid";

export const createId = (title, num) =>
  `${title}-${nanoid(num).replaceAll("_", "").replaceAll("-", "")}`;

export const createResourceId = index => `resource-00${index}`;

// ~ short uppercase code like the seeded roles' "DHGAB"
export const createRoleCode = () =>
  customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 5)();

// ! returned once when the admin is invited; they replace it on first sign-in
export const createTempPassword = () => nanoid(12);

export const getFullName = person => {
  return `${person.first_name} ${person.last_name}`;
};

export const percentChange = (current, previous) => {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

export const toAnchor = date => (date ? new Date(date) : new Date());