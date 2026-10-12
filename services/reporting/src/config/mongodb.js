import mongoose from 'mongoose';
import 'dotenv/config';
let connectionPromise;
export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!process.env.MONGODB_URI)
    throw new Error('Missing database configuration: MONGODB_URI');
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
      })
      .finally(() => {
        connectionPromise = undefined;
      });
  }
  return connectionPromise;
}
export async function disconnectMongo() {
  await mongoose.disconnect();
  connectionPromise = undefined;
}
