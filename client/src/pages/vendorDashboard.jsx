import { useEffect, useRef, useState } from "react";
import "./dashboard.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const emptyFood = {
	name: "",
	detail: "",
	category: "Breakfast",
	price: "",
	quantity: "20",
	available: true,
	imageUrl: "",
	preparationTime: "15",
	tone: "green",
};

// Each vendor action advances an order to its next status.
const nextOrderStatuses = {
	placed: { status: "accepted", action: "Accept order" },
	accepted: { status: "preparing", action: "Start preparing" },
	preparing: { status: "ready", action: "Mark ready" },
	ready: { status: "collected", action: "Mark collected" },
};

const orderStatusLabels = {
	placed: "Placed",
	accepted: "Accepted",
	preparing: "Preparing",
	ready: "Ready",
	collected: "Collected",
};

// Parse API responses consistently and surface backend error messages.
async function readVendorResponse(response) {
	const data = await response.json();
	if (!response.ok) throw new Error(data.message || "The server could not complete the request");
	return data;
}

function VendorDashboard({ user, onLogout }) {
	const [orders, setOrders] = useState([]);
	const [foods, setFoods] = useState([]);
	const [error, setError] = useState("");
	const [foodError, setFoodError] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingFoods, setIsLoadingFoods] = useState(true);
	const [statusMessage, setStatusMessage] = useState("");
	const [foodMessage, setFoodMessage] = useState("");
	const [updatingOrderId, setUpdatingOrderId] = useState("");
	const [foodDraft, setFoodDraft] = useState(emptyFood);
	const [editingFoodId, setEditingFoodId] = useState("");
	const [isSavingFood, setIsSavingFood] = useState(false);
	const [notificationMessage, setNotificationMessage] = useState("");
	const [notificationPermission, setNotificationPermission] = useState(() =>
		typeof window !== "undefined" && "Notification" in window
			? window.Notification.permission
			: "unsupported",
	);
	const knownOrderIds = useRef(null);

	// Poll this vendor's order queue and notify only when a new placed order appears.
	useEffect(() => {
		let isActive = true;
		const loadQueue = async () => {
			try {
				const response = await fetch(`${API_BASE_URL}/orders/vendor/queue`, {
					headers: { Authorization: `Bearer ${localStorage.getItem("unibiteToken")}` },
				});
				const data = await readVendorResponse(response);
				if (isActive) {
					const previousOrderIds = knownOrderIds.current;
					const newOrders = previousOrderIds
						? data.orders.filter((order) => order.status === "placed" && !previousOrderIds.has(order._id))
						: [];
					knownOrderIds.current = new Set(data.orders.map((order) => order._id));
					setOrders(data.orders);
					if (newOrders.length > 0) {
						const message = `${newOrders.length} new order${newOrders.length === 1 ? "" : "s"} received.`;
						setNotificationMessage(message);
						if ("Notification" in window && window.Notification.permission === "granted") {
							new window.Notification("New UniBite order", {
								body: newOrders.map((order) => `Token ${order.pickupToken}`).join(", "),
							});
						}
					}
					setError("");
				}
			} catch (loadError) {
				if (isActive) setError(loadError.message || "Could not load pickup queue");
			} finally {
				if (isActive) setIsLoading(false);
			}
		};
		void loadQueue();
		const timer = window.setInterval(loadQueue, 15000);
		return () => {
			isActive = false;
			window.clearInterval(timer);
		};
	}, []);

	// Load the menu items owned by the signed-in vendor.
	useEffect(() => {
		let isActive = true;
		fetch(`${API_BASE_URL}/foods/vendor`, {
			headers: { Authorization: `Bearer ${localStorage.getItem("unibiteToken")}` },
		})
			.then(readVendorResponse)
			.then((data) => { if (isActive) setFoods(data.foods); })
			.catch((loadError) => { if (isActive) setFoodError(loadError.message || "Could not load your menu"); })
			.finally(() => { if (isActive) setIsLoadingFoods(false); });
		return () => { isActive = false; };
	}, []);

	// POST creates a food item; PUT updates the item currently being edited.
	const saveFood = async (event) => {
		event.preventDefault();
		setIsSavingFood(true);
		setFoodError("");
		setFoodMessage("");
		try {
			const response = await fetch(
				`${API_BASE_URL}/foods${editingFoodId ? `/${editingFoodId}` : ""}`,
				{
					method: editingFoodId ? "PUT" : "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${localStorage.getItem("unibiteToken")}`,
					},
					body: JSON.stringify({
						...foodDraft,
						price: Number(foodDraft.price),
						quantity: Number(foodDraft.quantity),
						preparationTime: Number(foodDraft.preparationTime),
					}),
				},
			);
			const data = await readVendorResponse(response);
			setFoods((current) => editingFoodId
				? current.map((food) => food._id === editingFoodId ? data.food : food)
				: [...current, data.food].sort((first, second) => first.name.localeCompare(second.name)));
			setFoodMessage(data.message);
			setFoodDraft(emptyFood);
			setEditingFoodId("");
		} catch (saveError) {
			setFoodError(saveError.message || "Could not save food");
		} finally {
			setIsSavingFood(false);
		}
	};

	// Fill the form with the selected item's current values before editing.
	const editFood = (food) => {
		setEditingFoodId(food._id);
		setFoodDraft({
			name: food.name,
			detail: food.detail,
			category: food.category,
			price: String(food.price),
			quantity: String(food.quantity),
			available: food.available !== false,
			imageUrl: food.imageUrl || "",
			preparationTime: String(food.preparationTime || 15),
			tone: food.tone || "green",
		});
		setFoodError("");
		setFoodMessage("");
	};

	// Confirm before deletion; the API prevents removing items in active orders.
	const deleteFood = async (food) => {
		if (!window.confirm(`Remove ${food.name} from your menu?`)) return;
		setFoodError("");
		setFoodMessage("");
		try {
			const response = await fetch(`${API_BASE_URL}/foods/${food._id}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${localStorage.getItem("unibiteToken")}` },
			});
			const data = await readVendorResponse(response);
			setFoods((current) => current.filter((item) => item._id !== food._id));
			setFoodMessage(data.message);
			if (editingFoodId === food._id) {
				setEditingFoodId("");
				setFoodDraft(emptyFood);
			}
		} catch (deleteError) {
			setFoodError(deleteError.message || "Could not delete food");
		}
	};

	// Persist the item's availability change and refresh its displayed state.
	const toggleAvailability = async (food) => {
		setFoodError("");
		setFoodMessage("");
		try {
			const response = await fetch(`${API_BASE_URL}/foods/${food._id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("unibiteToken")}`,
				},
				body: JSON.stringify({ available: !food.available }),
			});
			const data = await readVendorResponse(response);
			setFoods((current) => current.map((item) => item._id === food._id ? data.food : item));
			setFoodMessage(data.message);
		} catch (updateError) {
			setFoodError(updateError.message || "Could not update availability");
		}
	};

	// Browser notifications are optional; the in-dashboard queue still works without them.
	const enableNotifications = async () => {
		if (!("Notification" in window)) {
			setNotificationPermission("unsupported");
			return;
		}
		try {
			const permission = await window.Notification.requestPermission();
			setNotificationPermission(permission);
			setNotificationMessage(permission === "granted"
				? "Browser notifications enabled."
				: "Browser notifications were not enabled. New orders will still appear here.");
		} catch (permissionError) {
			setNotificationMessage(permissionError.message || "Could not enable browser notifications.");
		}
	};

	// Advance the order and remove it from this active queue once collected.
	const updateOrderStatus = async (order) => {
		const nextStatus = nextOrderStatuses[order.status];
		if (!nextStatus) return;

		setError("");
		setStatusMessage("");
		setUpdatingOrderId(order._id);
		try {
			const response = await fetch(`${API_BASE_URL}/orders/vendor/${order._id}/status`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("unibiteToken")}`,
				},
				body: JSON.stringify({ status: nextStatus.status }),
			});
			const data = await readVendorResponse(response);
			setOrders((current) => data.order.status === "collected"
				? current.filter((item) => item._id !== order._id)
				: current.map((item) => item._id === order._id
					? { ...item, status: data.order.status }
					: item));
			setStatusMessage(data.message);
		} catch (statusError) {
			setError(statusError.message || "Could not update order status");
		} finally {
			setUpdatingOrderId("");
		}
	};

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
					<p>Manage your menu and keep incoming campus orders moving.</p>
				</section>
				{/* Vendors create and manage their own menu items here. */}
				<section className="vendor-section" aria-labelledby="vendor-menu-title">
					<div className="vendor-section-heading">
						<div><p className="dashboard-kicker">MENU MANAGEMENT</p><h2 id="vendor-menu-title">Your food items</h2></div>
					</div>
					{foodError && <p className="admin-error" role="alert">{foodError}</p>}
					{foodMessage && <p className="admin-role-message" role="status">{foodMessage}</p>}
					<form className="admin-food-form vendor-food-form" onSubmit={saveFood}>
						<label>Food name<input value={foodDraft.name} onChange={(event) => setFoodDraft({ ...foodDraft, name: event.target.value })} required /></label>
						<label>Description<input value={foodDraft.detail} onChange={(event) => setFoodDraft({ ...foodDraft, detail: event.target.value })} required /></label>
						<label>Category<select value={foodDraft.category} onChange={(event) => setFoodDraft({ ...foodDraft, category: event.target.value })}><option>Breakfast</option><option>Lunch</option><option>Drinks</option></select></label>
						<label>Price (৳)<input type="number" min="0" step="0.01" value={foodDraft.price} onChange={(event) => setFoodDraft({ ...foodDraft, price: event.target.value })} required /></label>
						<label>Stock quantity<input type="number" min="0" step="1" value={foodDraft.quantity} onChange={(event) => setFoodDraft({ ...foodDraft, quantity: event.target.value })} required /></label>
						<label>Preparation time (minutes)<input type="number" min="1" max="240" step="1" value={foodDraft.preparationTime} onChange={(event) => setFoodDraft({ ...foodDraft, preparationTime: event.target.value })} required /></label>
						<label>Image URL<input type="url" value={foodDraft.imageUrl} onChange={(event) => setFoodDraft({ ...foodDraft, imageUrl: event.target.value })} placeholder="https://..." /></label>
						<label>Card color<select value={foodDraft.tone} onChange={(event) => setFoodDraft({ ...foodDraft, tone: event.target.value })}><option value="green">Green</option><option value="orange">Orange</option><option value="red">Red</option></select></label>
						<label className="vendor-availability-field"><input type="checkbox" checked={foodDraft.available} onChange={(event) => setFoodDraft({ ...foodDraft, available: event.target.checked })} /> Available to order</label>
						<div className="admin-food-form-actions">
							<button className="admin-role-save" type="submit" disabled={isSavingFood}>{isSavingFood ? "Saving..." : editingFoodId ? "Save changes" : "Add food"}</button>
							{editingFoodId && <button className="admin-role-save secondary" type="button" onClick={() => { setEditingFoodId(""); setFoodDraft(emptyFood); }}>Cancel edit</button>}
						</div>
					</form>
					{isLoadingFoods ? <p className="admin-state">Loading your menu...</p> : foods.length === 0 ? <p className="admin-state">Your menu is empty. Add your first food item above.</p> : <div className="vendor-menu-grid">
						{foods.map((food) => <article className="vendor-menu-item" key={food._id}>
							{food.imageUrl ? <img src={food.imageUrl} alt={food.name} /> : <div className={`vendor-menu-placeholder ${food.tone || "green"}`} aria-hidden="true" />}
							<div className="vendor-menu-item-info">
								<div className="vendor-menu-item-heading"><h3>{food.name}</h3><span className={food.available ? "vendor-available" : "vendor-unavailable"}>{food.available ? "Available" : "Unavailable"}</span></div>
								<p>{food.detail}</p>
								<p>{food.category} · ৳{new Intl.NumberFormat("en-BD").format(Number(food.price))} · {food.preparationTime} min · Stock {food.quantity}</p>
								<div className="vendor-menu-actions">
									<button className="admin-role-save" type="button" onClick={() => editFood(food)}>Edit</button>
									<button className="admin-role-save secondary" type="button" onClick={() => toggleAvailability(food)}>{food.available ? "Mark unavailable" : "Mark available"}</button>
									<button className="admin-role-save danger" type="button" onClick={() => deleteFood(food)}>Delete</button>
								</div>
							</div>
						</article>)}
					</div>}
				</section>
				{/* Incoming orders show pickup details and the next available status action. */}
				<section className="vendor-section" aria-labelledby="vendor-orders-title">
					<div className="vendor-section-heading">
						<div><p className="dashboard-kicker">ORDER MANAGEMENT</p><h2 id="vendor-orders-title">Incoming orders</h2></div>
						<div className="vendor-notification-actions">
							{notificationPermission === "default" && <button type="button" className="admin-role-save secondary" onClick={enableNotifications}>Enable notifications</button>}
							{notificationPermission === "unsupported" && <span>Browser notifications are unavailable.</span>}
							{notificationPermission === "denied" && <span>Browser notifications are blocked in browser settings.</span>}
						</div>
					</div>
					{notificationMessage && <p className="vendor-notification" role="status" aria-live="polite">{notificationMessage}</p>}
					{error && <p className="admin-error" role="alert">{error}</p>}
					{statusMessage && <p className="admin-role-message" role="status">{statusMessage}</p>}
					<article className="vendor-queue">
						<span className="vendor-tool-label">ORDERS</span>
						<h2>Pickup queue <span className="vendor-order-count">{orders.length}</span></h2>
						{isLoading ? <p>Loading queued pre-orders...</p> : orders.length === 0 ? <p>No active pre-orders right now.</p> : <ol className="vendor-queue-list">
							{orders.map((order) => <li key={order._id}>
								<div>
									<strong>#{order.queuePosition} · Token {order.pickupToken}</strong>
									<p>{order.student?.name || "Student"} · {order.items.map((item) => `${item.mealName} × ${item.quantity}`).join(", ")}</p>
									<p>Pickup {new Date(order.pickupAt).toLocaleString()} · Estimate {new Date(order.estimatedPickupAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
									<p>Prep: {order.items.map((item) => `${item.mealName} ${item.preparationTime || "—"} min`).join(", ")}</p>
									<p>Status: {orderStatusLabels[order.status] || order.status}</p>
								</div>
								<button type="button" disabled={updatingOrderId === order._id} onClick={() => updateOrderStatus(order)}>
									{updatingOrderId === order._id ? "Updating..." : nextOrderStatuses[order.status]?.action || "Order complete"}
								</button>
							</li>)}
						</ol>}
					</article>
				</section>
			</main>
		</div>
	);
}

export default VendorDashboard;