const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    files: ["server/**/*.js", "server/**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
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
      "no-undef": "warn",
    },
  },
];
