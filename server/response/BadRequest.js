export default (res, data = {}) => res.status(400).json({ ...data });
