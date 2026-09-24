import jwt from "jsonwebtoken";

const getJwtSecret = () => process.env.JWT_SECRET || "unibite-development-secret";

// Verify the Bearer token before allowing access to protected routes.
export const authenticate = (req, res, next) => {
	const authorization = req.headers.authorization;
	const token = authorization?.startsWith("Bearer ")
		? authorization.slice(7)
		: null;

	if (!token) {
		return res.status(401).json({ message: "Authentication required" });
	}

	try {
		req.user = jwt.verify(token, getJwtSecret());
		next();
	} catch {
		return res.status(401).json({ message: "Invalid or expired token" });
	}
};

// Restrict a route to one or more allowed user roles.
export const authorizeRoles = (...roles) => (req, res, next) => {
	if (!req.user || !roles.includes(req.user.role)) {
		return res.status(403).json({ message: "You do not have permission" });
	}

	next();
};
