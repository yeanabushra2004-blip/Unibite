import express from "express";
import { createFood, deleteFood, getFoods, getVendorFoods, updateFood } from "../controller/foodcontroller.js";
import { authenticate, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

// FR-03: Serve the MongoDB food catalog to students.
router.get("/", getFoods);
// Vendors can read only their own menu after authentication.
router.get("/vendor", authenticate, authorizeRoles("vendor"), getVendorFoods);
// Food changes require an authenticated vendor or administrator.
router.post("/", authenticate, authorizeRoles("admin", "vendor"), createFood);
router.put("/:foodId", authenticate, authorizeRoles("admin", "vendor"), updateFood);
router.delete("/:foodId", authenticate, authorizeRoles("admin", "vendor"), deleteFood);

export default router;