const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    files: ["server/**/*.{js,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.node,
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-console": "warn",
      "no-undef": "error",
    },
  },
  {
    files: ["server/**/__tests__/**/*.js", "server/**/*.test.js"],
    languageOptions: {
      globals: globals.jest,
    },
  },
  {
    files: ["server/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
    },
  },
];
