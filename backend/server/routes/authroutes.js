import express from "express";
import { getAdminDashboard, getCurrentUser, loginUser, registerUser, updateCurrentUser, updateUserRole } from "../controller/authcontroller.js";
import { authenticate, authorizeRoles } from "../middleware/authmiddleware.js";

const router = express.Router();

// Public account creation and login routes.
router.post("/register", registerUser);
router.post("/login", loginUser);

// Token-protected routes. The admin check also requires the admin role.
router.get("/me", authenticate, getCurrentUser);
router.put("/me", authenticate, updateCurrentUser);
router.get("/admin/dashboard", authenticate, authorizeRoles("admin"), getAdminDashboard);
router.patch("/admin/users/:userId/role", authenticate, authorizeRoles("admin"), updateUserRole);
router.get("/admin-check", authenticate, authorizeRoles("admin"), (req, res) => {
	res.json({ message: "Admin access granted", user: req.user });
});

export default router;
