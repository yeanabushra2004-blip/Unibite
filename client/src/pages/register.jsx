import { useState } from "react";
import "./register.css";

function Register({ onLogin, onAdminLogin }) {
	const [formData, setFormData] = useState({
		name: "",
		studentId: "",
		email: "",
		phone: "",
		password: "",
	});
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isRegistered, setIsRegistered] = useState(false);

	const handleChange = (event) => {
		setFormData({ ...formData, [event.target.name]: event.target.value });
	};

	// Public registration always creates a student account.
	const handleSubmit = async (event) => {
		event.preventDefault();
		setMessage("");
		setIsSubmitting(true);

		try {
			const response = await fetch("http://localhost:5000/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Registration failed");
			}

			setMessage(data.message || "Registration successful");
			setIsRegistered(true);
			setFormData({ name: "", studentId: "", email: "", phone: "", password: "" });
		} catch (error) {
			setMessage(error instanceof TypeError ? "Cannot connect to server. Start the backend first." : error.message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="auth-page register-page">
			<section className="auth-intro" aria-label="UniBite introduction">
				<div className="brand-lockup">
					<div className="brand-mark" aria-hidden="true">
						<span className="steam steam-one" />
						<span className="steam steam-two" />
						<span className="bowl" />
					</div>
					<span className="brand-name">UniBite</span>
				</div>
				<p className="intro-kicker">A better campus bite starts here</p>
				<h1>Make room for your new favourite.</h1>
				<p className="intro-copy">
					Create your UniBite account and discover quick, comforting meals
					made for busy student days.
				</p>
				<div className="intro-note">
					<span className="note-dot" />
					One account for every delicious order
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
				<p className="form-eyebrow">Join the table</p>
				<h2>Create your account</h2>
				<p className="form-subtitle">Enter your details to create an account.</p>

				{isRegistered ? (
					<div className="registration-success">
						<p className="register-message" role="status">{message}</p>
						<p className="form-subtitle">Your student account is ready. Sign in to open your dashboard.</p>
						<button type="button" onClick={onLogin}>Sign in now</button>
					</div>
				) : (
					<form onSubmit={handleSubmit}>
						<label>Name</label>
						<input type="text" name="name" placeholder="Enter your name" value={formData.name} onChange={handleChange} required />

						<label>Student ID</label>
						<input type="text" name="studentId" placeholder="Enter your student ID" value={formData.studentId} onChange={handleChange} required />

						<label>Email</label>
						<input type="email" name="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} autoComplete="email" required />

						<label>Phone</label>
						<input type="tel" name="phone" placeholder="Enter your phone number" value={formData.phone} onChange={handleChange} autoComplete="tel" required />

						<label>Password</label>
						<input type="password" name="password" placeholder="Enter your password" value={formData.password} onChange={handleChange} autoComplete="new-password" minLength={6} required />

						<button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Registering..." : "Register"}
						</button>
						{message && <p className="register-message">{message}</p>}
					</form>
				)}
				{!isRegistered && <>
					<button className="account-mode-link" type="button" onClick={onAdminLogin}>Admin sign in</button>
					<button className="switch-button" type="button" onClick={onLogin}>Already have an account? Sign in</button>
				</>}
			</div>
		</div>
	);
}

export default Register;
