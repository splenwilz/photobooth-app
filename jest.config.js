module.exports = {
  preset: "jest-expo",
  // Pins TZ=UTC before workers fork — see jest.global-setup.js for why this
  // cannot live in setupFiles.
  globalSetup: "<rootDir>/jest.global-setup.js",
  setupFiles: ["./jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@tanstack/.*|zustand)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};
