import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod = null;

/** Starts a temporary in-memory MongoDB and connects Mongoose to it. */
export async function startMemoryDB() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

/** Drops all data between tests so they do not affect each other. */
export async function clearDB() {
  const { collections } = mongoose.connection;
  for (const name of Object.keys(collections)) {
    await collections[name].deleteMany({});
  }
}

/** Stops the database and disconnects Mongoose. */
export async function stopMemoryDB() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  mongod = null;
}
