import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
	{
		student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
		food: { type: mongoose.Schema.Types.ObjectId, ref: "Food", required: true },
		mealName: { type: String, required: true },
		category: { type: String, required: true, enum: ["Breakfast", "Lunch", "Drinks"] },
		priceAtOrder: { type: Number, required: true, min: 0 },
		status: { type: String, enum: ["placed", "completed", "cancelled"], default: "placed" },
		orderedAt: { type: Date, default: Date.now },
	},
	{ timestamps: true },
);

const Order = mongoose.model("Order", orderSchema);

export default Order;