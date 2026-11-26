import mongoose from "mongoose";

// Snapshot each cart line so its order-time price and preparation time stay fixed.
const orderItemSchema = new mongoose.Schema(
	{
		food: { type: mongoose.Schema.Types.ObjectId, ref: "Food", required: true },
		mealName: { type: String, required: true },
		category: { type: String, required: true, enum: ["Breakfast", "Lunch", "Drinks"] },
		priceAtOrder: { type: Number, required: true, min: 0 },
		quantity: { type: Number, required: true, min: 1 },
		preparationTime: { type: Number, min: 1, max: 240 },
	},
	{ _id: false },
);

// Stores student/vendor ownership, pickup queue data, and the order lifecycle status.
const orderSchema = new mongoose.Schema(
	{
		student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
		vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
		food: { type: mongoose.Schema.Types.ObjectId, ref: "Food" },
		mealName: { type: String },
		category: { type: String, enum: ["Breakfast", "Lunch", "Drinks"] },
		priceAtOrder: { type: Number, min: 0 },
		items: { type: [orderItemSchema], default: undefined },
		totalPrice: { type: Number, min: 0 },
		pickupAt: { type: Date },
		pickupToken: { type: String, unique: true, sparse: true },
		queuePosition: { type: Number, min: 1 },
		estimatedPickupAt: { type: Date },
		status: { type: String, enum: ["placed", "accepted", "preparing", "ready", "collected", "completed", "cancelled"], default: "placed" },
		orderedAt: { type: Date, default: Date.now },
	},
	{ timestamps: true },
);

const Order = mongoose.model("Order", orderSchema);

export default Order;