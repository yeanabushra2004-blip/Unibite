import express from "express";
import { createFood, deleteFood, getFoods, updateFood } from "../controller/foodcontroller.js";
import { authenticate, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

// FR-03: Serve the MongoDB food catalog to students.
router.get("/", getFoods);
router.post("/", authenticate, authorizeRoles("admin"), createFood);
router.put("/:foodId", authenticate, authorizeRoles("admin"), updateFood);
router.delete("/:foodId", authenticate, authorizeRoles("admin"), deleteFood);

export default router;