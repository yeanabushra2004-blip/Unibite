import { useEffect, useState } from "react";
import AdminDashboard from "./adminDashboard";
import Profile from "./profile";
import VendorDashboard from "./vendorDashboard";
import "./dashboard.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const previewMeals = [
	{ _id: "preview-paratha-omelette", name: "Paratha & Omelette", detail: "Flaky paratha · Egg omelette", category: "Breakfast", price: 60, tone: "orange" },
	{ _id: "preview-khichuri-egg", name: "Khichuri & Egg", detail: "Bengali rice and lentil khichuri · Boiled egg", category: "Breakfast", price: 90, tone: "green" },
	{ _id: "preview-hot-coffee", name: "Milk Coffee", detail: "Hot coffee with milk", category: "Drinks", price: 50, tone: "red" },
	{ _id: "preview-milkshake", name: "Mango Milkshake", detail: "Thick mango and milk shake", category: "Drinks", price: 120, tone: "orange" },
	{ _id: "preview-cold-coffee", name: "Cold Coffee", detail: "Iced coffee · Chilled milk", category: "Drinks", price: 100, tone: "green" },
	{ _id: "preview-luchi-alur-dom", name: "Luchi & Alur Dom", detail: "Golden luchi · Spiced potato curry", category: "Breakfast", price: 80, tone: "red" },
	{ _id: "preview-dim-paratha", name: "Dim Paratha", detail: "Egg-filled paratha · Salad", category: "Breakfast", price: 70, tone: "orange" },
	{ _id: "preview-chicken-sandwich", name: "Chicken Sandwich", detail: "Grilled chicken · Lettuce · Cheese", category: "Breakfast", price: 110, tone: "green" },
	{ _id: "preview-banana-pancake", name: "Banana Pancake", detail: "Soft pancakes · Banana · Honey", category: "Breakfast", price: 100, tone: "orange" },
	{ _id: "preview-masala-tea", name: "Masala Tea", detail: "Milk tea · Ginger · Warm spices", category: "Drinks", price: 30, tone: "red" },
	{ _id: "preview-chicken-biryani", name: "Chicken Biryani", detail: "Fragrant basmati rice · Spiced chicken", category: "Lunch", price: 180, tone: "green" },
	{ _id: "preview-beef-tehari", name: "Beef Tehari", detail: "Aromatic rice · Tender beef · Borhani-style spices", category: "Lunch", price: 200, tone: "orange" },
	{ _id: "preview-kacchi-biryani", name: "Kacchi Biryani", detail: "Basmati rice · Tender mutton · Potato", category: "Lunch", price: 280, tone: "orange" },
	{ _id: "preview-chicken-curry-rice", name: "Chicken Curry & Rice", detail: "Homestyle chicken curry · Steamed rice", category: "Lunch", price: 160, tone: "green" },
	{ _id: "preview-fish-curry-rice", name: "Fish Curry & Rice", detail: "Bengali fish curry · Steamed rice · Vegetables", category: "Lunch", price: 170, tone: "green" },
	{ _id: "preview-chicken-chowmein", name: "Chicken Chow Mein", detail: "Stir-fried noodles · Chicken · Vegetables", category: "Lunch", price: 150, tone: "orange" },
].map((meal) => ({ ...meal, quantity: 20 }));

// Show all menu prices in Bangladeshi taka.
const formatPrice = (price) => `৳${new Intl.NumberFormat("en-BD").format(price)}`;

async function readApiResponse(response) {
	const data = await response.json();
	if (!response.ok) {
		throw new Error(data.message || "The server could not complete the request");
	}
	return data;
}

// Main authenticated landing page shown after a successful login.
function Dashboard({ user, onLogout, onUserUpdated, isDemoPreview = false }) {
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [meals, setMeals] = useState(() => isDemoPreview ? previewMeals : []);
	const [isMenuLoading, setIsMenuLoading] = useState(!isDemoPreview);
	const [menuError, setMenuError] = useState("");
	const [favoriteMeals, setFavoriteMeals] = useState(() => {
		try {
			const savedMeals = JSON.parse(localStorage.getItem("unibiteFavoriteMeals") || "[]");
			return Array.isArray(savedMeals)
				? savedMeals.filter((name) => typeof name === "string")
				: [];
		} catch {
			return [];
		}
	});
	const [showFavorites, setShowFavorites] = useState(false);
	const [orderHistory, setOrderHistory] = useState([]);
	const [isHistoryLoading, setIsHistoryLoading] = useState(!isDemoPreview);
	const [historyError, setHistoryError] = useState("");
	const [searchKeyword, setSearchKeyword] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("All");
	const [minPrice, setMinPrice] = useState("");
	const [maxPrice, setMaxPrice] = useState("");
	const [historyMessage, setHistoryMessage] = useState("");

	// FR-03: Load the food catalog and the authenticated student's history from MongoDB APIs.
	useEffect(() => {
		if (isDemoPreview || user.role !== "user") return undefined;

		let isActive = true;
		const token = localStorage.getItem("unibiteToken");

		async function loadFoods() {
			try {
				const response = await fetch(`${API_BASE_URL}/foods`);
				const data = await readApiResponse(response);
				if (isActive) setMeals(data.foods);
			} catch (error) {
				if (isActive) {
					setMenuError(error.message);
					console.error("Food stock refresh failed:", error);
				}
			} finally {
				if (isActive) setIsMenuLoading(false);
			}
		}

		async function loadOrderHistory() {
			try {
				const response = await fetch(`${API_BASE_URL}/orders`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				const data = await readApiResponse(response);
				if (isActive) setOrderHistory(data.orders);
			} catch (error) {
				if (isActive) setHistoryError(error.message);
			} finally {
				if (isActive) setIsHistoryLoading(false);
			}
		}

		void loadFoods();
		void loadOrderHistory();
		const stockRefreshTimer = window.setInterval(loadFoods, 15000);
		return () => {
			isActive = false;
			window.clearInterval(stockRefreshTimer);
		};
	}, [isDemoPreview, user.role]);

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

	async function markMealOrdered(meal) {
		if (meal.quantity < 1) {
			setHistoryMessage(`${meal.name} is not available right now.`);
			return;
		}

		if (isDemoPreview) {
			setMeals((currentMeals) => currentMeals.map((currentMeal) =>
				currentMeal._id === meal._id
					? { ...currentMeal, quantity: Math.max(0, currentMeal.quantity - 1) }
					: currentMeal,
			));
			setOrderHistory((currentHistory) => [
				{ _id: `preview-order-${globalThis.crypto.randomUUID()}`, mealName: meal.name, category: meal.category, priceAtOrder: meal.price, status: "placed", orderedAt: new Date().toISOString() },
				...currentHistory,
			]);
			setHistoryMessage(meal.quantity === 1
				? `Demo: ${meal.name} is now sold out.`
				: `Demo: 1 ${meal.name} ordered; ${meal.quantity - 1} left. This is not saved to MongoDB.`);
			return;
		}

		try {
			const token = localStorage.getItem("unibiteToken");
			const response = await fetch(`${API_BASE_URL}/orders`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ foodId: meal._id }),
			});
			const data = await readApiResponse(response);
			setMeals((currentMeals) => currentMeals.map((currentMeal) =>
				currentMeal._id === meal._id
					? { ...currentMeal, quantity: data.order.remainingQuantity }
					: currentMeal,
			));
			setOrderHistory((currentHistory) => [data.order, ...currentHistory]);
			setHistoryMessage(data.message);
			setHistoryError("");
		} catch (error) {
			setHistoryMessage("");
			setHistoryError(error.message);
			if (error.message.includes("sold out")) {
				try {
					const response = await fetch(`${API_BASE_URL}/foods`);
					const data = await readApiResponse(response);
					setMeals(data.foods);
				} catch (refreshError) {
					setHistoryError(`${error.message}. Could not refresh stock: ${refreshError.message}`);
				}
			}
		}
	}

	async function removeOrderedItem(orderId, mealName) {
		setHistoryError("");
		if (isDemoPreview) {
			setOrderHistory((currentHistory) => currentHistory.filter((order) => order._id !== orderId));
			setMeals((currentMeals) => currentMeals.map((meal) =>
				meal.name === mealName ? { ...meal, quantity: meal.quantity + 1 } : meal,
			));
			setHistoryMessage(`${mealName} removed from the demo order. Stock restored.`);
			return;
		}

		try {
			const token = localStorage.getItem("unibiteToken");
			const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await readApiResponse(response);
			setOrderHistory((currentHistory) => currentHistory.filter((order) => order._id !== data.orderId));
			setMeals((currentMeals) => currentMeals.map((meal) =>
				meal.name === mealName ? { ...meal, quantity: data.remainingQuantity } : meal,
			));
			setHistoryMessage(data.message);
		} catch (error) {
			setHistoryError(error.message);
		}
	}

	// FR-03: Filter the food list by keyword, category, saved preference, and price range.
	const filteredMeals = meals.filter((meal) => {
		const keyword = searchKeyword.trim().toLowerCase();
		const matchesKeyword = !keyword || `${meal.name} ${meal.detail} ${meal.category}`.toLowerCase().includes(keyword);
		const matchesCategory = selectedCategory === "All" || meal.category === selectedCategory;
		const matchesMinPrice = minPrice === "" || meal.price >= Number(minPrice);
		const matchesMaxPrice = maxPrice === "" || meal.price <= Number(maxPrice);
		const matchesSavedFilter = !showFavorites || favoriteMeals.includes(meal.name);
		return matchesKeyword && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesSavedFilter;
	});

	// FR-03: Rank matching meals by order history and saved meals as preference signals.
	const visibleMeals = [...filteredMeals].sort((first, second) => {
		const recommendationScore = (meal) => {
			const matchingOrders = orderHistory.filter((entry) => entry.mealName === meal.name).length;
			const categoryOrders = orderHistory.filter((entry) => entry.category === meal.category).length;
			const favoriteBonus = favoriteMeals.includes(meal.name) ? 4 : 0;
			return matchingOrders * 5 + categoryOrders * 2 + favoriteBonus;
		};
		return recommendationScore(second) - recommendationScore(first);
	});
	// FR-03: Present matching recommendations in Breakfast and Lunch groups.
	const mealsByCategory = ["Breakfast", "Lunch", "Drinks"]
		.map((category) => ({
			category,
			meals: visibleMeals.filter((meal) => meal.category === category),
		}))
		.filter((group) => group.meals.length > 0);
	// FR-03: Summarize placed orders by food and calculate the student's total spend.
	const orderSummary = orderHistory.reduce((summary, order) => {
		const meal = meals.find((item) => item.name === order.mealName);
		const price = Number(order.priceAtOrder ?? order.price ?? meal?.price ?? 0);
		const existingLine = summary.items.get(order.mealName);
		if (existingLine) {
			existingLine.quantity += 1;
			existingLine.subtotal += price;
		} else {
			summary.items.set(order.mealName, {
				mealName: order.mealName,
				category: order.category,
				quantity: 1,
				unitPrice: price,
				subtotal: price,
				latestOrderId: order._id,
			});
		}
		summary.total += price;
		summary.count += 1;
		return summary;
	}, { items: new Map(), total: 0, count: 0 });
	const invalidPriceRange = minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice);

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
				{isDemoPreview && <p className="demo-preview-notice" role="status">Demo preview — food search is interactive; orders are not saved to MongoDB.</p>}
				<section className="dashboard-welcome">
					<div>
						<p className="dashboard-kicker">Thursday, 24 September</p>
						<h1>Good morning, {user.name?.split(" ")[0]}.</h1>
						<p>Something delicious is only a few taps away.</p>
					</div>
					<a className="primary-action" href="#menu">Browse today&apos;s menu <span>→</span></a>
				</section>

				<section className="dashboard-stats" aria-label="Order summary">
					<div className="stat-card accent-card"><span className="stat-icon">◷</span><small>Next pickup</small><strong>12:40 PM</strong><span>Library counter</span></div>
					<div className="stat-card"><span className="stat-icon">◎</span><small>Items ordered</small><strong>{orderSummary.count.toString().padStart(2, "0")}</strong><span>Across {orderSummary.items.size} menu items</span></div>
					<div className="stat-card"><span className="stat-icon">৳</span><small>Total spend</small><strong>{formatPrice(orderSummary.total)}</strong><span>Based on your order history</span></div>
				</section>

				<section className="dashboard-orders" id="orders" aria-labelledby="order-history-title">
					<div className="order-history-heading">
						<div><p className="dashboard-kicker">Your activity</p><h2 id="order-history-title">What you ordered</h2></div>
						<strong className="order-history-total">Total: {formatPrice(orderSummary.total)}</strong>
					</div>
					{historyError && <p className="order-history-error" role="alert">Could not load saved orders: {historyError}</p>}
					{orderSummary.items.size === 0
						? <p className="empty-meals">{isHistoryLoading ? "Loading your orders…" : "You have not ordered anything yet. Choose a food below to get started."}</p>
						: <div className="order-table-scroll"><table className="order-history-table">
							<thead><tr><th>Food</th><th>Category</th><th>Quantity</th><th>Unit price</th><th>Subtotal</th><th>Action</th></tr></thead>
							<tbody>{[...orderSummary.items.values()].map((item) => <tr key={item.mealName}>
								<td>{item.mealName}</td><td>{item.category}</td><td>{item.quantity}</td>
								<td>{formatPrice(item.unitPrice)}</td><td>{formatPrice(item.subtotal)}</td>
								<td><button type="button" className="remove-order-button" onClick={() => removeOrderedItem(item.latestOrderId, item.mealName)}>Remove 1</button></td>
							</tr>)}</tbody>
							<tfoot><tr><th colSpan="5">Total ({orderSummary.count} item{orderSummary.count === 1 ? "" : "s"})</th><th>{formatPrice(orderSummary.total)}</th></tr></tfoot>
						</table></div>}
				</section>

				<section className="dashboard-section" id="menu">
					<div className="section-heading"><div><p className="dashboard-kicker">Made for your day</p><h2>Recommended for you</h2></div><div className="section-actions"><button type="button" className={`saved-filter${showFavorites ? " active" : ""}`} onClick={() => setShowFavorites((current) => !current)} aria-pressed={showFavorites}>Saved <span>{favoriteMeals.length}</span></button></div></div>
					<div className="food-filters" role="search" aria-label="Find food">
						<label>Search food<input type="search" value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="Try chicken or noodles" /></label>
						<label>Category<select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}><option>All</option><option>Breakfast</option><option>Lunch</option><option>Drinks</option></select></label>
						<label>Minimum price (৳)<input type="number" min="0" step="1" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="No minimum" /></label>
						<label>Maximum price (৳)<input type="number" min="0" step="1" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="No maximum" /></label>
					</div>
					{historyMessage && <p className="order-history-message" role="status">{historyMessage}</p>}
					{menuError && <p className="empty-meals" role="alert">Could not load the food menu: {menuError}</p>}
					{historyError && <p className="empty-meals" role="alert">Could not load or save order history: {historyError}</p>}
					{menuError ? null : isMenuLoading || isHistoryLoading ? <p className="empty-meals" role="status">Loading menu and order history…</p> : invalidPriceRange ? <p className="empty-meals" role="alert">Minimum price cannot be greater than maximum price.</p> : visibleMeals.length === 0 ? <p className="empty-meals">No meals match these filters. Try changing your search or price range.</p> : <div className="meal-category-groups">
						{mealsByCategory.map(({ category, meals: categoryMeals }) => <section className="meal-category-group" key={category} aria-label={`${category} meals`}>
							<h3>{category}</h3>
							<div className="meal-grid">
								{categoryMeals.map((meal) => {
									const isFavorite = favoriteMeals.includes(meal.name);
									return <article className={`meal-card ${meal.tone}`} key={meal.name}>
										<div className="meal-art">
											<span aria-hidden="true" />
											<button type="button" className={`favorite-toggle${isFavorite ? " is-favorite" : ""}`} onClick={() => toggleFavorite(meal.name)} aria-label={isFavorite ? `Remove ${meal.name} from saved meals` : `Save ${meal.name}`} aria-pressed={isFavorite}>{isFavorite ? "★" : "☆"}</button>
										</div>
										<div className="meal-info">
											{meal.category === "Drinks" && <span className="availability-badge">Available all day</span>}
											<h3>{meal.name}</h3>
											<p>{meal.detail}</p>
											<div className="meal-stock">
												<span className={meal.quantity > 0 ? "stock-available" : "stock-sold-out"}>
													{meal.quantity > 0 ? `${meal.quantity} available` : "Not available"}
												</span>
												<strong>{formatPrice(meal.price)}</strong>
											</div>
											<button type="button" className="order-history-button" onClick={() => markMealOrdered(meal)} disabled={meal.quantity < 1}>
												{meal.quantity > 0 ? "Order 1" : "Sold out"}
											</button>
										</div>
									</article>;
								})}
							</div>
						</section>)}
					</div>}
				</section>

				<section className="dashboard-tip"><span>✦</span><div><strong>Quick tip</strong><p>Order before 11:30 AM for the smoothest lunch pickup.</p></div><button type="button">Got it</button></section>
			</main>}
		</div>
	);
}

export default Dashboard;
