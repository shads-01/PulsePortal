import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HeartPulse, LogOut, User, Menu, X, Bell, Loader2 } from "lucide-react";
import demoImage from "../assets/demo.jpg";
import authService from "../api/authService";
import { useNotifications } from "../context/NotificationContext";


const NAV_LINKS = {
    patient: [
        { name: "My Appointments", path: "appointments" },
        { name: "Book Appointment", path: "book-appointment" },
    ],
    doctor: [{ name: "Appointments", path: "appointments" }],
};

function NavLink({ to, children, isActive }) {
    return (
        <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.2 }}
        >
            <Link
                to={to}
                className={`relative px-0 mx-2 py-2 text-sm transition-colors block ${
                    isActive
                        ? "font-bold text-[#127fec] hover:text-[#127fec]"
                        : "font-medium text-slate-600 hover:text-[#127fec]"
                }`}
            >
                {children}
                {isActive ? (
                    <motion.div
                        className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#127fec]"
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                ) : (
                    <motion.div
                        className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#127fec] origin-left"
                        initial={{ scaleX: 0 }}
                        whileHover={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                    />
                )}
            </Link>
        </motion.div>
    );
}

export default function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();

    // Derive role from the first URL segment: /patient/... → "patient"
    const role = location.pathname.split("/")[1] || "";
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, handleNotificationClick } = useNotifications();

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const dropdownRef = useRef(null);
    const notifRef = useRef(null);
    const mobileMenuRef = useRef(null);

    // Read the stored user to determine admin_role
    const currentUser = authService.getCurrentUser();
    const adminRole = currentUser?.admin_role || null;
    const isSuperAdmin = adminRole === 'Super Admin';

    // Compute admin nav links dynamically based on role
    const getAdminLinks = () => {
        const links = [
            { name: "Room Admission", path: "room-admissions" },
            { name: "Appointments", path: "all-appointments" },
        ];
        if (isSuperAdmin) {
            links.unshift(
                { name: "Add Doctor", path: "add-doctor" },
                { name: "Add Admin", path: "add-admin" },
            );
        }
        return links;
    };

    const links = role === 'admin' ? getAdminLinks() : (NAV_LINKS[role] || []);
    const dashboardPath = `/${role}`;

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await authService.logout();
        navigate("/auth");
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsProfileOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
            if (
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(event.target)
            ) {
                setIsMobileMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <header className="sticky top-0 z-50 w-full">
            <nav className="mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex py-2.5 items-center justify-between rounded-2xl border-b border-white/20 bg-white/80 px-8 shadow-lg backdrop-blur-md transition-all mt-4">
                    {/* Logo + Dashboard Button Section */}
                    <div className="flex items-center gap-3">
                        {/* <Link to="/" className="flex items-center gap-2"> */}
                        <span className="flex text-xl font-bold tracking-tight text-slate-800 font-display">
                            <HeartPulse size={30} className="mr-2" />
                            PulsePortal
                        </span>
                        {/* </Link> */}

                        <Link to={dashboardPath} className="hidden sm:block">
                            <button
                                className="px-5 py-2 ms-5 rounded-full text-sm font-bold text-white shadow-md transition-all active:scale-95 whitespace-nowrap"
                                style={{
                                    background:
                                        "linear-gradient(135deg, #0a5bbf, #127fec)",
                                }}
                            >
                                {role.charAt(0).toUpperCase() + role.slice(1)}{" "}
                                Dashboard
                            </button>
                        </Link>
                    </div>

                    {/* Right Side: Navigation & Profile */}
                    <div className="flex items-center gap-6">
                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex items-center gap-3">
                            {links.map((link, index) => (
                                <React.Fragment key={link.path}>
                                    <NavLink
                                        to={`/${role}/${link.path}`}
                                        isActive={
                                            location.pathname ===
                                            `/${role}/${link.path}`
                                        }
                                    >
                                        {link.name}
                                    </NavLink>
                                    <div className="h-1 w-1 bg-slate-400 rounded-full" />
                                </React.Fragment>
                            ))}

                            {/* Notification Button */}
                            <div className="relative" ref={notifRef}>
                                <motion.button
                                onClick={() => {
                                    setIsNotifOpen(!isNotifOpen);
                                    if (!isNotifOpen) markAsRead();
                                }}
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.92 }}
                                    className="relative p-2 rounded-full text-slate-600 hover:text-[#127fec] hover:bg-[#127fec]/10 transition-colors focus:outline-none"
                                >
                                    <Bell size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                                    )}
                                </motion.button>

                                {/* Notification Dropdown */}
                                <AnimatePresence>
                                    {isNotifOpen && (
                                        <motion.div
                                            initial={{
                                                opacity: 0,
                                                y: 10,
                                                scale: 0.95,
                                            }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                                scale: 1,
                                            }}
                                            exit={{
                                                opacity: 0,
                                                y: 10,
                                                scale: 0.95,
                                            }}
                                            className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-xl p-3 z-50"
                                        >
                                            <p className="text-md font-bold tracking-wider px-2 mb-2">
                                                Notifications
                                            </p>
                                            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                                                {notifications.length > 0 ? (
                                                    notifications.map((note) => (
                                                        <motion.div
                                                            key={note.id}
                                                            onClick={() => {
                                                                handleNotificationClick(note);
                                                                setIsNotifOpen(false);
                                                            }}
                                                            whileHover={{
                                                                backgroundColor: "rgba(18, 127, 236, 0.15)",
                                                            }}
                                                            className="px-3 py-2.5 rounded-lg text-sm border-b border-slate-50 last:border-0 cursor-pointer"
                                                        >
                                                            <div className="font-bold text-[#127fec]">{note.title}</div>
                                                            <div className="text-slate-700 leading-tight">{note.message}</div>
                                                            <div className="text-[10px] text-slate-400 mt-1">{note.time}</div>
                                                        </motion.div>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-8 text-center text-sm text-slate-400">
                                                        No new notifications
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="hidden lg:block h-6 w-px bg-slate-400" />

                        {/* Profile Section */}
                        <div className="flex items-center gap-1">
                            <div className="lg:hidden relative">
                                <motion.button
                                    onClick={() => {
                                        setIsNotifOpen(!isNotifOpen);
                                        if (!isNotifOpen) markAsRead();
                                    }}
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.92 }}
                                    className="relative p-2 rounded-full text-slate-600 hover:text-[#127fec] hover:bg-[#127fec]/10 transition-colors focus:outline-none"
                                >
                                    <Bell size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                                    )}
                                </motion.button>

                                <AnimatePresence>
                                    {isNotifOpen && (
                                        <motion.div
                                            initial={{
                                                opacity: 0,
                                                y: 10,
                                                scale: 0.95,
                                            }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                                scale: 1,
                                            }}
                                            exit={{
                                                opacity: 0,
                                                y: 10,
                                                scale: 0.95,
                                            }}
                                            className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl p-3 z-50"
                                        >
                                            <p className="text-md font-bold tracking-wider px-2 mb-2">
                                                Notifications
                                            </p>
                                            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                                                {notifications.length > 0 ? (
                                                    notifications.map((note) => (
                                                        <motion.div
                                                            key={note.id}
                                                            onClick={() => {
                                                                handleNotificationClick(note);
                                                                setIsNotifOpen(false);
                                                            }}
                                                            whileHover={{
                                                                backgroundColor: "rgba(18, 127, 236, 0.15)",
                                                            }}
                                                            className="px-3 py-2.5 rounded-lg text-sm border-b border-slate-50 last:border-0 cursor-pointer"
                                                        >
                                                            <div className="font-bold text-[#127fec]">{note.title}</div>
                                                            <div className="text-slate-700 leading-tight">{note.message}</div>
                                                            <div className="text-[10px] text-slate-400 mt-1">{note.time}</div>
                                                        </motion.div>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-8 text-center text-sm text-slate-400">
                                                        No new notifications
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Mobile Menu Button */}
                            <motion.button
                                className="lg:hidden p-1 text-slate-600 hover:text-[#127fec] transition-colors"
                                onClick={() =>
                                    setIsMobileMenuOpen(!isMobileMenuOpen)
                                }
                                ref={mobileMenuRef}
                            >
                                {isMobileMenuOpen ? (
                                    <X size={24} />
                                ) : (
                                    <Menu size={24} />
                                )}
                            </motion.button>

                            {/* Profile Dropdown */}
                            <div className="relative z-100" ref={dropdownRef}>
                                <motion.button
                                    onClick={() =>
                                        setIsProfileOpen(!isProfileOpen)
                                    }
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="relative rounded-full focus:outline-none p-1"
                                >
                                    <div className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-slate-200 hover:ring-[#127fec] transition-all duration-200">
                                        <img
                                            src={demoImage}
                                            alt="Profile"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                </motion.button>

                                <AnimatePresence className="p-0">
                                    {isProfileOpen && (
                                        <motion.div
                                            initial={{
                                                opacity: 0,
                                                y: 10,
                                                scale: 0.95,
                                            }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                                scale: 1,
                                            }}
                                            exit={{
                                                opacity: 0,
                                                y: 10,
                                                scale: 0.95,
                                            }}
                                            className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-xl p-2 z-50"
                                        >
                                            <motion.button
                                             onClick={() => {
                                                 if (role === "admin") navigate("/admin/profile");
                                                 else if (role === "doctor") navigate("/doctor/profile");
                                                 else if (role === "patient") navigate("/patient/profile"); }}
                                                whileHover={{
                                                    x: 3,
                                                    backgroundColor:
                                                        "rgba(18, 127, 236, 0.05)",
                                                    border: "1px solid #127fec",
                                                }}
                                                whileTap={{ scale: 0.97 }}
                                                transition={{ duration: 0.2 }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:text-[#127fec] rounded-lg transition-colors font-medium"
                                            >
                                                <User size={18} />
                                                Profile
                                            </motion.button>

                                            <div className="h-px mx-2 my-1 bg-slate-300" />

                                            <motion.button
                                                onClick={handleLogout}
                                                disabled={isLoggingOut}
                                                whileHover={{
                                                    x: 3,
                                                    backgroundColor:
                                                        "rgba(239, 68, 68, 0.05)",
                                                    border: "1px solid red",
                                                }}
                                                whileTap={{ scale: 0.97 }}
                                                transition={{ duration: 0.2 }}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-colors font-medium
                                                    ${isLoggingOut ? "text-red-600 bg-red-50" : "text-slate-700 hover:text-red-600"}
                                                `}
                                            >
                                                {isLoggingOut ? (
                                                    <Loader2 size={18} className="animate-spin text-red-500" />
                                                ) : (
                                                    <LogOut size={18} />
                                                )}
                                                {isLoggingOut ? "Signing Out..." : "Sign Out"}
                                            </motion.button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="lg:hidden overflow-hidden bg-white/90 backdrop-blur-md rounded-2xl mt-2 border border-white/20 shadow-lg"
                        >
                            <div className="flex flex-col p-4 gap-2">
                                {links.map((link) => (
                                    <Link
                                        key={link.path}
                                        to={`/${role}/${link.path}`}
                                        onClick={() =>
                                            setIsMobileMenuOpen(false)
                                        }
                                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                                            location.pathname ===
                                            `/${role}/${link.path}`
                                                ? "bg-[#127fec]/10 text-[#127fec]"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-[#127fec]"
                                        }`}
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                                <div className="h-px bg-slate-200 mb-1" />
                                <Link
                                    to={dashboardPath}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="sm:hidden w-full"
                                >
                                    <button
                                        className="w-full px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95"
                                        style={{
                                            background:
                                                "linear-gradient(135deg, #0a5bbf, #127fec)",
                                        }}
                                    >
                                        {role.charAt(0).toUpperCase() +
                                            role.slice(1)}{" "}
                                        Dashboard
                                    </button>
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
        </header>
    );
}