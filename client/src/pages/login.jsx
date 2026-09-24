import { useState } from "react";
import "./register.css";

function Login({ onRegister, onLoginSuccess }) {
	const [formData, setFormData] = useState({ email: "", password: "" });
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Send credentials to the API and store the returned JWT session.
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

			if (!response.ok) {
				throw new Error(data.message || "Login failed");
			}

			// The token is reused by App.jsx for session restoration.
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
		<div className="auth-page">
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
				<p className="intro-copy">
					Sign in to order your favourites, track every bite, and make lunch
					feel a little more like home.
				</p>
				<div className="intro-note">
					<span className="note-dot" />
					Fresh picks from your campus kitchen
				</div>
			</section>

			<div className="register-box auth-card">
				<div className="mobile-brand brand-lockup">
					<div className="brand-mark" aria-hidden="true">
						<span className="steam steam-one" />
						<span className="steam steam-two" />
						<span className="bowl" />
					</div>
					<span className="brand-name">UniBite</span>
				</div>
				<p className="form-eyebrow">Welcome back</p>
				<h2>Sign in to your account</h2>
				<p className="form-subtitle">Use your UniBite details to continue.</p>

				<form onSubmit={handleSubmit}>
					<label>Email</label>
					<input
						type="email"
						name="email"
						placeholder="Enter your email"
						value={formData.email}
						onChange={(event) => setFormData({ ...formData, email: event.target.value })}
						required
					/>

					<label>Password</label>
					<input
						type="password"
						name="password"
						placeholder="Enter your password"
						value={formData.password}
						onChange={(event) => setFormData({ ...formData, password: event.target.value })}
						required
					/>

					<button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Signing in..." : "Sign In"}
					</button>
					{message && <p className="register-message">{message}</p>}
				</form>

				<button className="switch-button" type="button" onClick={onRegister}>
					Create a new account
				</button>
			</div>
		</div>
	);
}

export default Login;
