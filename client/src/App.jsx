import { useEffect, useState } from "react";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import Register from "./pages/register";

const isFoodSearchPreview = new URLSearchParams(window.location.search).get("preview") === "food-search";
const previewUser = { name: "Campus Preview", email: "preview@unibite.local", role: "user" };

function App() {
    const [showLogin, setShowLogin] = useState(false);
    const [authNotice, setAuthNotice] = useState("");
    const [user, setUser] = useState(isFoodSearchPreview ? previewUser : null);
    const [isCheckingSession, setIsCheckingSession] = useState(() =>
        !isFoodSearchPreview && Boolean(localStorage.getItem("unibiteToken")),
    );

    // Restore the previous login session when the page is refreshed.
    useEffect(() => {
        if (isFoodSearchPreview) {
            return;
        }

        const token = localStorage.getItem("unibiteToken");

        if (!token) {
            return;
        }

        fetch("http://localhost:5000/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (response) => {
                if (response.status === 401) {
                    localStorage.removeItem("unibiteToken");
                    localStorage.removeItem("unibiteUser");
                    setShowLogin(true);
                    setAuthNotice("Your session expired. Please sign in again.");
                    return;
                }
                if (!response.ok) {
                    throw new Error("Could not verify the saved session.");
                }

                const data = await response.json();
                if (!["user", "vendor", "admin"].includes(data?.user?.role)) {
                    localStorage.removeItem("unibiteToken");
                    localStorage.removeItem("unibiteUser");
                    setShowLogin(true);
                    setAuthNotice("This account has no supported role. Ask an administrator for help.");
                    return;
                }
                setUser(data.user);
                localStorage.setItem("unibiteUser", JSON.stringify(data.user));
            })
            .catch((error) => {
                console.error("Session restore failed:", error);
                setShowLogin(true);
                setAuthNotice("Could not verify your saved session. Check the backend connection and sign in again.");
            })
            .finally(() => setIsCheckingSession(false));
    }, []);

    // Remove the local session and return to the login screen.
    const handleLogout = () => {
        localStorage.removeItem("unibiteToken");
        localStorage.removeItem("unibiteUser");
        setUser(null);
        setAuthNotice("");
        setShowLogin(true);
    };

    const handleUserUpdated = (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem("unibiteUser", JSON.stringify(updatedUser));
    };

    if (isCheckingSession) {
        return <div className="session-loading">Loading your UniBite...</div>;
    }

    // Dashboard.jsx chooses the view from the authenticated user's role.
    if (user) {
        return <Dashboard user={user} onLogout={handleLogout} onUserUpdated={handleUserUpdated} isDemoPreview={isFoodSearchPreview} />;
    }

    // Visitors without a valid token can switch between auth screens.
    return showLogin ? (
        <Login
            onRegister={() => {
                setAuthNotice("");
                setShowLogin(false);
            }}
            onLoginSuccess={(loggedInUser) => {
                setAuthNotice("");
                setUser(loggedInUser);
            }}
            notice={authNotice}
        />
    ) : (
        <Register
            onLogin={() => {
                setAuthNotice("");
                setShowLogin(true);
            }}
        />
    );
}

export default App;