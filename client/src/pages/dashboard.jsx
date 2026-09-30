import { useEffect, useState } from "react";
import "./dashboard.css";

const meals = [
	{ name: "Campus Classic", detail: "Rice bowl · Grilled chicken", price: 6.5, tone: "green" },
	{ name: "Garden Crunch", detail: "Fresh salad · Avocado", price: 5.25, tone: "orange" },
	{ name: "Spice Route", detail: "Noodles · Sesame tofu", price: 6, tone: "red" },
];

const formatPrice = (price) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);

// Main authenticated landing page shown after a successful login.
function Dashboard({ user, onLogout }) {
	const [order, setOrder] = useState([]);
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

	function changeQuantity(meal, change) {
		setOrder((currentOrder) => {
			const existingMeal = currentOrder.find((item) => item.name === meal.name);
			if (!existingMeal && change > 0) return [...currentOrder, { ...meal, quantity: 1 }];

			return currentOrder
				.map((item) => item.name === meal.name ? { ...item, quantity: item.quantity + change } : item)
				.filter((item) => item.quantity > 0);
		});
	}

	const orderCount = order.reduce((total, item) => total + item.quantity, 0);
	const orderTotal = order.reduce((total, item) => total + item.price * item.quantity, 0);
	const visibleMeals = showFavorites
		? meals.filter((meal) => favoriteMeals.includes(meal.name))
		: meals;

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
					<div className="section-heading"><div><p className="dashboard-kicker">Made for your day</p><h2>Popular right now</h2></div><div className="section-actions"><button type="button" className={`saved-filter${showFavorites ? " active" : ""}`} onClick={() => setShowFavorites((current) => !current)} aria-pressed={showFavorites}>Saved <span>{favoriteMeals.length}</span></button><button type="button" className="text-action">View full menu <span>↗</span></button></div></div>
					{visibleMeals.length === 0 ? <p className="empty-meals">No meals saved yet. Select a star to keep one here.</p> : <div className="meal-grid">
						{visibleMeals.map((meal) => {
							const isFavorite = favoriteMeals.includes(meal.name);
							return <article className={`meal-card ${meal.tone}`} key={meal.name}><div className="meal-art"><span aria-hidden="true" /><button type="button" className={`favorite-toggle${isFavorite ? " is-favorite" : ""}`} onClick={() => toggleFavorite(meal.name)} aria-label={isFavorite ? `Remove ${meal.name} from saved meals` : `Save ${meal.name}`} aria-pressed={isFavorite}>{isFavorite ? "★" : "☆"}</button></div><div className="meal-info"><h3>{meal.name}</h3><p>{meal.detail}</p><div><strong>{formatPrice(meal.price)}</strong><button type="button" onClick={() => changeQuantity(meal, 1)} aria-label={`Add ${meal.name} to order`}>+</button></div></div></article>;
						})}
					</div>}
					{order.length > 0 && <aside className="order-summary" aria-live="polite" aria-label="Your order">
						<div className="order-heading"><h3>Your order</h3><span>{orderCount} {orderCount === 1 ? "item" : "items"}</span></div>
						<ul>
							{order.map((item) => <li key={item.name}>
								<div className="order-item-copy"><strong>{item.name}</strong><span>{formatPrice(item.price)} each</span></div>
								<div className="quantity-control" aria-label={`${item.name} quantity`}>
									<button type="button" onClick={() => changeQuantity(item, -1)} aria-label={`Remove one ${item.name}`}>−</button>
									<span>{item.quantity}</span>
									<button type="button" onClick={() => changeQuantity(item, 1)} aria-label={`Add one ${item.name}`}>+</button>
								</div>
								<strong className="order-line-total">{formatPrice(item.price * item.quantity)}</strong>
							</li>)}
						</ul>
						<div className="order-total"><span>Estimated total</span><strong>{formatPrice(orderTotal)}</strong></div>
					</aside>}
				</section>

				<section className="dashboard-tip"><span>✦</span><div><strong>Quick tip</strong><p>Order before 11:30 AM for the smoothest lunch pickup.</p></div><button type="button">Got it</button></section>
			</main>
		</div>
	);
}

export default Dashboard;
