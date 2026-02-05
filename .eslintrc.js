module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: [
    "eslint:recommended",
    "@eslint/js/recommended",
    "plugin:jest/recommended",
    "prettier",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "prettier/prettier": "error",
    "jest/no-disabled-tests": "warn",
    "jest/no-focused-tests": "error",
    "jest/no-identical-title": "error",
    "jest/prefer-to-have-length": "warn",
    "jest/valid-expect": "error",
    // Error Prevention
    "no-console": "warn",
    "no-debugger": "error",
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-undef": "error",

    // Best Practices
    eqeqeq: ["error", "always"],
    curly: ["error", "all"],
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-return-assign": "error",
    "no-sequences": "error",
    "no-throw-literal": "error",
    "no-unmodified-loop-condition": "error",
    "no-useless-call": "error",
    "no-useless-concat": "error",
    "prefer-promise-reject-errors": "error",

    // Node.js Specific
    "no-path-concat": "error",
    "no-process-exit": "error",

    // Style (handled by Prettier, but some logical ones)
    "no-multiple-empty-lines": ["error", { max: 2, maxEOF: 1 }],
    "no-trailing-spaces": "error",
    "eol-last": "error",

    // ES6+
    "prefer-const": "error",
    "no-var": "error",
    "prefer-arrow-callback": "error",
    "prefer-template": "error",
    "object-shorthand": "error",
    "prefer-destructuring": [
      "error",
      {
        array: false,
        object: true,
      },
    ],
  },
  overrides: [
    {
      files: ["**/__tests__/**/*.js", "**/*.test.js", "**/*.spec.js"],
      env: {
        jest: true,
      },
      rules: {
        "no-console": "off",
      },
    },
  ],
};