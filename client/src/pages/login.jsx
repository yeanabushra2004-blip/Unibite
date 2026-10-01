import { useState } from "react";
import "./register.css";

function Login({ isAdminLogin = false, onRegister, onAdminLogin, onLoginSuccess }) {
	const [formData, setFormData] = useState({ identifier: "", password: "" });
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
			// Keep student and admin sign-in modes restricted to their matching roles.
			if (isAdminLogin ? data.user.role !== "admin" : data.user.role === "admin") {
				throw new Error(isAdminLogin ? "This account does not have admin access." : "Use Admin sign in for this account.");
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
				<p className="intro-kicker">{isAdminLogin ? "ADMINISTRATION" : "Campus food, made easy"}</p>
				<h1>{isAdminLogin ? "Welcome to your admin workspace." : "Your next good meal is waiting."}</h1>
				<p className="intro-copy">
					{isAdminLogin ? "Sign in with an approved admin account to manage UniBite." : "Sign in to order your favourites, track every bite, and make lunch feel a little more like home."}
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
				<p className="form-eyebrow">{isAdminLogin ? "ADMIN ACCESS" : "Welcome back"}</p>
				<h2>{isAdminLogin ? "Admin sign in" : "Sign in to your account"}</h2>
				<p className="form-subtitle">{isAdminLogin ? "Use your approved admin email." : "Sign in with your email or Student ID."}</p>

				<form onSubmit={handleSubmit}>
					<label>{isAdminLogin ? "Admin email" : "Email or Student ID"}</label>
					<input
						type={isAdminLogin ? "email" : "text"}
						name="identifier"
						placeholder={isAdminLogin ? "Enter admin email" : "Enter email or Student ID"}
						value={formData.identifier}
						onChange={(event) => setFormData({ ...formData, identifier: event.target.value })}
						autoComplete="username"
						required
					/>

					<label>Password</label>
					<input
						type="password"
						name="password"
						placeholder="Enter your password"
						value={formData.password}
						onChange={(event) => setFormData({ ...formData, password: event.target.value })}
						autoComplete="current-password"
						required
					/>

					<button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Signing in..." : "Sign In"}
					</button>
					{message && <p className="register-message">{message}</p>}
				</form>

				{isAdminLogin ? (
					<button className="switch-button" type="button" onClick={onRegister}>Student sign in</button>
				) : (
					<>
						<button className="switch-button" type="button" onClick={onRegister}>Create a new account</button>
						<button className="account-mode-link" type="button" onClick={onAdminLogin}>Admin sign in</button>
					</>
				)}
			</div>
		</div>
	);
}

export default Login;
