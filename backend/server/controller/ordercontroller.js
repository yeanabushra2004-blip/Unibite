import mongoose from "mongoose";
import Food from "../model/food.js";
import Order from "../model/order.js";

// FR-03: Return only the signed-in student's saved food order history.
export const getOrderHistory = async (req, res) => {
	try {
		const orders = await Order.find({ student: req.user.id })
			.select("food mealName category priceAtOrder status orderedAt")
			.sort({ orderedAt: -1 })
			.lean();

		res.json({ orders });
	} catch (error) {
		console.error("Order history load failed:", error);
		res.status(500).json({ message: "Could not load order history" });
	}
};

// FR-03: Atomically reserve one available item and record it in the student's order history.
export const createOrder = async (req, res) => {
	try {
		const { foodId } = req.body;
		if (typeof foodId !== "string" || !mongoose.isValidObjectId(foodId)) {
			return res.status(400).json({ message: "Choose a valid food item" });
		}

		const food = await Food.findOneAndUpdate(
			{ _id: foodId, quantity: { $gt: 0 } },
			{ $inc: { quantity: -1 } },
			{ new: true },
		).select("name category price quantity");
		if (!food) {
			return res.status(409).json({ message: "This food is sold out and not available right now" });
		}

		let order;
		try {
			order = await Order.create({
				student: req.user.id,
				food: food._id,
				mealName: food.name,
				category: food.category,
				priceAtOrder: food.price,
			});
		} catch (error) {
			// Restore one unit if order-history persistence fails after reserving stock.
			await Food.updateOne({ _id: food._id }, { $inc: { quantity: 1 } });
			throw error;
		}

		res.status(201).json({
			message: food.quantity === 0
				? "Order added. This food is now sold out."
				: `Order added. ${food.quantity} remaining.`,
			order: {
				_id: order._id,
				food: order.food,
				mealName: order.mealName,
				category: order.category,
				priceAtOrder: order.priceAtOrder,
				status: order.status,
				orderedAt: order.orderedAt,
				remainingQuantity: food.quantity,
			},
		});
	} catch (error) {
		console.error("Order creation failed:", error);
		res.status(500).json({ message: "Could not save the order" });
	}
};

// FR-03: Let a student remove one of their active order items and restore its stock.
export const cancelOrder = async (req, res) => {
	try {
		const { orderId } = req.params;
		if (!mongoose.isValidObjectId(orderId)) {
			return res.status(400).json({ message: "Choose a valid order item" });
		}

		const order = await Order.findOneAndUpdate(
			{ _id: orderId, student: req.user.id, status: "placed" },
			{ $set: { status: "cancelled" } },
			{ new: true },
		);
		if (!order) {
			return res.status(404).json({ message: "Order item not found or already removed" });
		}

		const stockUpdate = await Food.updateOne(
			{ _id: order.food },
			{ $inc: { quantity: 1 } },
		);
		if (stockUpdate.matchedCount !== 1) {
			await Order.updateOne(
				{ _id: order._id, student: req.user.id, status: "cancelled" },
				{ $set: { status: "placed" } },
			);
			return res.status(409).json({ message: "Could not restore stock; the order was not removed" });
		}

		const food = await Food.findById(order.food).select("quantity").lean();
		res.json({
			message: `${order.mealName} removed from your order.`,
			orderId: order._id,
			remainingQuantity: food.quantity,
		});
	} catch (error) {
		console.error("Order item removal failed:", error);
		res.status(500).json({ message: "Could not remove this order item" });
	}
};