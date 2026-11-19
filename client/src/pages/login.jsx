import { useState } from "react";
import "./register.css";

function LoginForm({ accountType, onLoginSuccess, onRegister }) {
	const isAdminLogin = accountType === "admin";
	const [formData, setFormData] = useState({ email: "", password: "" });
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setMessage("");
		setIsSubmitting(true);

		try {
			const response = await fetch(`http://localhost:5000/api/auth/login/${accountType}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});
			const data = await response.json();

			if (!response.ok) throw new Error(data.message || "Login failed");
			const expectedRole = isAdminLogin ? "admin" : "user";
			if (data.user.role !== expectedRole) {
				throw new Error(isAdminLogin ? "This account does not have admin access." : "Use Admin Login for this account.");
			}

			localStorage.setItem("unibiteToken", data.token);
			localStorage.setItem("unibiteUser", JSON.stringify(data.user));
			onLoginSuccess(data.user);
		} catch (error) {
			setMessage(error.message || "Could not connect to the server");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<section className={`auth-card login-card ${isAdminLogin ? "admin-login-card" : "student-login-card"}`}>
			<p className="form-eyebrow">{isAdminLogin ? "ADMIN ACCESS" : "STUDENT ACCESS"}</p>
			<h2>{isAdminLogin ? "Admin Login" : "Student Login"}</h2>
			<p className="form-subtitle">
				{isAdminLogin
					? "Use the project owner's admin email and password."
					: "Sign in with the email and password you registered with."}
			</p>

			<form onSubmit={handleSubmit}>
				<label htmlFor={`${accountType}-email`}>{isAdminLogin ? "Admin email" : "Student email"}</label>
				<input
					id={`${accountType}-email`}
					type="email"
					name="email"
					placeholder={isAdminLogin ? "Enter admin email" : "Enter student email"}
					autoComplete="username"
					value={formData.email}
					onChange={(event) => setFormData({ ...formData, email: event.target.value })}
					required
				/>

				<label htmlFor={`${accountType}-password`}>Password</label>
				<input
					id={`${accountType}-password`}
					type="password"
					name="password"
					placeholder="Enter your password"
					autoComplete="current-password"
					value={formData.password}
					onChange={(event) => setFormData({ ...formData, password: event.target.value })}
					required
				/>

				<button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Signing in..." : isAdminLogin ? "Admin Login" : "Student Login"}
				</button>
				{message && <p className="register-message" role="alert">{message}</p>}
			</form>

			{isAdminLogin
				? <p className="login-setup-hint">If no Admin account exists, set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in backend .env.local, then restart the server.</p>
				: <button className="switch-button login-register-link" type="button" onClick={onRegister}>Create a student account</button>}
		</section>
	);
}

function Login({ onRegister, onLoginSuccess }) {
	return (
		<div className="auth-page login-page">
			<section className="auth-intro" aria-label="UniBite introduction">
				<div className="brand-lockup">
					<div className="brand-mark" aria-hidden="true">
						<span className="steam steam-one" />
						<span className="steam steam-two" />
						<span className="bowl" />
					</div>
					<span className="brand-name">UniBite</span>
				</div>
				<p className="intro-kicker">Campus food, made easy</p>
				<h1>Your next good meal is waiting.</h1>
				<p className="intro-copy">Choose your account type to continue to UniBite.</p>
				<div className="intro-note">
					<span className="note-dot" />
					Student and Admin access are kept separate
				</div>
			</section>

			<div className="login-panels">
				<LoginForm accountType="student" onLoginSuccess={onLoginSuccess} onRegister={onRegister} />
				<LoginForm accountType="admin" onLoginSuccess={onLoginSuccess} />
			</div>
		</div>
	);
}

export default Login;
