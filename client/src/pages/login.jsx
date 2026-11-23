import { useState } from "react";
import "./register.css";

function LoginForm({ onLoginSuccess, onRegister, notice }) {
	const [formData, setFormData] = useState({ email: "", password: "" });
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setMessage("");
		setIsSubmitting(true);

		try {
			const response = await fetch("http://localhost:5000/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});
			const data = await response.json();

			if (!response.ok) throw new Error(data?.message || "Login failed");
			if (!data || typeof data.token !== "string" || !data.token
				|| !["user", "vendor", "admin"].includes(data?.user?.role)) {
				throw new Error("Sign-in response was incomplete or the account role is not supported.");
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
		<section className="auth-card login-card">
			<p className="form-eyebrow">ACCOUNT ACCESS</p>
			<h2>Sign in to UniBite</h2>
			<p className="form-subtitle">Use your account email and password. Your account role determines which dashboard opens.</p>
			{notice && <p className="login-session-notice" role="status">{notice}</p>}

			<form onSubmit={handleSubmit}>
				<label htmlFor="login-email">Email</label>
				<input
					id="login-email"
					type="email"
					name="email"
					placeholder="Enter your email"
					autoComplete="username"
					value={formData.email}
					onChange={(event) => setFormData({ ...formData, email: event.target.value })}
					required
				/>

				<label htmlFor="login-password">Password</label>
				<input
					id="login-password"
					type="password"
					name="password"
					placeholder="Enter your password"
					autoComplete="current-password"
					value={formData.password}
					onChange={(event) => setFormData({ ...formData, password: event.target.value })}
					required
				/>

				<button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Signing in..." : "Sign in"}
				</button>
				{message && <p className="register-message" role="alert">{message}</p>}
			</form>

			<button className="switch-button login-register-link" type="button" onClick={onRegister}>Create a student account</button>
		</section>
	);
}

function Login({ onRegister, onLoginSuccess, notice }) {
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
				<p className="intro-copy">Sign in with your account. UniBite will take you to the right dashboard.</p>
				<div className="intro-note">
					<span className="note-dot" />
					Students, vendors and admins use one secure sign-in
				</div>
			</section>

			<div className="login-panels">
				<LoginForm onLoginSuccess={onLoginSuccess} onRegister={onRegister} notice={notice} />
			</div>
		</div>
	);
}

export default Login;
