import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/env.setup.js"],
    testTimeout: 20000, // in-memory Mongo can take a moment to spin up on first run
    hookTimeout: 30000,
    globals: false,
    // Run test files sequentially — they share one in-memory MongoDB
    // instance per file via tests/db.js, and Mongoose model registration
    // is not safely parallelizable across workers in this setup.
    fileParallelism: false,
  },
});
