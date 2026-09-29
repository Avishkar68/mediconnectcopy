import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'mediconnect'
    });
    console.log(`MongoDB Atlas Connected: ${conn.connection.host} | DB: ${conn.connection.db.databaseName}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

