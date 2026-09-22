import { useState } from "react";
import "./register.css";

function Register() {
	const [formData, setFormData] = useState({
		name: "",
		studentId: "",
		email: "",
		phone: "",
		password: "",
	});

	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		console.log(formData);
	};

	return (
		<div className="register-container">
			<div className="register-box">
				<h1>UniBite</h1>
				<h2>Create Account</h2>

				<form onSubmit={handleSubmit}>
					<label>Name</label>
					<input
						type="text"
						name="name"
						placeholder="Enter your name"
						value={formData.name}
						onChange={handleChange}
						required
					/>

					<label>Student ID</label>
					<input
						type="text"
						name="studentId"
						placeholder="Enter your student ID"
						value={formData.studentId}
						onChange={handleChange}
						required
					/>

					<label>Email</label>
					<input
						type="email"
						name="email"
						placeholder="Enter your email"
						value={formData.email}
						onChange={handleChange}
						required
					/>

					<label>Phone</label>
					<input
						type="text"
						name="phone"
						placeholder="Enter your phone number"
						value={formData.phone}
						onChange={handleChange}
						required
					/>

					<label>Password</label>
					<input
						type="password"
						name="password"
						placeholder="Enter your password"
						value={formData.password}
						onChange={handleChange}
						required
					/>

					<button type="submit">Register</button>
				</form>
			</div>
		</div>
	);
}

export default Register;
