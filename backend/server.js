import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./server/routes/authRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/unibite";

const connectDB = async () => {
	try {
		await mongoose.connect(MONGODB_URI);
		console.log("MongoDB Atlas connected successfully.");
	} catch (error) {
		console.error("MongoDB connection failed:", error.message);
	}
};

connectDB();

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
