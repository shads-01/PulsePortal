import PatientDashboard from "../pages/patient/PatientDashboard";
import PatientAppointments from "../pages/patient/PatientAppointments";
import BookAppointment from "../pages/patient/BookAppointment";
import PatientProfile from "../pages/patient/PatientProfile";
import PatientConsultation from "../pages/patient/PatientConsultation";
import PatientPrescriptionView from "../pages/patient/PatientPrescriptionView";

export const patientRoutes = [
    { index: true, element: <PatientDashboard /> },
    { path: "appointments", element: <PatientAppointments /> },
    { path: "book-appointment", element: <BookAppointment /> },
    { path: "profile", element: <PatientProfile /> },
    { path: "consultation/:id", element: <PatientConsultation /> },
    { path: "prescription/:id", element: <PatientPrescriptionView /> },
];
