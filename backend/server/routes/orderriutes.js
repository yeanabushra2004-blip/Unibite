import express from "express";
import {
	cancelOrder,
	completeAdminOrder,
	createOrder,
	createPreOrder,
	getAdminOrders,
	getOrderHistory,
	getVendorQueue,
	updateVendorOrderStatus,
} from "../controller/ordercontroller.js";
import { authenticate, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

router.get("/admin", authenticate, authorizeRoles("admin"), getAdminOrders);
router.patch("/admin/:orderId/complete", authenticate, authorizeRoles("admin"), completeAdminOrder);
router.delete("/admin/:orderId", authenticate, authorizeRoles("admin"), cancelOrder);
router.get("/", authenticate, authorizeRoles("user"), getOrderHistory);
router.post("/", authenticate, authorizeRoles("user"), createOrder);
router.post("/preorder", authenticate, authorizeRoles("user"), createPreOrder);
router.get("/vendor/queue", authenticate, authorizeRoles("vendor"), getVendorQueue);
router.patch("/vendor/:orderId/status", authenticate, authorizeRoles("vendor"), updateVendorOrderStatus);
router.delete("/:orderId", authenticate, authorizeRoles("user"), cancelOrder);

export default router;
