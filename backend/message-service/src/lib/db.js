import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        const MONGODB_URI = process.env.MONGO_URI;
        if (!MONGODB_URI) {
            throw new Error('MongoDB URI is not defined');
        }

        console.log('Attempting to connect to MongoDB...');
        const connection = await mongoose.connect(MONGODB_URI);
        console.log(`MongoDB connected: ${connection.connection.host}`);
    } catch (error) {
        console.error(`Error in the DB connection: ${error.message}`);
        process.exit(1);
    }
}; 