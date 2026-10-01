import User from "../model/user.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const getJwtSecret = () => process.env.JWT_SECRET || "unibite-development-secret";

// Create a new user account after validating unique email and student ID.
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
			return res.status(400).json({ message: "Enter a valid university email" });
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

		// Do not return the password or token during registration.
		res.status(201).json({
			message: "Student account created successfully",
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

// Validate credentials and issue a one-day JWT session token.
export const loginUser = async (req, res) => {
	try {
		const { identifier, email, password } = req.body;
		const loginIdentifier = (identifier || email || "").trim();

		if (!loginIdentifier || !password) {
			return res.status(400).json({
				message: "Email or Student ID and password are required",
			});
		}

		// Accept either a normalized email address or an exact Student ID.
		const user = await User.findOne({
			$or: [
				{ email: loginIdentifier.toLowerCase() },
				{ studentId: loginIdentifier },
			],
		});
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
		console.error("Login failed:", error);
		res.status(500).json({
			message: "Login failed",
			error: error.message,
		});
	}
};

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
