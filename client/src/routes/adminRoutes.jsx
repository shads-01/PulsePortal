import AdminDashboard from "../pages/admin/AdminDashboard";
import AddDoctor from "../pages/admin/AddDoctor";
import AddAdmin from "../pages/admin/AddAdmin";
import AdminProfile from "../pages/admin/AdminProfile";
import AdminAppointments from "../pages/admin/AdminAppointments";
import RoomAdmissions from "../pages/admin/RoomAdmissions";

export const adminRoutes = [
    { index: true, element: <AdminDashboard /> },
    { path: "add-doctor", element: <AddDoctor /> },
    { path: "add-admin", element: <AddAdmin /> },
    { path: "room-admissions", element: <RoomAdmissions /> },
    { path: "profile", element: <AdminProfile /> },
    {
    path: "all-appointments",
    element: <AdminAppointments />
}
];
