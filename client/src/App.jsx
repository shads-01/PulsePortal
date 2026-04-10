import {
    BrowserRouter,
    Routes,
    Route,
    Outlet,
    Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import AuthPage from "./pages/AuthPage";
import GoogleCallback from "./pages/GoogleCallback";
import HomePage from "./pages/HomePage";
import authService from "./api/authService";
import { patientRoutes } from "./routes/patientRoutes";
import { doctorRoutes } from "./routes/doctorRoutes";
import { adminRoutes } from "./routes/adminRoutes";

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
    return (
        <BrowserRouter>
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
        </BrowserRouter>
    );
}

export default App;
