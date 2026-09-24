import "./dashboard.css";

const meals = [
	{ name: "Campus Classic", detail: "Rice bowl · Grilled chicken", price: "$6.50", tone: "green" },
	{ name: "Garden Crunch", detail: "Fresh salad · Avocado", price: "$5.25", tone: "orange" },
	{ name: "Spice Route", detail: "Noodles · Sesame tofu", price: "$6.00", tone: "red" },
];

// Main authenticated landing page shown after a successful login.
function Dashboard({ user, onLogout }) {
	return (
		<div className="dashboard-page">
			<header className="dashboard-header">
				<div className="dashboard-brand">
					<div className="dashboard-mark" aria-hidden="true"><span /></div>
					<span>UniBite</span>
				</div>
				<nav className="dashboard-nav" aria-label="Dashboard navigation">
					<a className="active" href="#overview">Overview</a>
					<a href="#menu">Menu</a>
					<a href="#orders">Orders</a>
				</nav>
				<div className="dashboard-user">
					<div className="avatar">{user.name?.charAt(0).toUpperCase()}</div>
					<div className="user-copy">
						<strong>{user.name}</strong>
						<span>{user.role}</span>
					</div>
					<button type="button" onClick={onLogout} aria-label="Log out">Log out</button>
				</div>
			</header>

			<main className="dashboard-main" id="overview">
				<section className="dashboard-welcome">
					<div>
						<p className="dashboard-kicker">Thursday, 24 September</p>
						<h1>Good morning, {user.name?.split(" ")[0]}.</h1>
						<p>Something delicious is only a few taps away.</p>
					</div>
					<button className="primary-action" type="button">Browse today&apos;s menu <span>→</span></button>
				</section>

				<section className="dashboard-stats" id="orders" aria-label="Order summary">
					<div className="stat-card accent-card"><span className="stat-icon">◷</span><small>Next pickup</small><strong>12:40 PM</strong><span>Library counter</span></div>
					<div className="stat-card"><span className="stat-icon">◎</span><small>Orders this month</small><strong>08</strong><span>Keep exploring</span></div>
					<div className="stat-card"><span className="stat-icon">✦</span><small>Bite points</small><strong>240</strong><span>60 until free lunch</span></div>
				</section>

				<section className="dashboard-section" id="menu">
					<div className="section-heading"><div><p className="dashboard-kicker">Made for your day</p><h2>Popular right now</h2></div><button type="button" className="text-action">View full menu <span>↗</span></button></div>
					<div className="meal-grid">
						{meals.map((meal) => <article className={`meal-card ${meal.tone}`} key={meal.name}><div className="meal-art" aria-hidden="true"><span /></div><div className="meal-info"><h3>{meal.name}</h3><p>{meal.detail}</p><div><strong>{meal.price}</strong><button type="button" aria-label={`Add ${meal.name}`}>+</button></div></div></article>)}
					</div>
				</section>

				<section className="dashboard-tip"><span>✦</span><div><strong>Quick tip</strong><p>Order before 11:30 AM for the smoothest lunch pickup.</p></div><button type="button">Got it</button></section>
			</main>
		</div>
	);
}

export default Dashboard;
