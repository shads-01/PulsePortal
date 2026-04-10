// ─────────────────────────────────────────────────────────────
//   Google OAuth callback handler
//   Reads token + user from URL params, stores them,
//   and redirects to the correct dashboard.
// ─────────────────────────────────────────────────────────────
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function GoogleCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const token = searchParams.get("token");
        const userData = searchParams.get("user");
        const error = searchParams.get("error");

        if (error) {
            navigate(`/auth?error=${encodeURIComponent(error)}`);
            return;
        }

        if (token && userData) {
            localStorage.setItem("token", token);
            localStorage.setItem("user", userData);

            try {
                const user = JSON.parse(decodeURIComponent(userData));

                if (user.role === "admin")
                    navigate("/admin", { replace: true });
                else if (user.role === "doctor")
                    navigate("/doctor", { replace: true });
                else navigate("/patient", { replace: true });
            } catch {
                // If JSON parsing fails, fall back to auth page
                navigate("/auth", { replace: true });
            }
        } else {
            navigate("/auth", { replace: true });
        }
    }, [navigate, searchParams]);

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Inter, sans-serif",
                color: "#64748b",
                fontSize: "1rem",
            }}
        >
            Signing you in…
        </div>
    );
}
