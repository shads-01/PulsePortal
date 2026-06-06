// ─────────────────────────────────────────────────────────────
//   • The role tabs (Patient / Doctor / Admin)
//   • Login and Sign Up forms
//   • Submit button + OAuth buttons
//   • Toggle between Login and Sign Up modes
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ROLES } from "../config/roles";
import { useNavigate, useSearchParams } from "react-router-dom";
import authService from "../api/authService";
import api from "../api/axios";

// Handling different role tabs
function RoleTabs({ activeRole, onRoleChange, mode }) {
    return (
        <div className="flex items-center bg-slate-100/80 border border-slate-200 rounded-2xl p-1 mb-7">
            {Object.entries(ROLES).map(([key, cfg]) => {
                const isActive = activeRole === key;
                const isDisabled = mode === "signup" && key !== "patient";

                return (
                    <motion.button
                        key={key}
                        onClick={() => !isDisabled && onRoleChange(key)}
                        disabled={isDisabled}
                        whileHover={isDisabled ? {} : { y: -1 }}
                        whileTap={isDisabled ? {} : { scale: 0.97 }}
                        className={`
                            relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold border-none bg-transparent outline-none focus:outline-none ring-0 focus:ring-0
                            ${isDisabled ? "opacity-40 cursor-not-allowed grayscale" : "cursor-pointer"}
                        `}
                        style={{
                            color: isActive
                                ? cfg.accent
                                : isDisabled
                                  ? "#94a3b8"
                                  : "rgba(71,85,105,0.6)",
                        }}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="roleTabBg"
                                className="absolute inset-0 rounded-xl bg-white shadow-sm"
                                style={{
                                    border: `1px solid ${cfg.accent}30`,
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 380,
                                    damping: 28,
                                }}
                            />
                        )}

                        <span className="relative z-10 flex items-center gap-1.5">
                            {cfg.label}
                        </span>
                    </motion.button>
                );
            })}
        </div>
    );
}

// Input Fields Style
function InputField({
    label,
    placeholder,
    type = "text",
    accent,
    accentGlow,
    value,
    onChange,
}) {
    const [focused, setFocused] = useState(false);

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest ml-1">
                {label}
            </label>

            {/* Animated Wrapper */}
            <motion.div
                animate={{
                    boxShadow: focused
                        ? `0 0 0 2px ${accent}, 0 0 16px ${accentGlow}`
                        : "0 0 0 1px #E2E8F0",
                }}
                className="rounded-xl overflow-hidden"
            >
                <input
                    id={label}
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className="
                                w-full
                                bg-white/70
                                hover:bg-white/90
                                focus:bg-white
                                text-slate-800 text-sm
                                px-4 py-3
                                rounded-xl
                                border-none outline-none
                                transition-colors duration-200
                                font-sans
                            "
                    style={{ caretColor: accent }}
                />
            </motion.div>
        </div>
    );
}

export default function AuthForm({ activeRole, onRoleChange }) {
    const [internalRole, setInternalRole] = useState("patient");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const role = activeRole || internalRole;

    const handleRoleChange = (newRole) => {
        if (onRoleChange) {
            onRoleChange(newRole);
        } else {
            setInternalRole(newRole);
        }
    };

    // Mode - login/registration
    const [mode, setMode] = useState("login");
    const cfg = ROLES[role];

    // Form state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Pick up ?error= from URL (e.g. after failed Google callback)
    useEffect(() => {
        const urlError = searchParams.get("error");
        if (urlError) {
            setError(decodeURIComponent(urlError));
        }
    }, [searchParams]);

    // Google OAuth handler
    const handleGoogleLogin = async () => {
        try {
            const response = await api.get("/auth/google/redirect");
            const googleUrl = response.data.data.url;
            window.location.href = googleUrl; // Full page redirect to Google
        } catch {
            setError("Could not connect to Google. Please try again.");
        }
    };

    const toggleMode = () => {
        const newMode = mode === "login" ? "signup" : "login";
        setMode(newMode);
        setError("");

        // Force switch to patient role while signup
        if (newMode === "signup" && role !== "patient") {
            handleRoleChange("patient");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // ── Frontend validation ───────────────────────────────────
        if (mode === "signup") {
            if (!name.trim()) {
                setError("Full name is required.");
                return;
            }
            if (name.trim().length < 2) {
                setError("Name must be at least 2 characters.");
                return;
            }
        }

        if (!email.trim()) {
            setError("Email address is required.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        if (!password) {
            setError("Password is required.");
            return;
        }

        if (mode === "signup" && password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);

        try {
            let user;

            if (mode === "signup") {
                user = await authService.register(name, email, password);
            } else {
                user = await authService.login(email, password);
                // ── Role tab enforcement ──────────────────────────────
                if (user.role !== role) {
                    // Clean up — remove the token that was just stored
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    setError(
                        `No ${role} account found with these credentials.`,
                    );
                    setLoading(false);
                    return;
                }
            }
            // Redirect based on role returned from backend
            if (user.role === "admin") navigate("/admin");
            else if (user.role === "doctor") navigate("/doctor");
            else navigate("/patient");
        } catch (err) {
            console.error("Full error:", err);
            console.error("Response:", err.response);
            // Laravel validation errors come back as errors object (422)
            if (err.response?.data?.errors) {
                // Grab the first error message from whichever field failed
                const firstError = Object.values(
                    err.response.data.errors,
                )[0][0];
                setError(firstError);
            } else {
                const msg =
                    err.response?.data?.message ||
                    "Something went wrong. Please try again.";
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            layout
            className="w-full max-w-md rounded-3xl p-8 lg:p-10 relative shadow-xl max-h-[90vh]"
            style={{
                background: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(50px)",
                border: "1px solid rgba(226,232,240,0.8)",
            }}
        >
            {/* Card Accent Glow */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={`glow-${role}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-20 -right-20 w-56 h-56 rounded-full pointer-events-none"
                    style={{ background: cfg.accentGlow, filter: "blur(60px)" }}
                />
            </AnimatePresence>

            {/* Card Header */}
            <div className="relative z-10 mb-6">
                <motion.h1
                    key={mode + "title"}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-3xl font-extrabold text-slate-800 tracking-tight font-display"
                >
                    {mode === "login" ? "Welcome back" : "Create account"}
                </motion.h1>
                <motion.p
                    key={mode + "sub"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-600 text-sm mt-1.5 font-sans"
                >
                    {mode === "login"
                        ? "Sign in to your account"
                        : "Join thousands of healthcare professionals"}
                </motion.p>
            </div>

            <div className="relative z-10">
                <RoleTabs
                    activeRole={role}
                    onRoleChange={handleRoleChange}
                    mode={mode}
                />
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={role + mode}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 flex flex-col gap-4"
                >
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={handleSubmit}
                    >
                        {mode === "signup" && (
                            <InputField
                                label="Full Name"
                                placeholder="John Doe"
                                type="text"
                                accent={cfg.accent}
                                accentGlow={cfg.accentGlow}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        )}

                        <InputField
                            label="Email Address"
                            placeholder="abc@gmail.com"
                            type="email"
                            accent={cfg.accent}
                            accentGlow={cfg.accentGlow}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <InputField
                            label="Password"
                            placeholder="••••••••••••"
                            type="password"
                            accent={cfg.accent}
                            accentGlow={cfg.accentGlow}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        {/* Forgot Password */}
                        {/* {mode === "login" && (
                            <div className="flex justify-end -mt-1">
                                <button
                                    type="button"
                                    className="text-xs font-medium bg-transparent border-none cursor-pointer transition-opacity focus:outline-none hover:opacity-70 p-0"
                                    style={{ color: cfg.accent }}
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )} */}

                        {/* Error message */}
                        {error && (
                            <p className="text-red-500 text-xs text-center -mt-1">
                                {error}
                            </p>
                        )}

                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={{
                                scale: loading ? 1 : 1.02,
                                boxShadow: `0 12px 44px ${cfg.accentGlow}`,
                            }}
                            whileTap={{ scale: loading ? 1 : 0.98 }}
                            className="w-full py-3.5 rounded-xl font-bold text-white text-sm cursor-pointer border-none mt-1 flex items-center justify-center gap-2 font-sans outline-none focus:outline-none ring-0 focus:ring-0 disabled:opacity-60"
                            style={{
                                background: `linear-gradient(135deg, ${cfg.accent} 0%, ${cfg.meshC} 100%)`,
                                boxShadow: `0 4px 22px ${cfg.accentGlow}`,
                            }}
                        >
                            {loading
                                ? "Please wait..."
                                : mode === "login"
                                  ? "Sign In"
                                  : "Create Account"}
                        </motion.button>
                    </form>

                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-slate-400 text-xs">
                            or continue with
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    {/* Google sign in */}
                    <div className="flex justify-center">
                        {["Google"].map((provider) => (
                            <motion.button
                                key={provider}
                                type="button"
                                onClick={
                                    provider === "Google"
                                        ? handleGoogleLogin
                                        : undefined
                                }
                                whileHover={{
                                    y: -2,
                                    backgroundColor: "rgba(241,245,249,1)",
                                }}
                                whileTap={{ scale: 0.97 }}
                                className="flex items-center justify-center gap-2 py-2.5  px-6 rounded-xl text-slate-600 text-sm font-medium cursor-pointer font-sans border  outline-none focus:outline-none ring-0 focus:ring-0"
                                style={{
                                    background: "rgba(248,250,252,0.8)",
                                    borderColor: "#E2E8F0",
                                }}
                            >
                                {/* ICON */}
                                {provider}
                            </motion.button>
                        ))}
                    </div>

                    {/* Toggle Login/Signup */}
                    <p className="text-center text-slate-500 text-sm mt-2 font-sans">
                        {mode === "login"
                            ? "Don't have an account? "
                            : "Already have an account? "}
                        <motion.button
                            type="button"
                            whileHover={{ opacity: 0.8 }}
                            onClick={toggleMode}
                            className="font-semibold bg-transparent border-none cursor-pointer font-sans outline-none focus:outline-none p-0"
                            style={{ color: cfg.accent }}
                        >
                            {mode === "login" ? "Sign up" : "Sign in"}
                        </motion.button>
                    </p>
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
}
