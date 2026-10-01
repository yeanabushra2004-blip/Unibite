import { useEffect, useState } from "react";
import AdminDashboard from "./adminDashboard";
import Profile from "./profile";
import VendorDashboard from "./vendorDashboard";
import "./dashboard.css";

const meals = [
	{ name: "Campus Classic", detail: "Rice bowl · Grilled chicken", price: 6.5, tone: "green" },
	{ name: "Garden Crunch", detail: "Fresh salad · Avocado", price: 5.25, tone: "orange" },
	{ name: "Spice Route", detail: "Noodles · Sesame tofu", price: 6, tone: "red" },
];

const formatPrice = (price) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);

// Main authenticated landing page shown after a successful login.
function Dashboard({ user, onLogout, onUserUpdated }) {
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [favoriteMeals, setFavoriteMeals] = useState(() => {
		try {
			const savedMeals = JSON.parse(localStorage.getItem("unibiteFavoriteMeals") || "[]");
			return Array.isArray(savedMeals)
				? savedMeals.filter((name) => typeof name === "string" && meals.some((meal) => meal.name === name))
				: [];
		} catch {
			return [];
		}
	});
	const [showFavorites, setShowFavorites] = useState(false);

	useEffect(() => {
		try {
			localStorage.setItem("unibiteFavoriteMeals", JSON.stringify(favoriteMeals));
		} catch {
			// Favorites remain available for this session if storage is unavailable.
		}
	}, [favoriteMeals]);

	function toggleFavorite(mealName) {
		setFavoriteMeals((currentFavorites) => currentFavorites.includes(mealName)
			? currentFavorites.filter((name) => name !== mealName)
			: [...currentFavorites, mealName]);
	}

	const visibleMeals = showFavorites
		? meals.filter((meal) => favoriteMeals.includes(meal.name))
		: meals;

	if (user.role === "admin") {
		return <AdminDashboard user={user} onLogout={onLogout} />;
	}
	if (user.role === "vendor") {
		return <VendorDashboard user={user} onLogout={onLogout} />;
	}
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
					<button className="dashboard-profile-trigger" type="button" onClick={() => setIsProfileOpen(true)} aria-label="Open user profile">
						<div className="avatar">{user.name?.charAt(0).toUpperCase()}</div>
						<div className="user-copy">
							<strong>{user.name}</strong>
							<span>{user.role}</span>
						</div>
					</button>
					<button type="button" onClick={onLogout} aria-label="Log out">Log out</button>
				</div>
			</header>

			{isProfileOpen ? <Profile user={user} onBack={() => setIsProfileOpen(false)} onUserUpdated={onUserUpdated} /> : <main className="dashboard-main" id="overview">
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
					<div className="section-heading"><div><p className="dashboard-kicker">Made for your day</p><h2>Popular right now</h2></div><div className="section-actions"><button type="button" className={`saved-filter${showFavorites ? " active" : ""}`} onClick={() => setShowFavorites((current) => !current)} aria-pressed={showFavorites}>Saved <span>{favoriteMeals.length}</span></button><button type="button" className="text-action">View full menu <span>↗</span></button></div></div>
					{visibleMeals.length === 0 ? <p className="empty-meals">No meals saved yet. Select a star to keep one here.</p> : <div className="meal-grid">
						{visibleMeals.map((meal) => {
							const isFavorite = favoriteMeals.includes(meal.name);
							return <article className={`meal-card ${meal.tone}`} key={meal.name}><div className="meal-art"><span aria-hidden="true" /><button type="button" className={`favorite-toggle${isFavorite ? " is-favorite" : ""}`} onClick={() => toggleFavorite(meal.name)} aria-label={isFavorite ? `Remove ${meal.name} from saved meals` : `Save ${meal.name}`} aria-pressed={isFavorite}>{isFavorite ? "★" : "☆"}</button></div><div className="meal-info"><h3>{meal.name}</h3><p>{meal.detail}</p><div><strong>{formatPrice(meal.price)}</strong></div></div></article>;
						})}
					</div>}
				</section>

				<section className="dashboard-tip"><span>✦</span><div><strong>Quick tip</strong><p>Order before 11:30 AM for the smoothest lunch pickup.</p></div><button type="button">Got it</button></section>
			</main>}
		</div>
	);
}

export default Dashboard;
