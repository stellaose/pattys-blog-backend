export default (res, data = {}) => res.status(404).json({ ...data });
