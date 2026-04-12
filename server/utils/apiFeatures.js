class ApiFeatures {
  constructor(query, queryStr, options = {}) {
    this.query = query;
    this.queryStr = queryStr;
    this.options = {
      searchableFields:
        options.searchableFields ?? [
          "title",
          "description",
          "first_name",
          "last_name",
          "user_name",
        ],
      filterAllowlist: options.filterAllowlist ?? null,
    };
  }

  search() {
    const keyword = this.queryStr.keyword;
    if (!keyword) {
      return this;
    }

    const orConditions = this.options.searchableFields.map(field => ({
      [field]: {
        $regex: keyword,
        $options: "i",
      },
    }));

    this.query = this.query.find({ $or: orConditions });
    return this;
  }

  filter() {
    const queryCopy = { ...this.queryStr };

    const removeFields = ["keyword", "page", "limit", "sort"];
    removeFields.forEach(key => delete queryCopy[key]);

    if (this.options.filterAllowlist?.length) {
      const allow = new Set(this.options.filterAllowlist);
      Object.keys(queryCopy).forEach(key => {
        if (!allow.has(key)) delete queryCopy[key];
      });
    }

    let queryStr = JSON.stringify(queryCopy);
    if (queryStr === "{}") {
      return this;
    }

    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, key => `$${key}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    const sortBy = this.queryStr.sort;
    if (!sortBy) {
      return this;
    }

    const sortObj = {};
    for (const part of sortBy.split(",").map(s => s.trim()).filter(Boolean)) {
      if (part.startsWith("-")) {
        sortObj[part.slice(1)] = -1;
      } else {
        sortObj[part] = 1;
      }
    }

    if (Object.keys(sortObj).length) {
      this.query = this.query.sort(sortObj);
    }

    return this;
  }

  pagination(resultPerPage) {
    const currentPage = Number(this.queryStr.page) || 1;
    const skip = resultPerPage * (currentPage - 1);

    this.query = this.query.limit(resultPerPage).skip(skip);

    return this;
  }
}

export default ApiFeatures;
