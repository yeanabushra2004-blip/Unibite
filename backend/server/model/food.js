import mongoose from "mongoose";

const foodSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true, unique: true },
		detail: { type: String, required: true, trim: true },
		category: { type: String, required: true, enum: ["Breakfast", "Lunch", "Drinks"] },
		price: { type: Number, required: true, min: 0 },
		quantity: { type: Number, required: true, min: 0, default: 20 },
		tone: { type: String, required: true, enum: ["green", "orange", "red"], default: "green" },
	},
	{ timestamps: true },
);

const Food = mongoose.model("Food", foodSchema);

export default Food;