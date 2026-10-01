import "./dashboard.css";

function VendorDashboard({ user, onLogout }) {
	return (
		<div className="dashboard-page vendor-dashboard">
			<header className="dashboard-header admin-header">
				<div className="dashboard-brand">
					<div className="dashboard-mark" aria-hidden="true"><span /></div>
					<span>UniBite</span>
					<span className="vendor-badge">VENDOR</span>
				</div>
				<div className="admin-header-user">
					<span>{user.name}</span>
					<button type="button" onClick={onLogout}>Log out</button>
				</div>
			</header>

			<main className="vendor-main">
				<section className="vendor-welcome">
					<p className="dashboard-kicker">CAMPUS PARTNER</p>
					<h1>Welcome, {user.name?.split(" ")[0]}.</h1>
					<p>Your vendor account is active.</p>
				</section>
				<section className="vendor-tools" aria-label="Vendor tools">
					<article>
						<span className="vendor-tool-label">MENU</span>
						<h2>Food catalog</h2>
						<p>Menu management will be available when the catalog service is connected.</p>
					</article>
					<article>
						<span className="vendor-tool-label">ORDERS</span>
						<h2>Order queue</h2>
						<p>Order management will be available when the order service is connected.</p>
					</article>
				</section>
			</main>
		</div>
	);
}

export default VendorDashboard;