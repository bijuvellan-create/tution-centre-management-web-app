import mongoose from 'mongoose';

// Holds the temporary in-memory MongoDB used only for local development.
let memoryServer = null;

/**
 * Opens a single shared MongoDB connection.
 * Mongoose keeps a global connection, so this only needs to be called once.
 */
export async function connectDB(uri) {
  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });

  return mongoose.connection;
}

/**
 * Starts a disposable in-memory MongoDB (development only, no install needed
 * beyond the dev dependency). Returns a connection string for it.
 */
export async function startMemoryDB(dbName = 'smart_tuition') {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  return memoryServer.getUri(dbName);
}

/** Stops the temporary in-memory MongoDB, if one is running. */
export async function stopMemoryDB() {
  if (memoryServer) {
    await memoryServer.stop().catch(() => {});
    memoryServer = null;
  }
}

/** Closes the connection (used on shutdown and in tests). */
export async function disconnectDB() {
  await mongoose.disconnect();
}

/** A friendly text version of the current connection state. */
export function dbStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized',
  };
  return states[mongoose.connection.readyState] ?? 'unknown';
}

/** True only when the database is fully connected. */
export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}
