import { useEffect, useState } from "react";
import "./dashboard.css";

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

function VendorDashboard({ user, onLogout }) {
	const [orders, setOrders] = useState([]);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [statusMessage, setStatusMessage] = useState("");
	const [updatingOrderId, setUpdatingOrderId] = useState("");

	useEffect(() => {
		let isActive = true;
		const loadQueue = async () => {
			try {
				const response = await fetch("http://localhost:5000/api/orders/vendor/queue", {
					headers: { Authorization: `Bearer ${localStorage.getItem("unibiteToken")}` },
				});
				const data = await response.json();
				if (!response.ok) throw new Error(data.message || "Could not load pickup queue");
				if (isActive) setOrders(data.orders);
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

	const updateOrderStatus = async (order) => {
		const nextStatus = nextOrderStatuses[order.status];
		if (!nextStatus) return;

		setError("");
		setStatusMessage("");
		setUpdatingOrderId(order._id);
		try {
			const response = await fetch(`http://localhost:5000/api/orders/vendor/${order._id}/status`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("unibiteToken")}`,
				},
				body: JSON.stringify({ status: nextStatus.status }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || "Could not update order status");
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
					<p>Your vendor account is active.</p>
				</section>
				<section className="vendor-tools" aria-label="Vendor tools">
					<article className="vendor-queue">
						<span className="vendor-tool-label">ORDERS</span>
						<h2>Pickup queue</h2>
						{error && <p className="admin-error" role="alert">{error}</p>}
						{statusMessage && <p className="admin-role-message" role="status">{statusMessage}</p>}
						{isLoading ? <p>Loading queued pre-orders...</p> : orders.length === 0 ? <p>No active pre-orders right now.</p> : <ol className="vendor-queue-list">
							{orders.map((order) => <li key={order._id}>
								<div>
									<strong>#{order.queuePosition} · Token {order.pickupToken}</strong>
									<p>{order.student?.name || "Student"} · {order.items.map((item) => `${item.mealName} × ${item.quantity}`).join(", ")}</p>
									<p>Pickup {new Date(order.pickupAt).toLocaleString()} · Estimate {new Date(order.estimatedPickupAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
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