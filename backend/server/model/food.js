import mongoose from "mongoose";

// MongoDB shape for menu items, including vendor ownership and ordering details.
const foodSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		detail: { type: String, required: true, trim: true },
		category: { type: String, required: true, enum: ["Breakfast", "Lunch", "Drinks"] },
		price: { type: Number, required: true, min: 0 },
		quantity: { type: Number, required: true, min: 0, default: 20 },
		available: { type: Boolean, default: true },
		imageUrl: { type: String, trim: true, default: "" },
		preparationTime: { type: Number, required: true, min: 1, max: 240, default: 15 },
		vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
		tone: { type: String, required: true, enum: ["green", "orange", "red"], default: "green" },
	},
	{ timestamps: true },
);

// Food names must be unique within a vendor's menu, not across all vendors.
foodSchema.index({ vendor: 1, name: 1 }, { unique: true });

const Food = mongoose.model("Food", foodSchema);

export default Food;