export default {
  testEnvironment: 'node',
  transform: {
        "^.+\\.js$": "babel-jest"
   },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
 
  setupFilesAfterEnv: [],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/node_modules/**',
    '!server/__tests__/**'
  ]
};