import User from "../model/user.js";
import jwt from "jsonwebtoken";

const getJwtSecret = () => process.env.JWT_SECRET || "unibite-development-secret";

// Create a new user account after validating unique email and student ID.
export const registerUser = async (req, res) => {
	try {
		const { name, studentId, email, phone, password } = req.body;

		if (!name || !studentId || !email || !phone || !password) {
			return res.status(400).json({
				message: "All fields are required",
			});
		}

		const existingUser = await User.findOne({
			$or: [{ email }, { studentId }],
		});

		// Prevent duplicate accounts before attempting to save.
		if (existingUser) {
			return res.status(400).json({
				message: "Email or Student ID already exists",
			});
		}

		const user = new User({
			name,
			studentId,
			email,
			phone,
			password,
		});

		await user.save();

		// Do not return the password or token during registration.
		res.status(201).json({
			message: "Registration successful",
		});
	} catch (error) {
		console.error("Registration failed:", error);
		res.status(500).json({
			message: "Registration failed",
			error: error.message,
		});
	}
};

// Validate credentials and issue a one-day JWT session token.
export const loginUser = async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({
				message: "Email and password are required",
			});
		}

		const user = await User.findOne({ email });
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
