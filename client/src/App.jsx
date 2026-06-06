import {
    Routes,
    Route,
    Outlet,
    Navigate,
    useNavigate,
} from "react-router-dom";
import api from "./api/axios";
import Navbar from "./components/Navbar";
import AuthPage from "./pages/AuthPage";
import GoogleCallback from "./pages/GoogleCallback";
import HomePage from "./pages/HomePage";
import authService from "./api/authService";
import { patientRoutes } from "./routes/patientRoutes";
import { doctorRoutes } from "./routes/doctorRoutes";
import { adminRoutes } from "./routes/adminRoutes";
import { NotificationProvider } from "./context/NotificationContext";

function RoleLayout() {
    return (
        <>
            <Navbar />
            <Outlet />
        </>
    );
}

function ProtectedRoute({ expectedRole }) {
    const user = authService.getCurrentUser();
    if (!user) return <Navigate to="/auth" replace />;
    if (user.role !== expectedRole)
        return <Navigate to={`/${user.role}`} replace />;
    return <Outlet />;
}

function App() {
    const navigate = useNavigate();

    // Hook up the global interceptor auth error handler to React Router's navigate
    api._onAuthError = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/auth", { replace: true });
    };

    return (
        <NotificationProvider>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/auth/google/callback" element={<GoogleCallback />} />

                    {/* Patient */}
                    <Route
                        path="/patient"
                        element={<ProtectedRoute expectedRole="patient" />}
                    >
                        <Route element={<RoleLayout />}>
                            {patientRoutes.map((route, i) => (
                                <Route key={i} {...route} />
                            ))}
                        </Route>
                    </Route>

                    {/* Doctor */}
                    <Route
                        path="/doctor"
                        element={<ProtectedRoute expectedRole="doctor" />}
                    >
                        <Route element={<RoleLayout />}>
                            {doctorRoutes.map((route, i) => (
                                <Route key={i} {...route} />
                            ))}
                        </Route>
                    </Route>

                    {/* Admin */}
                    <Route
                        path="/admin"
                        element={<ProtectedRoute expectedRole="admin" />}
                    >
                        <Route element={<RoleLayout />}>
                            {adminRoutes.map((route, i) => (
                                <Route key={i} {...route} />
                            ))}
                        </Route>
                    </Route>
                </Routes>
            </NotificationProvider>
    );
}

export default App;