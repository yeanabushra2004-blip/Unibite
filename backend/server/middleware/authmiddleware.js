import jwt from "jsonwebtoken";
import User from "../model/user.js";

const getJwtSecret = () => process.env.JWT_SECRET || "unibite-development-secret";

// Verify the Bearer token before allowing access to protected routes.
export const authenticate = async (req, res, next) => {
	const authorization = req.headers.authorization;
	const token = authorization?.startsWith("Bearer ")
		? authorization.slice(7)
		: null;

	if (!token) {
		return res.status(401).json({ message: "Authentication required" });
	}

	let payload;
	try {
		payload = jwt.verify(token, getJwtSecret());
	} catch {
		return res.status(401).json({ message: "Invalid or expired token" });
	}

	try {
		const user = await User.findById(payload.id).select("role").lean();
		if (!user) {
			return res.status(401).json({ message: "Account not found" });
		}
		req.user = { ...payload, role: user.role };
		next();
	} catch (error) {
		console.error("Authentication account lookup failed:", error);
		return res.status(500).json({ message: "Could not verify account access" });
	}
};

// Restrict a route to one or more allowed user roles.
export const authorizeRoles = (...roles) => (req, res, next) => {
	if (!req.user || !roles.includes(req.user.role)) {
		return res.status(403).json({ message: "You do not have permission" });
	}

	next();
};
