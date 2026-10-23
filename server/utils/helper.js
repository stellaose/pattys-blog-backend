import { nanoid } from "nanoid";

export const createId = (title, num) =>
  `${title}-${nanoid(num).replaceAll("_", "").replaceAll("-", "")}`;

export const createResourceId = index => `resource-00${index}`;
