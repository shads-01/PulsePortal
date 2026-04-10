import DoctorDashboard from "../pages/doctor/DoctorDashboard";
import DoctorProfile from "../pages/doctor/DoctorProfile";
import DoctorAppointments from "../pages/doctor/DoctorAppointments";

export const doctorRoutes = [
    { index: true, element: <DoctorDashboard /> },
    { path: "profile", element: <DoctorProfile /> },
    { path: "appointments", element: <DoctorAppointments /> },
];