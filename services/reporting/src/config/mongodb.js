import mongoose from 'mongoose';
import 'dotenv/config';
let connectionPromise;
export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!process.env.MONGODB_URI) {
    const error = new Error('Missing database configuration: MONGODB_URI');
    error.status = 503;
    error.publicMessage =
      'ยังไม่ได้ตั้งค่า MONGODB_URI ของ Reporting จึงยังอ่าน Activity Logs ไม่ได้';
    throw error;
  }
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
