export default (res, data = {}) => res.status(403).json({ ...data });
