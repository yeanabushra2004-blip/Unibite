import { useEffect, useState } from "react";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import Register from "./pages/register";

function App() {
    const [showLogin, setShowLogin] = useState(false);
    const [user, setUser] = useState(null);
    const [isCheckingSession, setIsCheckingSession] = useState(() =>
        Boolean(localStorage.getItem("unibiteToken")),
    );

    // Restore the previous login session when the page is refreshed.
    useEffect(() => {
        const token = localStorage.getItem("unibiteToken");

        if (!token) {
            return;
        }

        fetch("http://localhost:5000/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error("Session expired");
                }

                const data = await response.json();
                setUser(data.user);
                localStorage.setItem("unibiteUser", JSON.stringify(data.user));
            })
            .catch(() => {
                localStorage.removeItem("unibiteToken");
                localStorage.removeItem("unibiteUser");
            })
            .finally(() => setIsCheckingSession(false));
    }, []);

    // Remove the local session and return to the login screen.
    const handleLogout = () => {
        localStorage.removeItem("unibiteToken");
        localStorage.removeItem("unibiteUser");
        setUser(null);
        setShowLogin(true);
    };

    if (isCheckingSession) {
        return <div className="session-loading">Loading your UniBite...</div>;
    }

    // A verified user goes directly to the dashboard.
    if (user) {
        return <Dashboard user={user} onLogout={handleLogout} />;
    }

    // Visitors without a valid token can switch between auth screens.
    return showLogin ? (
        <Login
            onRegister={() => setShowLogin(false)}
            onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
        />
    ) : (
        <Register onLogin={() => setShowLogin(true)} />
    );
}

export default App;