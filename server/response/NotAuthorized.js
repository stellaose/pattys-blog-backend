export default (res, data = {}) => res.status(401).json({ ...data });
