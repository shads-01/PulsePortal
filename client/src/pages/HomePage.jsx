import { Link } from "react-router-dom";
import { Shield, Video, Zap, Plus } from "lucide-react";
import { motion } from "framer-motion";
import "./HomePage.css";

export default function HomePage() {

     const fadeUp = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">

            {/* ================= NAVBAR ================= */}
             <motion.nav 
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="flex items-center justify-between px-10 py-5 bg-white shadow-sm"
            >
                {/* LOGO */}
                <div className="nav-logo">PulsePortal</div>

                {/* NAV LINKS
                <div className="hidden md:flex items-center gap-8 text-sm font-medium">
                    <a href="#" className="nav-link">Find a Doctor</a>
                    <a href="#" className="nav-link">Appointments</a>
                    <a href="#" className="nav-link">Telehealth</a>
                    <a href="#" className="nav-link">Services</a>
                </div> */}

                {/* LOGIN BUTTON */}
                <Link to="/auth" className="primary-btn">Login</Link>
            </motion.nav>

            {/* ================= HERO SECTION ================= */}
             <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">

                <motion.div 
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="rounded-3xl overflow-hidden shadow-lg"
                >
                    <img
                        src="https://media.istockphoto.com/id/898906302/photo/medical-concept-hospital-corridor-with-rooms.jpg?s=612x612&w=0&k=20&c=HW0ptQCs8l6ocGzuf3kpFX0RXNo8-tlE66EQ1PNgauo="
                        alt="hospital corridor"
                        className="w-full h-[350px] object-cover"
                    />
                </motion.div>

                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.2 }}
                >
                    <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
                        Secure Healthcare <br /> for the Digital Age
                    </h1>

                    <p className="text-slate-600 mb-6 max-w-md">
                        Experience the future of medicine with end-to-end
                        encrypted records and AI-assisted diagnostics.
                        Your health, secured.
                    </p>

                    {/* <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="primary-btn"
                    >
                        Book Appointment
                    </motion.button> */}
                </motion.div>
            </section>


            {/* AI SECTION
            <motion.section 
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="max-w-5xl mx-auto px-6 py-10"
            >
                <div className="bg-white rounded-3xl shadow-md p-10 text-center">

                    <div className="flex items-center justify-center gap-2 text-xl font-bold mb-4">
                        <Plus className="primary-icon" size={22} />
                        AI Health Assistant
                    </div>

                    <p className="text-slate-500 mb-6">
                        Tell us your symptoms, and our AI will find the right specialist for you instantly.
                    </p>

                    <div className="flex items-center bg-slate-100 rounded-full px-4 py-2 max-w-xl mx-auto">
                        <input
                            type="text"
                            placeholder="Describe your symptoms..."
                            className="flex-1 bg-transparent outline-none text-sm"
                        />
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="primary-btn"
                        >
                            Analyze
                        </motion.button>
                    </div>
                </div>
            </motion.section> */}
<motion.section
    variants={fadeUp}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    className="max-w-5xl mx-auto px-6 py-10"
>
    <div className="bg-white rounded-3xl shadow-md p-10 text-center">

        <h2 className="text-2xl font-bold mb-4">How PulsePortal Works</h2>

        <p className="text-slate-500 mb-8">
            A seamless digital healthcare platform connecting patients, doctors, and administrators.
        </p>

        <div className="grid md:grid-cols-3 gap-6 text-left">
            
            <div className="p-4 bg-slate-50 rounded-xl">
                <h3 className="font-semibold mb-2">1. Role-Based Access</h3>
                <p className="text-sm text-slate-500">
                    Secure login system for patients, doctors, and administrators with dedicated dashboards.
                </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
                <h3 className="font-semibold mb-2">2. Book & Manage Appointments</h3>
                <p className="text-sm text-slate-500">
                    Patients can easily schedule appointments with doctors and manage their bookings efficiently.
                </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
                <h3 className="font-semibold mb-2">3. Online Consultation</h3>
                <p className="text-sm text-slate-500">
                    Connect with doctors through real-time online consultations for quick and convenient care.
                </p>
            </div>

        </div>

    </div>
</motion.section>


            {/* FEATURES */}
            <motion.section 
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="max-w-6xl mx-auto px-6 py-16"
            >
                <h2 className="text-3xl font-bold mb-2">Why Choose PulsePortal?</h2>

                <div className="grid md:grid-cols-3 gap-6 mt-8">

                    {[ 
                        { icon: <Shield size={24} />, title: "24/7 Encryption", text: "Your data is secured with military-grade encryption protocols." },
                        { icon: <Video size={24} />, title: "Telehealth Ready", text: "Connect with top-rated specialists from your home." },
                        { icon: <Zap size={24} />, title: "Doctor Recommendations", text: "Find suitable specialists for your health concerns quickly." }
                    ].map((item, index) => (
                        <motion.div
                            key={index}
                            whileHover={{ y: -8 }}
                            className="bg-white p-6 rounded-2xl shadow-sm"
                        >
                            <div className="primary-icon mb-4">{item.icon}</div>
                            <h3 className="font-semibold mb-2">{item.title}</h3>
                            <p className="text-sm text-slate-500">{item.text}</p>
                        </motion.div>
                    ))}

                </div>
            </motion.section>


            {/* FOOTER */}
            <footer className="bg-white border-t py-8 text-center text-sm">
                {/* <div className="flex justify-center gap-8 mb-4">
                    <a href="#" className="footer-link">Privacy Policy</a>
                    <a href="#" className="footer-link">Terms of Service</a>
                    <a href="#" className="footer-link">Contact Us</a>
                </div> */}

                <p className="text-slate-500">© 2025 PulsePortal. All rights reserved.</p>
            </footer>
        </div>
    );
}