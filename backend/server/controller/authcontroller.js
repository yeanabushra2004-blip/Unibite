import User from "../models/user.js";

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

		res.status(201).json({
			message: "Registration successful",
		});
	} catch (error) {
		res.status(500).json({
			message: "Server error",
			error: error.message,
		});
	}
};
