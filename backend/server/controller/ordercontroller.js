import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import Food from "../model/food.js";
import Order from "../model/order.js";
import QueueCounter from "../model/queuecounter.js";
import User from "../model/user.js";

// Allowed vendor progression; updates that skip a step are rejected below.
const vendorOrderStatusTransitions = {
	placed: "accepted",
	accepted: "preparing",
	preparing: "ready",
	ready: "collected",
};

// FR-03: Return only the signed-in student's saved food order history.
export const getOrderHistory = async (req, res) => {
	try {
		const orders = await Order.find({ student: req.user.id })
			.select("food vendor mealName category priceAtOrder items totalPrice pickupAt pickupToken queuePosition estimatedPickupAt status orderedAt")
			.populate("vendor", "name")
			.sort({ orderedAt: -1 })
			.lean();

		res.json({ orders });
	} catch (error) {
		console.error("Order history load failed:", error);
		res.status(500).json({ message: "Could not load order history" });
	}
};

// FR-04/05: Reserve cart inventory and create one pre-order with a pickup token and queue place.
export const createPreOrder = async (req, res) => {
	const reservations = [];
	try {
		const { items, pickupTime, vendorId } = req.body;
		const pickupAt = new Date(pickupTime);
		if (!Array.isArray(items) || items.length === 0 || items.length > 20 || Number.isNaN(pickupAt.getTime())) {
			return res.status(400).json({ message: "Add food to your cart and choose a valid pickup time" });
		}
		if (typeof vendorId !== "string" || !mongoose.isValidObjectId(vendorId)) {
			return res.status(400).json({ message: "Choose a valid vendor for this order" });
		}
		if (pickupAt <= new Date()) {
			return res.status(400).json({ message: "Pickup time must be in the future" });
		}
		const vendor = await User.findOne({ _id: vendorId, role: "vendor" }).select("name");
		if (!vendor) {
			return res.status(404).json({ message: "Selected vendor could not be found" });
		}

		const quantities = new Map();
		for (const item of items) {
			if (!item || typeof item.foodId !== "string" || !mongoose.isValidObjectId(item.foodId)
				|| !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
				return res.status(400).json({ message: "Cart contains an invalid food item or quantity" });
			}
			quantities.set(item.foodId, (quantities.get(item.foodId) || 0) + item.quantity);
		}
		if ([...quantities.values()].some((quantity) => quantity > 50)) {
			return res.status(400).json({ message: "A food item cannot exceed a quantity of 50 per order" });
		}

		const orderItems = [];
		let totalPrice = 0;
		for (const [foodId, quantity] of quantities) {
			const food = await Food.findOneAndUpdate(
				{
					_id: foodId,
					quantity: { $gte: quantity },
					available: { $ne: false },
					$or: [
						{ vendor: vendorId },
						{ vendor: null },
						{ vendor: { $exists: false } },
					],
				},
				{ $inc: { quantity: -quantity } },
				{ returnDocument: "after" },
			).select("name category price preparationTime");
			if (!food) {
				const unavailableFood = await Food.findById(foodId).select("vendor quantity available").lean();
				if (!unavailableFood) {
					throw Object.assign(new Error("A food item in your cart no longer exists"), { statusCode: 404 });
				}
				if (unavailableFood.vendor && unavailableFood.vendor.toString() !== vendorId) {
					throw Object.assign(new Error("Your cart contains food from a different vendor"), { statusCode: 400 });
				}
				if (unavailableFood.available === false) {
					throw Object.assign(new Error("A food item in your cart is currently unavailable"), { statusCode: 409 });
				}
				throw Object.assign(new Error("Not enough food is available to fulfill your cart"), { statusCode: 409 });
			}

			reservations.push({ foodId: food._id, quantity });
			orderItems.push({
				food: food._id,
				mealName: food.name,
				category: food.category,
				priceAtOrder: food.price,
				quantity,
				preparationTime: food.preparationTime,
			});
			totalPrice += food.price * quantity;
		}

		const day = `${vendorId}:${pickupAt.toISOString().slice(0, 10)}`;
		const counter = await QueueCounter.findOneAndUpdate(
			{ day },
			{ $inc: { value: 1 } },
			{ returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
		);
		const queuePosition = counter.value;
		const estimatedPickupAt = new Date(Math.max(Date.now(), pickupAt.getTime()) + (queuePosition - 1) * 5 * 60 * 1000);
		let pickupToken;
		do {
			pickupToken = randomBytes(4).toString("hex").toUpperCase();
		} while (await Order.exists({ pickupToken }));

		const order = await Order.create({
			student: req.user.id,
			vendor: vendorId,
			items: orderItems,
			totalPrice,
			pickupAt,
			pickupToken,
			queuePosition,
			estimatedPickupAt,
		});

		res.status(201).json({
			message: "Pre-order confirmed",
			order: {
				_id: order._id,
				vendor: { _id: order.vendor, name: vendor.name },
				items: order.items,
				totalPrice: order.totalPrice,
				pickupAt: order.pickupAt,
				pickupToken: order.pickupToken,
				queuePosition: order.queuePosition,
				estimatedPickupAt: order.estimatedPickupAt,
				status: order.status,
				orderedAt: order.orderedAt,
			},
		});
	} catch (error) {
		for (const reservation of reservations) {
			await Food.updateOne({ _id: reservation.foodId }, { $inc: { quantity: reservation.quantity } });
		}
		if (error.statusCode) {
			return res.status(error.statusCode).json({ message: error.message });
		}
		console.error("Pre-order creation failed:", error);
		res.status(500).json({ message: "Could not create the pre-order" });
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
			{ _id: foodId, quantity: { $gt: 0 }, available: { $ne: false } },
			{ $inc: { quantity: -1 } },
			{ returnDocument: "after" },
		).select("name category price quantity preparationTime");
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
				preparationTime: food.preparationTime,
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

		const orderFilter = { _id: orderId, status: "placed" };
		if (req.user.role !== "admin") orderFilter.student = req.user.id;
		const order = await Order.findOneAndUpdate(
			orderFilter,
			{ $set: { status: "cancelled" } },
			{ returnDocument: "after" },
		);
		if (!order) {
			return res.status(404).json({ message: "Order item not found or already removed" });
		}

		const returnedItems = order.items?.length
			? order.items.map((item) => ({ foodId: item.food, quantity: item.quantity }))
			: [{ foodId: order.food, quantity: 1 }];
		const restored = [];
		const remainingQuantities = [];
		for (const item of returnedItems) {
			const stockUpdate = await Food.updateOne(
				{ _id: item.foodId },
				{ $inc: { quantity: item.quantity } },
			);
			if (stockUpdate.matchedCount !== 1) {
				for (const restoredItem of restored) {
					await Food.updateOne({ _id: restoredItem.foodId }, { $inc: { quantity: -restoredItem.quantity } });
				}
				const restoreOrderFilter = { _id: order._id, status: "cancelled" };
				if (req.user.role !== "admin") restoreOrderFilter.student = req.user.id;
				await Order.updateOne(restoreOrderFilter, { $set: { status: "placed" } });
				return res.status(409).json({ message: "Could not restore stock; the order was not cancelled" });
			}
			restored.push(item);
			const food = await Food.findById(item.foodId).select("quantity").lean();
			remainingQuantities.push({ foodId: item.foodId.toString(), quantity: food.quantity });
		}

		res.json({
			message: "Order cancelled and stock restored.",
			orderId: order._id,
			remainingQuantities,
		});
	} catch (error) {
		console.error("Order item removal failed:", error);
		res.status(500).json({ message: "Could not remove this order item" });
	}
};

// Give administrators access to every student's orders.
export const getAdminOrders = async (_req, res) => {
	try {
		const orders = await Order.find()
			.populate("student", "name email studentId")
			.populate("vendor", "name")
			.select("student vendor food mealName category priceAtOrder items totalPrice pickupAt pickupToken queuePosition estimatedPickupAt status orderedAt")
			.sort({ orderedAt: -1 })
			.lean();
		res.json({ orders });
	} catch (error) {
		console.error("Admin order list load failed:", error);
		res.status(500).json({ message: "Could not load orders" });
	}
};

// Administrators may complete any active order; cancellation uses cancelOrder to restore stock.
export const completeAdminOrder = async (req, res) => {
	try {
		if (!mongoose.isValidObjectId(req.params.orderId)) {
			return res.status(404).json({ message: "Order not found" });
		}
		const order = await Order.findOneAndUpdate(
			{ _id: req.params.orderId, status: { $in: Object.keys(vendorOrderStatusTransitions) } },
			{ $set: { status: "collected" } },
			{ returnDocument: "after" },
		).select("_id status updatedAt");
		if (!order) {
			return res.status(404).json({ message: "Active order not found" });
		}
		res.json({ message: "Order marked as collected", order });
	} catch (error) {
		console.error("Admin order update failed:", error);
		res.status(500).json({ message: "Could not update order" });
	}
};

// FR-05: Show vendors the active campus pickup queue.
export const getVendorQueue = async (req, res) => {
	try {
		const orders = await Order.find({
			vendor: req.user.id,
			status: { $in: Object.keys(vendorOrderStatusTransitions) },
			items: { $exists: true, $ne: [] },
		})
			.populate("student", "name studentId")
			.select("student items totalPrice pickupAt pickupToken queuePosition estimatedPickupAt status orderedAt")
			.sort({ pickupAt: 1, queuePosition: 1 })
			.lean();
		res.json({ orders });
	} catch (error) {
		console.error("Vendor queue load failed:", error);
		res.status(500).json({ message: "Could not load the pickup queue" });
	}
};

// Vendors advance each pre-order through the pickup lifecycle in order.
export const updateVendorOrderStatus = async (req, res) => {
	try {
		const { orderId } = req.params;
		const { status } = req.body;
		if (!mongoose.isValidObjectId(orderId)) {
			return res.status(400).json({ message: "Choose a valid order" });
		}

		const currentOrder = await Order.findOne({
			_id: orderId,
			vendor: req.user.id,
			status: { $in: Object.keys(vendorOrderStatusTransitions) },
			items: { $exists: true, $ne: [] },
		}).select("status");
		if (!currentOrder) {
			return res.status(404).json({ message: "Active pre-order not found" });
		}

		const expectedStatus = vendorOrderStatusTransitions[currentOrder.status];
		if (status !== expectedStatus) {
			return res.status(400).json({ message: `Order must move to ${expectedStatus} next` });
		}

		const order = await Order.findOneAndUpdate(
			{ _id: currentOrder._id, vendor: req.user.id, status: currentOrder.status },
			{ $set: { status } },
			{ returnDocument: "after" },
		).select("_id status updatedAt");
		if (!order) {
			return res.status(409).json({ message: "Order status changed; refresh the pickup queue and try again" });
		}
		res.json({ message: `Order status updated to ${status}`, order });
	} catch (error) {
		console.error("Vendor order status update failed:", error);
		res.status(500).json({ message: "Could not update order status" });
	}
};