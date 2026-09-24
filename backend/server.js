import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./server/routes/authroutes.js";

dotenv.config();

const app = express();

// Allow the React client to call this API and read JSON request bodies.
app.use(cors());
app.use(express.json());

// All authentication endpoints are available under /api/auth.
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/unibite";

// Connect to MongoDB before opening the API port.
const startServer = async () => {
	try {
		await mongoose.connect(MONGODB_URI);
		console.log("MongoDB connected successfully.");

		// Start accepting requests only after the database is ready.
		app.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`);
		});
	} catch (error) {
		console.error("MongoDB connection failed:", error.message);
		process.exit(1);
	}
};

startServer();
