import express from "express";
import { cancelOrder, createOrder, getOrderHistory } from "../controller/ordercontroller.js";
import { authenticate, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

// FR-03: Keep order history private to authenticated student accounts.
router.use(authenticate, authorizeRoles("user"));
router.get("/", getOrderHistory);
router.post("/", createOrder);
router.delete("/:orderId", cancelOrder);

export default router;