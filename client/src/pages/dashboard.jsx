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
const orderStatusSteps = [
	{ value: "placed", label: "Placed" },
	{ value: "accepted", label: "Accepted" },
	{ value: "preparing", label: "Preparing" },
	{ value: "ready", label: "Ready" },
	{ value: "collected", label: "Collected" },
];
const activePickupStatuses = ["placed", "accepted", "preparing", "ready"];
const getDefaultPickupTime = () => {
	const pickup = new Date(Date.now() + 60 * 60 * 1000);
	pickup.setSeconds(0, 0);
	pickup.setMinutes(Math.ceil(pickup.getMinutes() / 5) * 5);
	const localTime = new Date(pickup.getTime() - pickup.getTimezoneOffset() * 60000);
	return localTime.toISOString().slice(0, 16);
};

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
	const [activeSection, setActiveSection] = useState("overview");
	const [meals, setMeals] = useState(() => isDemoPreview ? previewMeals : []);
	const [isMenuLoading, setIsMenuLoading] = useState(!isDemoPreview);
	const [menuError, setMenuError] = useState("");
	const [vendors, setVendors] = useState(() => isDemoPreview ? [{ _id: "preview-vendor", name: "Campus Vendor" }] : []);
	const [selectedVendorId, setSelectedVendorId] = useState(() => isDemoPreview ? "preview-vendor" : "");
	const [vendorError, setVendorError] = useState("");
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
	const [pickupNotifications, setPickupNotifications] = useState([]);
	const [isHistoryLoading, setIsHistoryLoading] = useState(!isDemoPreview);
	const [historyError, setHistoryError] = useState("");
	const [searchKeyword, setSearchKeyword] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("All");
	const [minPrice, setMinPrice] = useState("");
	const [maxPrice, setMaxPrice] = useState("");
	const [historyMessage, setHistoryMessage] = useState("");
	const [cart, setCart] = useState([]);
	const [pickupTime, setPickupTime] = useState(getDefaultPickupTime);
	const [isCheckingOut, setIsCheckingOut] = useState(false);

	useEffect(() => {
		const syncActiveSection = () => {
			const section = window.location.hash.slice(1);
			setActiveSection(["overview", "menu", "orders"].includes(section) ? section : "overview");
		};
		window.addEventListener("hashchange", syncActiveSection);
		syncActiveSection();
		return () => window.removeEventListener("hashchange", syncActiveSection);
	}, []);

	// FR-03: Load the food catalog and the authenticated student's history from MongoDB APIs.
	useEffect(() => {
		if (isDemoPreview || user.role !== "user") return undefined;

		let isActive = true;
		const token = localStorage.getItem("unibiteToken");
		let isHistoryRequestPending = false;
		const notifiedReadyOrderIds = new Set();

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
			if (isHistoryRequestPending) return;
			isHistoryRequestPending = true;
			try {
				const response = await fetch(`${API_BASE_URL}/orders`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				const data = await readApiResponse(response);
				if (isActive) {
					const newlyReadyOrders = data.orders.filter((order) =>
						order.status === "ready" && !notifiedReadyOrderIds.has(order._id));
					for (const order of newlyReadyOrders) notifiedReadyOrderIds.add(order._id);
					if (newlyReadyOrders.length > 0) {
						setPickupNotifications((current) => [...current, ...newlyReadyOrders]);
					}
					setOrderHistory(data.orders);
					setHistoryError("");
				}
			} catch (error) {
				if (isActive) setHistoryError(error.message);
			} finally {
				isHistoryRequestPending = false;
				if (isActive) setIsHistoryLoading(false);
			}
		}

		async function loadVendors() {
			try {
				const response = await fetch(`${API_BASE_URL}/auth/vendors`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				const data = await readApiResponse(response);
				if (isActive) {
					setVendors(data.vendors);
					setVendorError("");
					setSelectedVendorId((current) => data.vendors.some((vendor) => vendor._id === current)
						? current
						: data.vendors[0]?._id || "");
				}
			} catch (error) {
				if (isActive) setVendorError(error.message);
			}
		}

		void loadFoods();
		void loadOrderHistory();
		void loadVendors();
		const stockRefreshTimer = window.setInterval(loadFoods, 15000);
		const orderRefreshTimer = window.setInterval(loadOrderHistory, 10000);
		return () => {
			isActive = false;
			window.clearInterval(stockRefreshTimer);
			window.clearInterval(orderRefreshTimer);
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

	function addToCart(meal) {
		if (meal.quantity < 1) return;
		const existing = cart.find((item) => item.foodId === meal._id);
		const quantity = existing ? existing.quantity + 1 : 1;
		if (quantity > meal.quantity) {
			setHistoryMessage(`Only ${meal.quantity} ${meal.name} available.`);
			return;
		}
		setCart(existing
			? cart.map((item) => item.foodId === meal._id ? { ...item, quantity } : item)
			: [...cart, { foodId: meal._id, name: meal.name, price: meal.price, quantity }]);
		setHistoryMessage(`${meal.name} added to your cart.`);
	}

	function changeCartQuantity(foodId, change) {
		const item = cart.find((entry) => entry.foodId === foodId);
		const meal = meals.find((entry) => entry._id === foodId);
		if (!item || !meal) return;
		if (change > 0 && item.quantity >= meal.quantity) {
			setHistoryMessage(`Only ${meal.quantity} ${meal.name} available.`);
			return;
		}
		setCart((currentCart) => currentCart.flatMap((item) => {
			if (item.foodId !== foodId) return [item];
			const quantity = item.quantity + change;
			return quantity > 0 ? [{ ...item, quantity }] : [];
		}));
	}

	async function checkoutCart() {
		setIsCheckingOut(true);
		setHistoryError("");
		setHistoryMessage("");
		try {
			let order;
			if (isDemoPreview) {
				const demoItems = cart.map((item) => {
					const meal = meals.find((entry) => entry._id === item.foodId);
					if (!meal || meal.quantity < item.quantity) throw new Error(`${item.name} does not have enough stock.`);
					return { food: item.foodId, mealName: meal.name, category: meal.category, priceAtOrder: meal.price, quantity: item.quantity };
				});
				order = {
					_id: `preview-order-${globalThis.crypto.randomUUID()}`,
					vendor: selectedVendorId,
					items: demoItems,
					totalPrice: demoItems.reduce((sum, item) => sum + item.priceAtOrder * item.quantity, 0),
					pickupAt: new Date(pickupTime).toISOString(),
					pickupToken: "DEMO1234",
					queuePosition: orderHistory.length + 1,
					estimatedPickupAt: new Date(pickupTime).toISOString(),
					status: "placed",
					orderedAt: new Date().toISOString(),
				};
				setMeals((currentMeals) => currentMeals.map((meal) => {
					const item = cart.find((entry) => entry.foodId === meal._id);
					return item ? { ...meal, quantity: meal.quantity - item.quantity } : meal;
				}));
			} else {
				const response = await fetch(`${API_BASE_URL}/orders/preorder`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${localStorage.getItem("unibiteToken")}`,
					},
					body: JSON.stringify({
						items: cart.map(({ foodId, quantity }) => ({ foodId, quantity })),
						vendorId: selectedVendorId,
						pickupTime: new Date(pickupTime).toISOString(),
					}),
				});
				const data = await readApiResponse(response);
				order = data.order;
				setMeals((currentMeals) => currentMeals.map((meal) => {
					const orderedItem = cart.find((item) => item.foodId === meal._id);
					return orderedItem ? { ...meal, quantity: Math.max(0, meal.quantity - orderedItem.quantity) } : meal;
				}));
			}

			setOrderHistory((currentHistory) => [order, ...currentHistory]);
			setCart([]);
			const vendorName = vendors.find((vendor) => vendor._id === selectedVendorId)?.name || "Campus Vendor";
			setHistoryMessage(`Pre-order #${order._id} confirmed with ${vendorName} · ${formatPrice(order.totalPrice)} · Pickup ${new Date(order.pickupAt).toLocaleString()} · Token ${order.pickupToken} · Queue #${order.queuePosition} · Estimate ${new Date(order.estimatedPickupAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
		} catch (error) {
			setHistoryError(error.message || "Could not create pre-order");
		} finally {
			setIsCheckingOut(false);
		}
	}

	async function removeOrderedItem(orderId) {
		setHistoryError("");
		if (isDemoPreview) {
			const cancelledOrder = orderHistory.find((order) => order._id === orderId);
			setOrderHistory((currentHistory) => currentHistory.filter((order) => order._id !== orderId));
			setMeals((currentMeals) => currentMeals.map((meal) => {
				const orderedItem = cancelledOrder?.items?.find((item) => item.food === meal._id);
				if (orderedItem) return { ...meal, quantity: meal.quantity + orderedItem.quantity };
				return cancelledOrder?.mealName === meal.name ? { ...meal, quantity: meal.quantity + 1 } : meal;
			}));
			setHistoryMessage("Demo pre-order cancelled. Stock restored.");
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
			setMeals((currentMeals) => currentMeals.map((meal) => {
				const restoredStock = data.remainingQuantities?.find((item) => item.foodId === meal._id);
				return restoredStock ? { ...meal, quantity: restoredStock.quantity } : meal;
			}));
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
			const matchingOrders = orderHistory.reduce((count, entry) => count + (entry.items?.length
				? entry.items.filter((item) => item.mealName === meal.name).reduce((sum, item) => sum + item.quantity, 0)
				: entry.mealName === meal.name ? 1 : 0), 0);
			const categoryOrders = orderHistory.reduce((count, entry) => count + (entry.items?.length
				? entry.items.filter((item) => item.category === meal.category).reduce((sum, item) => sum + item.quantity, 0)
				: entry.category === meal.category ? 1 : 0), 0);
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
		if (order.status === "cancelled") return summary;
		const items = order.items?.length
			? order.items
			: [{ mealName: order.mealName, category: order.category, priceAtOrder: order.priceAtOrder, quantity: 1 }];
		for (const item of items) {
			const meal = meals.find((entry) => entry.name === item.mealName);
			const price = Number(item.priceAtOrder ?? item.price ?? meal?.price ?? 0);
			const quantity = Number(item.quantity || 1);
			const existingLine = summary.items.get(item.mealName);
			if (existingLine) {
				existingLine.quantity += quantity;
				existingLine.subtotal += price * quantity;
				existingLine.latestOrderId = order._id;
			} else {
				summary.items.set(item.mealName, {
					mealName: item.mealName,
					category: item.category,
					quantity,
					unitPrice: price,
					subtotal: price * quantity,
					latestOrderId: order._id,
				});
			}
			summary.total += price * quantity;
			summary.count += quantity;
		}
		return summary;
	}, { items: new Map(), total: 0, count: 0 });
	const trackedOrders = orderHistory
		.filter((order) => order.pickupToken && order.status !== "cancelled")
		.sort((first, second) => new Date(second.orderedAt) - new Date(first.orderedAt));
	const readyPickupOrders = trackedOrders.filter((order) => order.status === "ready");
	const nextPickupOrder = orderHistory
		.filter((order) => activePickupStatuses.includes(order.status) && order.pickupAt)
		.sort((first, second) => new Date(first.pickupAt) - new Date(second.pickupAt))[0];
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
					<a className={activeSection === "overview" ? "active" : undefined} aria-current={activeSection === "overview" ? "location" : undefined} href="#overview">Overview</a>
					<a className={activeSection === "menu" ? "active" : undefined} aria-current={activeSection === "menu" ? "location" : undefined} href="#menu">Menu</a>
					<a className={activeSection === "orders" ? "active" : undefined} aria-current={activeSection === "orders" ? "location" : undefined} href="#orders">Orders</a>
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
				{pickupNotifications.length > 0 && <aside className="pickup-toast" role="status" aria-live="assertive">
					<div>
						<strong>Pickup notification</strong>
						{pickupNotifications.map((order) => <p key={order._id}>
							Order {order._id} · Token {order.pickupToken} is ready for pickup from {order.vendor?.name || "the vendor"}.
						</p>)}
					</div>
					<button type="button" onClick={() => setPickupNotifications([])} aria-label="Dismiss pickup notifications">×</button>
				</aside>}
				<section className="dashboard-welcome">
					<div>
						<p className="dashboard-kicker">Thursday, 24 September</p>
						<h1>Good morning, {user.name?.split(" ")[0]}.</h1>
						<p>Something delicious is only a few taps away.</p>
					</div>
					<a className="primary-action" href="#menu">Browse today&apos;s menu <span>→</span></a>
				</section>

				<section className="dashboard-stats" aria-label="Order summary">
					<div className="stat-card accent-card"><span className="stat-icon">◷</span><small>Next pickup</small><strong>{nextPickupOrder ? new Date(nextPickupOrder.estimatedPickupAt || nextPickupOrder.pickupAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Not scheduled"}</strong><span>{nextPickupOrder ? `Token ${nextPickupOrder.pickupToken} · Queue #${nextPickupOrder.queuePosition}` : "Place a pre-order to get a pickup token"}</span></div>
					<div className="stat-card"><span className="stat-icon">◎</span><small>Items ordered</small><strong>{orderSummary.count.toString().padStart(2, "0")}</strong><span>Across {orderSummary.items.size} menu items</span></div>
					<div className="stat-card"><span className="stat-icon">৳</span><small>Total spend</small><strong>{formatPrice(orderSummary.total)}</strong><span>Based on your order history</span></div>
				</section>

				<section className="dashboard-orders" id="orders" aria-labelledby="order-history-title">
					<div className="order-history-heading">
						<div><p className="dashboard-kicker">Your activity</p><h2 id="order-history-title">What you ordered</h2></div>
						<strong className="order-history-total">Total: {formatPrice(orderSummary.total)}</strong>
					</div>
					{historyError && <p className="order-history-error" role="alert">Could not load saved orders: {historyError}</p>}
					{readyPickupOrders.length > 0 && <div className="pickup-notification" role="status" aria-live="polite">
						<strong>Your order is ready for pickup</strong>
						{readyPickupOrders.map((order) => <p key={order._id}>Token {order.pickupToken} is ready. Please collect your order from {order.vendor?.name || "the vendor"}.</p>)}
					</div>}
					{trackedOrders.length > 0 && <div className="order-tracking-list" aria-label="Pre-order status">
						{trackedOrders.map((order) => {
							const currentStatus = order.status === "completed" ? "collected" : order.status;
							const currentStep = orderStatusSteps.findIndex((step) => step.value === currentStatus);
							return <article className="order-tracking-card" key={order._id}>
								<div className="order-tracking-heading">
									<div>
										<strong>Pickup token {order.pickupToken}</strong>
										<span>Order {order._id}</span>
									</div>
									<strong className="order-current-status">{orderStatusSteps[currentStep]?.label || order.status}</strong>
								</div>
								<p>{order.items?.map((item) => `${item.mealName} × ${item.quantity}`).join(", ") || order.mealName}</p>
								<ol className="order-status-steps" aria-label="Order progress">
									{orderStatusSteps.map((step, index) => <li
										key={step.value}
										className={`${index <= currentStep ? "is-complete " : ""}${index === currentStep ? "is-current" : ""}`}
										aria-current={index === currentStep ? "step" : undefined}
									>{step.label}</li>)}
								</ol>
								<small>Pickup {new Date(order.pickupAt).toLocaleString()} · ETA {new Date(order.estimatedPickupAt || order.pickupAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>
							</article>;
						})}
					</div>}
					{orderSummary.items.size === 0
						? <p className="empty-meals">{isHistoryLoading ? "Loading your orders…" : "You have not ordered anything yet. Choose a food below to get started."}</p>
						: <div className="order-table-scroll"><table className="order-history-table">
							<thead><tr><th>Food</th><th>Category</th><th>Quantity</th><th>Unit price</th><th>Subtotal</th><th>Action</th></tr></thead>
							<tbody>{[...orderSummary.items.values()].map((item) => <tr key={item.mealName}>
								<td>{item.mealName}</td><td>{item.category}</td><td>{item.quantity}</td>
								<td>{formatPrice(item.unitPrice)}</td><td>{formatPrice(item.subtotal)}</td>
								<td><button type="button" className="remove-order-button" disabled={orderHistory.find((order) => order._id === item.latestOrderId)?.status !== "placed"} onClick={() => removeOrderedItem(item.latestOrderId)}>Cancel latest</button></td>
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
					<section className="student-cart" aria-label="Shopping cart">
						<div className="cart-heading"><div><p className="dashboard-kicker">Ready when you are</p><h3>Your cart <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span></h3></div><strong>{formatPrice(cart.reduce((sum, item) => sum + item.price * item.quantity, 0))}</strong></div>
						{cart.length === 0 ? <p className="cart-empty">Add food from the menu, then choose a pickup time.</p> : <>
							<ul className="cart-items">{cart.map((item) => <li key={item.foodId}><span>{item.name} · {formatPrice(item.price)}</span><div><button type="button" aria-label={`Decrease ${item.name}`} onClick={() => changeCartQuantity(item.foodId, -1)}>−</button><strong>{item.quantity}</strong><button type="button" aria-label={`Increase ${item.name}`} onClick={() => changeCartQuantity(item.foodId, 1)}>+</button></div></li>)}</ul>
							<div className="cart-checkout">
								<label>Vendor<select value={selectedVendorId} onChange={(event) => setSelectedVendorId(event.target.value)} required><option value="">Choose a vendor</option>{vendors.map((vendor) => <option key={vendor._id} value={vendor._id}>{vendor.name}</option>)}</select></label>
								<label>Pickup time<input type="datetime-local" value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} required /></label>
								<button type="button" className="primary-action" disabled={isCheckingOut || !selectedVendorId} onClick={checkoutCart}>{isCheckingOut ? "Confirming..." : "Confirm pre-order"}</button>
							</div>
						</>}
						{vendorError && <p className="order-history-error" role="alert">Could not load vendors: {vendorError}</p>}
						{!isDemoPreview && !vendorError && vendors.length === 0 && <p className="cart-empty">No vendors are available yet. Contact an administrator.</p>}
					</section>
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
											<button type="button" className="order-history-button" onClick={() => addToCart(meal)} disabled={meal.quantity < 1}>
												{meal.quantity > 0 ? (cart.some((item) => item.foodId === meal._id) ? "Add another" : "Add to cart") : "Sold out"}
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
