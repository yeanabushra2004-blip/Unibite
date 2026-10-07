import Food from "../model/food.js";

// FR-03: Include sold-out foods so students can see live stock and availability.
export const getFoods = async (_req, res) => {
	try {
		const foods = await Food.find()
			.select("name detail category price quantity tone")
			.sort({ category: 1, name: 1 })
			.lean();

		res.json({ foods });
	} catch (error) {
		console.error("Food catalog load failed:", error);
		res.status(500).json({ message: "Could not load the food catalog" });
	}
};