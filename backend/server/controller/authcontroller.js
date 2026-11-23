import User from "../model/user.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const accountRoles = ["user", "vendor", "admin"];
const getJwtSecret = () => {
	const secret = process.env.JWT_SECRET;
	if (typeof secret !== "string" || secret.length < 32) {
		throw new Error("JWT_SECRET must be configured with at least 32 characters.");
	}
	return secret;
};

// Create a student account after validating its registration details.
export const registerUser = async (req, res) => {
	try {
		const { name, studentId, email, phone, password } = req.body;

		if (![name, studentId, email, phone, password].every((value) => typeof value === "string" && value.trim())) {
			return res.status(400).json({
				message: "All fields are required",
			});
		}

		// Normalize student identity fields before validation and duplicate checks.
		const normalizedName = name.trim();
		const normalizedStudentId = studentId.trim();
		const normalizedEmail = email.trim().toLowerCase();
		const normalizedPhone = phone.trim();

		if (normalizedName.length < 2 || normalizedStudentId.length < 2) {
			return res.status(400).json({ message: "Enter a valid name and Student ID" });
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
			return res.status(400).json({ message: "Enter a valid email address" });
		}

		const phoneDigits = normalizedPhone.replace(/\D/g, "");
		if (!/^\+?[\d\s().-]+$/.test(normalizedPhone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
			return res.status(400).json({ message: "Enter a valid phone number" });
		}

		if (password.length < 6) {
			return res.status(400).json({ message: "Password must be at least 6 characters" });
		}

		const existingUser = await User.findOne({
			$or: [{ email: normalizedEmail }, { studentId: normalizedStudentId }],
		});

		// Prevent duplicate accounts before attempting to save.
		if (existingUser) {
			return res.status(400).json({
				message: "Email or Student ID already exists",
			});
		}

		const user = new User({
			name: normalizedName,
			studentId: normalizedStudentId,
			email: normalizedEmail,
			phone: normalizedPhone,
			password,
		});

		await user.save();

		res.status(201).json({
			message: "Student account created successfully. You can now sign in with your email and password.",
		});
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ message: "Email or Student ID already exists" });
		}

		console.error("Registration failed:", error);
		res.status(500).json({
			message: "Registration failed",
		});
	}
};

// Authenticate one account type by email and password, then issue a one-day session.
const loginWithRole = async (req, res, role = null) => {
	try {
		const { email, password } = req.body;
		const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

		if (!normalizedEmail || typeof password !== "string" || !password) {
			return res.status(400).json({
				message: "Email and password are required",
			});
		}

		if (role === "admin" && !await User.exists({ role: "admin" })) {
			return res.status(503).json({
				message: "Admin account is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in backend .env.local, then restart the server.",
			});
		}

		const userFilter = {
			email: normalizedEmail,
			role: role || { $in: accountRoles },
		};
		const user = await User.findOne(userFilter);
		if (!user || !(await user.comparePassword(password))) {
			return res.status(401).json({
				message: "Invalid email or password",
			});
		}
		// The token carries only the user ID and role, never the password.
		res.json({
			message: "Login successful",
			token: jwt.sign(
				{ id: user._id.toString(), role: user.role },
				getJwtSecret(),
				{ expiresIn: "1d" },
			),
			user: {
				name: user.name,
				email: user.email,
				studentId: user.studentId,
				phone: user.phone,
				role: user.role,
			},
		});
	} catch (error) {
		console.error(`${role} login failed:`, error);
		res.status(500).json({
			message: "Login failed",
		});
	}
};

export const loginAccount = (req, res) => loginWithRole(req, res);
export const loginStudent = (req, res) => loginWithRole(req, res, "user");
export const loginVendor = (req, res) => loginWithRole(req, res, "vendor");
export const loginAdmin = (req, res) => loginWithRole(req, res, "admin");

// Load the authenticated user's current data from the database.
export const getCurrentUser = async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select("-password");

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.json({ user });
	} catch (error) {
		res.status(500).json({ message: "Could not load user" });
	}
};

// Update editable fields on the authenticated user's profile.
export const updateCurrentUser = async (req, res) => {
	try {
		const { name, studentId, email, phone } = req.body;
		const updates = {
			name: name?.trim(),
			studentId: studentId?.trim(),
			email: email?.trim().toLowerCase(),
			phone: phone?.trim(),
		};

		if (Object.values(updates).some((value) => !value)) {
			return res.status(400).json({ message: "All profile fields are required" });
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
			return res.status(400).json({ message: "Enter a valid email address" });
		}
		const existingUser = await User.findOne({
			_id: { $ne: req.user.id },
			$or: [{ email: updates.email }, { studentId: updates.studentId }],
		});

		if (existingUser) {
			return res.status(409).json({ message: "Email or Student ID already exists" });
		}
		const user = await User.findByIdAndUpdate(
			req.user.id,
			{ $set: updates },
			{ new: true, runValidators: true },
		).select("-password");

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.json({ message: "Profile updated successfully", user });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(409).json({ message: "Email or Student ID already exists" });
		}

		console.error("Profile update failed:", error);
		res.status(500).json({ message: "Could not update profile" });
	}
};

// Provide account statistics and a safe user list to administrators.
export const getAdminDashboard = async (_req, res) => {
	try {
		const users = await User.find()
			.select("name email studentId phone role createdAt")
			.sort({ createdAt: -1 })
			.lean();

		res.json({
			stats: {
				totalUsers: users.length,
				students: users.filter((user) => user.role === "user").length,
				vendors: users.filter((user) => user.role === "vendor").length,
				admins: users.filter((user) => user.role === "admin").length,
			},
			users,
		});
	} catch (error) {
		console.error("Admin dashboard load failed:", error);
		res.status(500).json({ message: "Could not load admin dashboard" });
	}
};

// Return vendor choices to authenticated, approved students during checkout.
export const getVendors = async (_req, res) => {
	try {
		const vendors = await User.find({ role: "vendor" })
			.select("name")
			.sort({ name: 1 })
			.lean();
		res.json({ vendors });
	} catch (error) {
		console.error("Vendor list load failed:", error);
		res.status(500).json({ message: "Could not load vendors" });
	}
};

// Let administrators assign student, vendor, and admin account roles.
export const updateUserRole = async (req, res) => {
	try {
		const { role } = req.body;
		const allowedRoles = ["user", "vendor", "admin"];

		if (!allowedRoles.includes(role)) {
			return res.status(400).json({ message: "Choose a valid account role" });
		}
		if (!mongoose.isValidObjectId(req.params.userId)) {
			return res.status(404).json({ message: "User not found" });
		}
		if (req.params.userId === req.user.id && role !== "admin") {
			return res.status(400).json({ message: "You cannot remove your own admin role" });
		}

		const user = await User.findById(req.params.userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		// Prevent a role change from removing the last administrator.
		if (user.role === "admin" && role !== "admin" && await User.countDocuments({ role: "admin" }) <= 1) {
			return res.status(409).json({ message: "At least one administrator must remain" });
		}

		user.role = role;
		await user.save();

		res.json({
			message: "Account role updated",
			user: {
				_id: user._id,
				name: user.name,
				email: user.email,
				studentId: user.studentId,
				phone: user.phone,
				role: user.role,
			},
		});
	} catch (error) {
		console.error("Account role update failed:", error);
		res.status(500).json({ message: "Could not update account role" });
	}
};
