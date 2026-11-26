import { useEffect, useState } from "react";
import "./dashboard.css";

// Default values used by the admin food create/edit form.
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
const formatPrice = (price) => `৳${new Intl.NumberFormat("en-BD").format(Number(price || 0))}`;
const activeOrderStatuses = ["placed", "accepted", "preparing", "ready"];

async function readAdminResponse(response) {
	const result = await response.json();
	if (!response.ok) throw new Error(result.message || "The server could not complete the request");
	return result;
}

function AdminDashboard({ user, onLogout }) {
	const [data, setData] = useState(null);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [reloadKey, setReloadKey] = useState(0);
	const [roleDrafts, setRoleDrafts] = useState({});
	const [savingUserId, setSavingUserId] = useState("");
	const [roleMessage, setRoleMessage] = useState("");
	const [foods, setFoods] = useState([]);
	const [orders, setOrders] = useState([]);
	const [isLoadingFoods, setIsLoadingFoods] = useState(true);
	const [isLoadingOrders, setIsLoadingOrders] = useState(true);
	const [foodError, setFoodError] = useState("");
	const [orderError, setOrderError] = useState("");
	const [foodMessage, setFoodMessage] = useState("");
	const [orderMessage, setOrderMessage] = useState("");
	const [foodDraft, setFoodDraft] = useState(emptyFood);
	const [editingFoodId, setEditingFoodId] = useState("");
	const [isSavingFood, setIsSavingFood] = useState(false);
	const [accountSearch, setAccountSearch] = useState("");

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

	useEffect(() => {
		let isCurrent = true;
		const authorization = { Authorization: `Bearer ${localStorage.getItem("unibiteToken")}` };

		fetch("http://localhost:5000/api/foods", { headers: authorization })
			.then(readAdminResponse)
			.then((result) => { if (isCurrent) setFoods(result.foods); })
			.catch((requestError) => { if (isCurrent) setFoodError(requestError.message); })
			.finally(() => { if (isCurrent) setIsLoadingFoods(false); });

		fetch("http://localhost:5000/api/orders/admin", { headers: authorization })
			.then(readAdminResponse)
			.then((result) => { if (isCurrent) setOrders(result.orders); })
			.catch((requestError) => { if (isCurrent) setOrderError(requestError.message); })
			.finally(() => { if (isCurrent) setIsLoadingOrders(false); });

		return () => { isCurrent = false; };
	}, [reloadKey]);

	const reloadDashboard = () => {
		setIsLoading(true);
		setIsLoadingFoods(true);
		setIsLoadingOrders(true);
		setError("");
		setFoodError("");
		setOrderError("");
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

	// POST a new catalog item or PUT changes to the selected item.
	const saveFood = async (event) => {
		event.preventDefault();
		setIsSavingFood(true);
		setFoodError("");
		setFoodMessage("");
		try {
			const response = await fetch(
				`http://localhost:5000/api/foods${editingFoodId ? `/${editingFoodId}` : ""}`,
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
			const result = await readAdminResponse(response);
			setFoods((current) => editingFoodId
				? current.map((food) => food._id === editingFoodId ? result.food : food)
				: [...current, result.food].sort((first, second) => first.name.localeCompare(second.name)));
			setFoodMessage(result.message);
			setFoodDraft(emptyFood);
			setEditingFoodId("");
		} catch (requestError) {
			setFoodError(requestError.message || "Could not save food");
		} finally {
			setIsSavingFood(false);
		}
	};

	// Load an existing food item into the form for editing.
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
			tone: food.tone,
		});
		setFoodMessage("");
		setFoodError("");
	};

	// Remove an item from the catalog after the admin confirms.
	const deleteFood = async (food) => {
		if (!window.confirm(`Remove ${food.name} from the menu?`)) return;
		setFoodError("");
		setFoodMessage("");
		try {
			const response = await fetch(`http://localhost:5000/api/foods/${food._id}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${localStorage.getItem("unibiteToken")}` },
			});
			const result = await readAdminResponse(response);
			setFoods((current) => current.filter((item) => item._id !== food._id));
			setFoodMessage(result.message);
			if (editingFoodId === food._id) {
				setEditingFoodId("");
				setFoodDraft(emptyFood);
			}
		} catch (requestError) {
			setFoodError(requestError.message || "Could not delete food");
		}
	};

	// Admin can cancel a placed order or mark an active order collected.
	const updateOrderStatus = async (order, action) => {
		setOrderError("");
		setOrderMessage("");
		try {
			const isCancellation = action === "cancel";
			if (isCancellation && !window.confirm(`Cancel order ${order._id}? Its stock will be restored.`)) return;
			const response = await fetch(
				`http://localhost:5000/api/orders/admin/${order._id}${isCancellation ? "" : "/complete"}`,
				{
					method: isCancellation ? "DELETE" : "PATCH",
					headers: { Authorization: `Bearer ${localStorage.getItem("unibiteToken")}` },
				},
			);
			const result = await readAdminResponse(response);
			setOrders((current) => current.map((item) => item._id === order._id
				? { ...item, status: isCancellation ? "cancelled" : result.order.status }
				: item));
			if (isCancellation) {
				setFoods((current) => current.map((food) => {
					const restored = result.remainingQuantities?.find((item) => item.foodId === food._id);
					return restored ? { ...food, quantity: restored.quantity } : food;
				}));
			}
			setOrderMessage(result.message);
		} catch (requestError) {
			setOrderError(requestError.message || "Could not update order");
		}
	};

	const visibleAccounts = (data?.users || []).filter((account) => {
		const search = accountSearch.trim().toLowerCase();
		return !search || `${account.name} ${account.email} ${account.studentId || ""} ${account.role}`.toLowerCase().includes(search);
	});

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
						<p>Manage the food menu, all orders, students, and account roles.</p>
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

				{/* Admin catalog form and table for adding, editing, and deleting foods. */}
				<section className="admin-users-section" aria-labelledby="admin-food-title">
					<div className="admin-section-heading"><div><p className="dashboard-kicker">MENU MANAGEMENT</p><h2 id="admin-food-title">Food catalog</h2></div></div>
					{foodError && <p className="admin-error" role="alert">{foodError}</p>}
					{foodMessage && <p className="admin-role-message" role="status">{foodMessage}</p>}
					<form className="admin-food-form" onSubmit={saveFood}>
						<label>Food name<input name="name" value={foodDraft.name} onChange={(event) => setFoodDraft({ ...foodDraft, name: event.target.value })} required /></label>
						<label>Details<input name="detail" value={foodDraft.detail} onChange={(event) => setFoodDraft({ ...foodDraft, detail: event.target.value })} required /></label>
						<label>Category<select name="category" value={foodDraft.category} onChange={(event) => setFoodDraft({ ...foodDraft, category: event.target.value })}><option>Breakfast</option><option>Lunch</option><option>Drinks</option></select></label>
						<label>Price (৳)<input name="price" type="number" min="0" step="0.01" value={foodDraft.price} onChange={(event) => setFoodDraft({ ...foodDraft, price: event.target.value })} required /></label>
						<label>Stock<input name="quantity" type="number" min="0" step="1" value={foodDraft.quantity} onChange={(event) => setFoodDraft({ ...foodDraft, quantity: event.target.value })} required /></label>
						<label>Preparation time (minutes)<input name="preparationTime" type="number" min="1" max="240" step="1" value={foodDraft.preparationTime} onChange={(event) => setFoodDraft({ ...foodDraft, preparationTime: event.target.value })} required /></label>
						<label>Image URL<input name="imageUrl" type="url" value={foodDraft.imageUrl} onChange={(event) => setFoodDraft({ ...foodDraft, imageUrl: event.target.value })} placeholder="https://..." /></label>
						<label>Card color<select name="tone" value={foodDraft.tone} onChange={(event) => setFoodDraft({ ...foodDraft, tone: event.target.value })}><option value="green">Green</option><option value="orange">Orange</option><option value="red">Red</option></select></label>
						<label className="vendor-availability-field"><input name="available" type="checkbox" checked={foodDraft.available} onChange={(event) => setFoodDraft({ ...foodDraft, available: event.target.checked })} /> Available to order</label>
						<div className="admin-food-form-actions"><button className="admin-role-save" type="submit" disabled={isSavingFood}>{isSavingFood ? "Saving..." : editingFoodId ? "Save food" : "Add food"}</button>{editingFoodId && <button className="admin-role-save secondary" type="button" onClick={() => { setEditingFoodId(""); setFoodDraft(emptyFood); }}>Cancel edit</button>}</div>
					</form>
					{isLoadingFoods ? <p className="admin-state">Loading food catalog...</p> : foods.length === 0 ? <p className="admin-state">No food items found.</p> : <div className="admin-table-scroll"><table className="admin-users-table">
						<thead><tr><th>Food</th><th>Vendor</th><th>Category</th><th>Price</th><th>Stock</th><th>Availability</th><th>Prep time</th><th>Action</th></tr></thead>
						<tbody>{foods.map((food) => <tr key={food._id}><td>{food.name}<small className="admin-food-detail">{food.detail}</small>{food.imageUrl && <small className="admin-food-detail">Image available</small>}</td><td>{food.vendor?.name || "Shared catalog"}</td><td>{food.category}</td><td>{formatPrice(food.price)}</td><td>{food.quantity}</td><td>{food.available === false ? "Unavailable" : "Available"}</td><td>{food.preparationTime} min</td><td><button className="admin-role-save" type="button" onClick={() => editFood(food)}>Edit</button><button className="admin-role-save danger" type="button" onClick={() => deleteFood(food)}>Delete</button></td></tr>)}</tbody>
					</table></div>}
				</section>

				{/* All-order table with admin cancellation and completion controls. */}
				<section className="admin-users-section" aria-labelledby="admin-orders-title">
					<div className="admin-section-heading"><div><p className="dashboard-kicker">ORDER MANAGEMENT</p><h2 id="admin-orders-title">All orders</h2></div><button type="button" onClick={reloadDashboard} disabled={isLoadingOrders}>Refresh</button></div>
					{orderError && <p className="admin-error" role="alert">{orderError}</p>}
					{orderMessage && <p className="admin-role-message" role="status">{orderMessage}</p>}
					{isLoadingOrders ? <p className="admin-state">Loading orders...</p> : orders.length === 0 ? <p className="admin-state">No orders found.</p> : <div className="admin-table-scroll"><table className="admin-users-table admin-orders-table">
						<thead><tr><th>Order</th><th>Student</th><th>Vendor</th><th>Items</th><th>Total</th><th>Pickup</th><th>Token / Queue</th><th>Status</th><th>Action</th></tr></thead>
						<tbody>{orders.map((order) => {
							const items = order.items?.length
								? order.items
								: [{ mealName: order.mealName, quantity: 1, priceAtOrder: order.priceAtOrder }];
							const total = order.totalPrice ?? items.reduce((sum, item) => sum + Number(item.priceAtOrder || 0) * Number(item.quantity || 1), 0);
							return <tr key={order._id}>
								<td>{order._id}</td>
								<td>{order.student?.name || "Student"}<small className="admin-food-detail">{order.student?.email || ""}</small></td>
								<td>{order.vendor?.name || "—"}</td>
								<td>{items.map((item) => `${item.mealName} × ${item.quantity || 1}`).join(", ")}</td>
								<td>{formatPrice(total)}</td>
								<td>{order.pickupAt ? new Date(order.pickupAt).toLocaleString() : "—"}</td>
								<td>{order.pickupToken ? `${order.pickupToken} · #${order.queuePosition}` : "—"}{order.estimatedPickupAt && <small className="admin-food-detail">ETA {new Date(order.estimatedPickupAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>}</td>
								<td>{order.status === "completed" ? "collected" : order.status}</td>
								<td>{activeOrderStatuses.includes(order.status) && <button className="admin-role-save" type="button" onClick={() => updateOrderStatus(order, "complete")}>Mark collected</button>}{order.status === "placed" && <button className="admin-role-save danger" type="button" onClick={() => updateOrderStatus(order, "cancel")}>Cancel</button>}</td>
							</tr>;
						})}</tbody>
					</table></div>}
				</section>

				{/* Search accounts and update their assigned roles. */}
				<section className="admin-users-section">
					<div className="admin-section-heading"><div><p className="dashboard-kicker">STUDENT MANAGEMENT</p><h2>Registered accounts</h2></div><button type="button" onClick={reloadDashboard} disabled={isLoading}>Refresh</button></div>
					{roleMessage && <p className="admin-role-message" role="status">{roleMessage}</p>}
					<label className="admin-account-search">Find student/account<input type="search" value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} placeholder="Search name, email, Student ID, or role" /></label>
					{isLoading ? <p className="admin-state">Loading accounts...</p> : visibleAccounts.length ? <div className="admin-table-scroll"><table className="admin-users-table">
						<thead><tr><th>Name</th><th>Email</th><th>Student ID</th><th>Phone</th><th>Role</th><th>Action</th></tr></thead>
						<tbody>{visibleAccounts.map((account) => <tr key={account._id}><td>{account.name}</td><td>{account.email}</td><td>{account.studentId}</td><td>{account.phone}</td><td><select className="admin-role-select" aria-label={`Role for ${account.name}`} value={roleDrafts[account._id] ?? account.role} onChange={(event) => setRoleDrafts((drafts) => ({ ...drafts, [account._id]: event.target.value }))}><option value="user">Student</option><option value="vendor">Vendor</option><option value="admin">Admin</option></select></td><td><button className="admin-role-save" type="button" onClick={() => saveRole(account)} disabled={(roleDrafts[account._id] ?? account.role) === account.role || savingUserId === account._id}>{savingUserId === account._id ? "Saving..." : "Save role"}</button></td></tr>)}</tbody>
					</table></div> : <p className="admin-state">{data?.users.length ? "No accounts match your search." : "No accounts found."}</p>}
				</section>
			</main>
		</div>
	);
}

export default AdminDashboard;