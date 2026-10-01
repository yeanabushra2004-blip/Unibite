import { useEffect, useState } from "react";
import "./dashboard.css";

function AdminDashboard({ user, onLogout }) {
	const [data, setData] = useState(null);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [reloadKey, setReloadKey] = useState(0);
	const [roleDrafts, setRoleDrafts] = useState({});
	const [savingUserId, setSavingUserId] = useState("");
	const [roleMessage, setRoleMessage] = useState("");

	useEffect(() => {
		let isCurrent = true;

		// This endpoint returns account data only for authenticated admins.
		fetch("http://localhost:5000/api/auth/admin/dashboard", {
			headers: { Authorization: `Bearer ${localStorage.getItem("unibiteToken")}` },
		})
			.then(async (response) => {
				const result = await response.json();
				if (!response.ok) {
					throw new Error(result.message || "Could not load dashboard");
				}
				return result;
			})
			.then((result) => {
				if (isCurrent) setData(result);
			})
			.catch((requestError) => {
				if (isCurrent) setError(requestError.message || "Could not connect to the server");
			})
			.finally(() => {
				if (isCurrent) setIsLoading(false);
			});

		return () => {
			isCurrent = false;
		};
	}, [reloadKey]);

	const reloadDashboard = () => {
		setIsLoading(true);
		setError("");
		setReloadKey((key) => key + 1);
	};

	const saveRole = async (account) => {
		const role = roleDrafts[account._id] || account.role;
		if (role === account.role) return;

		setSavingUserId(account._id);
		setError("");
		setRoleMessage("");
		try {
			// Persist the selected account role through the admin-only endpoint.
			const response = await fetch(`http://localhost:5000/api/auth/admin/users/${account._id}/role`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("unibiteToken")}`,
				},
				body: JSON.stringify({ role }),
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.message || "Could not update role");

			setRoleDrafts((drafts) => ({ ...drafts, [account._id]: role }));
			setRoleMessage(`${account.name}'s role updated.`);
			reloadDashboard();
		} catch (requestError) {
			setError(requestError.message || "Could not update account role");
		} finally {
			setSavingUserId("");
		}
	};

	return (
		<div className="dashboard-page admin-dashboard">
			<header className="dashboard-header admin-header">
				<div className="dashboard-brand">
					<div className="dashboard-mark" aria-hidden="true"><span /></div>
					<span>UniBite</span>
					<span className="admin-badge">ADMIN</span>
				</div>
				<div className="admin-header-user">
					<span>{user.name}</span>
					<button type="button" onClick={onLogout}>Log out</button>
				</div>
			</header>

			<main className="admin-main">
				<section className="admin-welcome">
					<div>
						<p className="dashboard-kicker">ADMINISTRATION</p>
						<h1>Good day, {user.name?.split(" ")[0]}.</h1>
						<p>Manage UniBite accounts and monitor your campus community.</p>
					</div>
					<div className="admin-date">Account overview</div>
				</section>

				{error && <div className="admin-error" role="alert"><span>{error}</span><button type="button" onClick={reloadDashboard}>Retry</button></div>}

				<section className="admin-stats" aria-label="Account statistics">
					<article className="admin-stat"><span>Total accounts</span><strong>{isLoading ? "..." : data?.stats.totalUsers ?? 0}</strong><small>All registered users</small></article>
					<article className="admin-stat"><span>Student accounts</span><strong>{isLoading ? "..." : data?.stats.students ?? 0}</strong><small>Standard accounts</small></article>
					<article className="admin-stat"><span>Vendor accounts</span><strong>{isLoading ? "..." : data?.stats.vendors ?? 0}</strong><small>Campus food vendors</small></article>
					<article className="admin-stat"><span>Administrators</span><strong>{isLoading ? "..." : data?.stats.admins ?? 0}</strong><small>Privileged accounts</small></article>
				</section>

				<section className="admin-users-section">
					<div className="admin-section-heading"><div><p className="dashboard-kicker">DIRECTORY</p><h2>Registered accounts</h2></div><button type="button" onClick={reloadDashboard} disabled={isLoading}>Refresh</button></div>
					{roleMessage && <p className="admin-role-message" role="status">{roleMessage}</p>}
					{isLoading ? <p className="admin-state">Loading accounts...</p> : data?.users.length ? <div className="admin-table-scroll"><table className="admin-users-table">
						<thead><tr><th>Name</th><th>Email</th><th>Student ID</th><th>Phone</th><th>Role</th><th>Action</th></tr></thead>
						<tbody>{data.users.map((account) => <tr key={account._id}><td>{account.name}</td><td>{account.email}</td><td>{account.studentId}</td><td>{account.phone}</td><td><select className="admin-role-select" aria-label={`Role for ${account.name}`} value={roleDrafts[account._id] ?? account.role} onChange={(event) => setRoleDrafts((drafts) => ({ ...drafts, [account._id]: event.target.value }))}><option value="user">Student</option><option value="vendor">Vendor</option><option value="admin">Admin</option></select></td><td><button className="admin-role-save" type="button" onClick={() => saveRole(account)} disabled={(roleDrafts[account._id] ?? account.role) === account.role || savingUserId === account._id}>{savingUserId === account._id ? "Saving..." : "Save"}</button></td></tr>)}</tbody>
					</table></div> : <p className="admin-state">No accounts found.</p>}
				</section>
			</main>
		</div>
	);
}

export default AdminDashboard;