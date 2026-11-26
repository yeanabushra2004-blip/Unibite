import mongoose from "mongoose";
import Food from "../model/food.js";
import Order from "../model/order.js";

// Search and filter the public food catalog.
export const getFoods = async (req, res) => {
	try {
		const { search = "", category, minPrice, maxPrice } = req.query;
		const query = {};
		if (typeof search === "string" && search.trim()) {
			const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			query.$or = [
				{ name: { $regex: safeSearch, $options: "i" } },
				{ detail: { $regex: safeSearch, $options: "i" } },
				{ category: { $regex: safeSearch, $options: "i" } },
			];
		}
		if (category && category !== "All") {
			if (!["Breakfast", "Lunch", "Drinks"].includes(category)) {
				return res.status(400).json({ message: "Choose a valid food category" });
			}
			query.category = category;
		}
		if (minPrice !== undefined || maxPrice !== undefined) {
			const min = minPrice === undefined ? 0 : Number(minPrice);
			const max = maxPrice === undefined ? Number.MAX_SAFE_INTEGER : Number(maxPrice);
			if (!Number.isFinite(min) || min < 0 || !Number.isFinite(max) || max < min) {
				return res.status(400).json({ message: "Enter a valid minimum and maximum price" });
			}
			query.price = { $gte: min, $lte: max };
		}

		const foods = await Food.find(query)
			.select("name detail category price quantity available imageUrl preparationTime vendor tone")
			.populate("vendor", "name")
			.sort({ category: 1, name: 1 })
			.lean();

		res.json({ foods });
	} catch (error) {
		console.error("Food catalog load failed:", error);
		res.status(500).json({ message: "Could not load the food catalog" });
	}
};

// Return only the menu owned by the authenticated vendor.
export const getVendorFoods = async (req, res) => {
	try {
		const foods = await Food.find({ vendor: req.user.id })
			.select("name detail category price quantity available imageUrl preparationTime tone")
			.sort({ name: 1 })
			.lean();
		res.json({ foods });
	} catch (error) {
		console.error("Vendor menu load failed:", error);
		res.status(500).json({ message: "Could not load your menu" });
	}
};

// Food images are optional, but supplied URLs must use HTTP or HTTPS.
const isValidImageUrl = (value) => {
	if (value === "") return true;
	if (typeof value !== "string") return false;
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:";
	} catch {
		return false;
	}
};

// Vendors are scoped to their own items; admins can manage the full catalog.
const foodScope = (req) => req.user.role === "vendor" ? { vendor: req.user.id } : {};

// Vendors manage their own items; administrators retain catalog-wide management.
export const createFood = async (req, res) => {
	try {
		const {
			name, detail, category, price, quantity, available = true,
			imageUrl = "", preparationTime = 15, tone = "green",
		} = req.body;
		const numericPrice = Number(price);
		const numericQuantity = Number(quantity);
		const numericPreparationTime = Number(preparationTime);
		if (typeof name !== "string" || !name.trim()
			|| typeof detail !== "string" || !detail.trim()
			|| !["Breakfast", "Lunch", "Drinks"].includes(category)
			|| !Number.isFinite(numericPrice) || numericPrice < 0
			|| !Number.isInteger(numericQuantity) || numericQuantity < 0
			|| typeof available !== "boolean"
			|| !isValidImageUrl(imageUrl)
			|| !Number.isInteger(numericPreparationTime) || numericPreparationTime < 1 || numericPreparationTime > 240
			|| !["green", "orange", "red"].includes(tone)) {
			return res.status(400).json({ message: "Enter valid food details, price, stock, availability, image URL, preparation time, and tone" });
		}

		const food = await Food.create({
			name: name.trim(),
			detail: detail.trim(),
			category,
			price: numericPrice,
			quantity: numericQuantity,
			available,
			imageUrl: imageUrl.trim(),
			preparationTime: numericPreparationTime,
			vendor: req.user.role === "vendor" ? req.user.id : null,
			tone,
		});
		res.status(201).json({ message: "Food added to the menu", food });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ message: "A food with this name already exists in your menu" });
		}
		console.error("Food creation failed:", error);
		res.status(500).json({ message: "Could not add food" });
	}
};

// Update allowed food fields while restricting vendors to their own menu.
export const updateFood = async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.foodId)) {
			return res.status(404).json({ message: "Food item not found" });
		}
		const updates = {};
		const { name, detail, category, price, quantity, available, imageUrl, preparationTime, tone } = req.body;
		if (name !== undefined) {
			if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "Enter a valid food name" });
			updates.name = name.trim();
		}
		if (detail !== undefined) {
			if (typeof detail !== "string" || !detail.trim()) return res.status(400).json({ message: "Enter valid food details" });
			updates.detail = detail.trim();
		}
		if (category !== undefined) {
			if (!["Breakfast", "Lunch", "Drinks"].includes(category)) return res.status(400).json({ message: "Choose a valid food category" });
			updates.category = category;
		}
		if (price !== undefined) {
			const numericPrice = Number(price);
			if (!Number.isFinite(numericPrice) || numericPrice < 0) return res.status(400).json({ message: "Enter a valid food price" });
			updates.price = numericPrice;
		}
		if (quantity !== undefined) {
			const numericQuantity = Number(quantity);
			if (!Number.isInteger(numericQuantity) || numericQuantity < 0) return res.status(400).json({ message: "Enter a valid food quantity" });
			updates.quantity = numericQuantity;
		}
		if (available !== undefined) {
			if (typeof available !== "boolean") return res.status(400).json({ message: "Choose whether this food is available" });
			updates.available = available;
		}
		if (imageUrl !== undefined) {
			if (!isValidImageUrl(imageUrl)) return res.status(400).json({ message: "Enter a valid HTTP or HTTPS image URL" });
			updates.imageUrl = imageUrl.trim();
		}
		if (preparationTime !== undefined) {
			const numericPreparationTime = Number(preparationTime);
			if (!Number.isInteger(numericPreparationTime) || numericPreparationTime < 1 || numericPreparationTime > 240) {
				return res.status(400).json({ message: "Preparation time must be between 1 and 240 minutes" });
			}
			updates.preparationTime = numericPreparationTime;
		}
		if (tone !== undefined) {
			if (!["green", "orange", "red"].includes(tone)) return res.status(400).json({ message: "Choose a valid food tone" });
			updates.tone = tone;
		}
		if (Object.keys(updates).length === 0) {
			return res.status(400).json({ message: "Provide at least one food field to update" });
		}

		const food = await Food.findOneAndUpdate(
			{ _id: req.params.foodId, ...foodScope(req) },
			{ $set: updates },
			{ returnDocument: "after", runValidators: true },
		);
		if (!food) return res.status(404).json({ message: "Food item not found" });
		res.json({ message: "Food updated", food });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ message: "A food with this name already exists in your menu" });
		}
		console.error("Food update failed:", error);
		res.status(500).json({ message: "Could not update food" });
	}
};

// Protect active orders from losing their food record while a vendor is preparing them.
export const deleteFood = async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.foodId)) {
			return res.status(404).json({ message: "Food item not found" });
		}
		const food = await Food.findOne({ _id: req.params.foodId, ...foodScope(req) }).select("name");
		if (!food) return res.status(404).json({ message: "Food item not found" });

		const hasActiveOrder = await Order.exists({
			status: { $in: ["placed", "accepted", "preparing", "ready"] },
			$or: [
				{ food: food._id },
				{ items: { $elemMatch: { food: food._id } } },
			],
		});
		if (hasActiveOrder) {
			return res.status(409).json({ message: "Food cannot be deleted while active orders contain it" });
		}

		await food.deleteOne();
		res.json({ message: `${food.name} removed from the menu` });
	} catch (error) {
		console.error("Food deletion failed:", error);
		res.status(500).json({ message: "Could not delete food" });
	}
};