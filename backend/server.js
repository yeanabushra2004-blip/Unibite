import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./server/routes/authroutes.js";
import foodRoutes from "./server/routes/foodroutes.js";
import orderRoutes from "./server/routes/orderriutes.js";
import Food from "./server/model/food.js";
import User from "./server/model/user.js";
import defaultFoods from "./server/data/defaultFoods.js";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const app = express();

// Allow the React client to call this API and read JSON request bodies.
app.use(cors());
app.use(express.json());

// All authentication endpoints are available under /api/auth.
app.use("/api/auth", authRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/orders", orderRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/unibite";
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || "unibite";

// FR-03: Populate the MongoDB menu once, without overwriting vendor-managed food records.
const seedFoodCatalog = async () => {
	const foodCount = await Food.countDocuments();
	if (foodCount === 0) {
		await Food.insertMany(defaultFoods);
		console.log(`Added ${defaultFoods.length} starter foods to MongoDB.`);
	}

	// Initialize inventory for foods created before quantity tracking was introduced.
	const { modifiedCount } = await Food.updateMany(
		{ quantity: { $exists: false } },
		{ $set: { quantity: 20 } },
	);
	if (modifiedCount > 0) {
		console.log(`Initialized inventory for ${modifiedCount} existing foods.`);
	}
};

// Replace the old global food-name index and backfill defaults for legacy menu records.
const migrateFoodNameIndex = async () => {
	const collections = await Food.db.db
		.listCollections({ name: Food.collection.name }, { nameOnly: true })
		.toArray();
	if (collections.length === 0) {
		await Food.createCollection();
	}

	const indexes = await Food.collection.indexes();
	const legacyIndex = indexes.find((index) =>
		index.name === "name_1"
		&& index.unique
		&& Object.keys(index.key).length === 1
		&& index.key.name === 1);
	if (legacyIndex) {
		await Food.collection.dropIndex(legacyIndex.name);
	}

	await Food.updateMany(
		{ available: { $exists: false } },
		{ $set: { available: true } },
	);
	await Food.updateMany(
		{ imageUrl: { $exists: false } },
		{ $set: { imageUrl: "" } },
	);
	await Food.updateMany(
		{ preparationTime: { $exists: false } },
		{ $set: { preparationTime: 15 } },
	);
	await Food.updateMany(
		{ vendor: { $exists: false } },
		{ $set: { vendor: null } },
	);
	await Food.createIndexes();
};

const provisionOwnerAdmin = async () => {
	const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
	const password = process.env.ADMIN_PASSWORD;
	if (!email && !password) return;
	if (!email || !password || password.length < 6) {
		throw new Error("Set both ADMIN_EMAIL and an ADMIN_PASSWORD of at least 6 characters.");
	}

	let admin = await User.findOne({ email });
	if (!admin) {
		admin = new User({
			name: process.env.ADMIN_NAME?.trim() || "UniBite Owner",
			studentId: `ADMIN-${email}`,
			email,
			phone: "0000000000",
		});
	}
	admin.name = process.env.ADMIN_NAME?.trim() || admin.name;
	admin.role = "admin";
	admin.password = password;
	await admin.save();
	console.log(`Owner admin account provisioned for ${email}.`);
};

// Connect to MongoDB before opening the API port.
const startServer = async () => {
	try {
		if (typeof process.env.JWT_SECRET !== "string" || process.env.JWT_SECRET.length < 32) {
			throw new Error("Set JWT_SECRET to a unique value of at least 32 characters in the project-root .env.local file.");
		}

		await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DATABASE });
		console.log("MongoDB connected successfully.");
		await migrateFoodNameIndex();
		// Existing accounts predate the approval field and remain active.
		await provisionOwnerAdmin();
		await seedFoodCatalog();

		// Start accepting requests only after the database is ready.
		app.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`);
		});
	} catch (error) {
		console.error("Backend startup failed:", error.message);
		process.exit(1);
	}
};

startServer();
