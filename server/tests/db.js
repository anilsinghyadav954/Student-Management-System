import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

/**
 * Spins up an in-memory MongoDB instance and connects Mongoose to it.
 * Call once in a `beforeAll` per test file. Using an in-memory DB (rather
 * than mocking Mongoose) means tests exercise real schema validation,
 * indexes, and hooks — the same code path as production.
 */
export const connectTestDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

/**
 * Clears all collections between tests so each test starts with a clean
 * slate, without paying the cost of tearing down/recreating the whole
 * in-memory server every time.
 */
export const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Disconnects and stops the in-memory server. Call once in `afterAll`.
 */
export const closeTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
};
