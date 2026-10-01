import { useState } from "react";

function Profile({ user, onBack, onUserUpdated }) {
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [message, setMessage] = useState("");
	const [formData, setFormData] = useState({
		name: user.name || "",
		email: user.email || "",
		studentId: user.studentId || "",
		phone: user.phone || "",
	});

	const profileDetails = [
		{ label: "Full name", value: user.name },
		{ label: "Email address", value: user.email },
		{ label: "Student ID", value: user.studentId },
		{ label: "Account type", value: user.role },
		{ label: "Phone number", value: user.phone },
	];
	const updateField = (event) => {
		setFormData({ ...formData, [event.target.name]: event.target.value });
	};
	const handleSubmit = async (event) => {
		event.preventDefault();
		setIsSaving(true);
		setMessage("");

		try {
			const response = await fetch("http://localhost:5000/api/auth/me", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("unibiteToken")}`,
				},
				body: JSON.stringify(formData),
			});
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Could not update profile");
			}

			onUserUpdated(data.user);
			setFormData({
				name: data.user.name,
				email: data.user.email,
				studentId: data.user.studentId,
				phone: data.user.phone,
			});
			setIsEditing(false);
			setMessage("Profile updated successfully.");
		} catch (error) {
			setMessage(error.message || "Could not connect to the server");
		} finally {
			setIsSaving(false);
		}
	};
	const cancelEditing = () => {
		setFormData({
			name: user.name || "",
			email: user.email || "",
			studentId: user.studentId || "",
			phone: user.phone || "",
		});
		setMessage("");
		setIsEditing(false);
	};

	return (
		<main className="dashboard-main profile-main">
			<button className="text-action profile-back" type="button" onClick={onBack}>← Back to overview</button>
			<section className="profile-heading">
				<div className="profile-avatar">{user.name?.charAt(0).toUpperCase()}</div>
				<div>
					<p className="dashboard-kicker">Your account</p>
					<h1>{user.name || "UniBite user"}</h1>
					<p>{user.email}</p>
				</div>
			</section>
			<section className="profile-details" aria-label="Profile details">
				<div className="profile-details-heading"><h2>Profile details</h2>{!isEditing && <button className="text-action" type="button" onClick={() => { setMessage(""); setIsEditing(true); }}>Edit profile</button>}</div>
				{isEditing ? <form className="profile-form" onSubmit={handleSubmit}>
					<label>Full name<input name="name" value={formData.name} onChange={updateField} required /></label>
					<label>Email address<input name="email" type="email" value={formData.email} onChange={updateField} required /></label>
					<label>Student ID<input name="studentId" value={formData.studentId} onChange={updateField} required /></label>
					<label>Phone number<input name="phone" type="tel" value={formData.phone} onChange={updateField} required /></label>
					<div className="profile-form-actions"><button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save changes"}</button><button type="button" onClick={cancelEditing}>Cancel</button></div>
				</form> : <dl>
					{profileDetails.map(({ label, value }) => (
						<div className="profile-detail" key={label}>
							<dt>{label}</dt>
							<dd>{value || "Not provided"}</dd>
						</div>
					))}
				</dl>}
				{message && <p className="profile-message" role="status">{message}</p>}
			</section>
		</main>
	);
}

export default Profile;
