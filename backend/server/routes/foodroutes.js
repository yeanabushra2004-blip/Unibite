import express from "express";
import { getFoods } from "../controller/foodcontroller.js";

const router = express.Router();

// FR-03: Serve the MongoDB food catalog to students.
router.get("/", getFoods);

export default router;