# 🏥 Pulse Portal

An intelligent hospital management and telehealth platform that connects patients, doctors, and administrators through structured appointment workflows, live Jitsi video consultations, and a provider-agnostic AI engine for symptom triage, specialist recommendations, and clinical summarization.

## 🛠️ Technologies

| 🏗️ Layer | 💻 Stack |
| :--- | :--- |
| **Frontend** | React 19, TailwindCSS, Vite, Framer Motion, Lucide Icons |
| **Backend** | Laravel 10 (PHP 8.2), Nginx, PHP-FPM |
| **Database** | MySQL 8.0 (Docker local / Aiven Cloud production) |
| **Authentication** | JWT (tymon/jwt-auth), Google OAuth via Laravel Socialite |
| **Real-Time** | Pusher & Laravel Echo (WebSocket broadcasting) |
| **AI** | Multi-provider service — Gemini, OpenAI, Anthropic, xAI, Mistral, Ollama |
| **Telehealth** | Jitsi Meet (embedded iframe video consultations) |
| **PDF Generation** | barryvdh/laravel-dompdf |
| **Medicine Data** | MedEx Bangladesh API (live autocomplete & search) |
| **Email** | Laravel Queued Mail, Mailpit (local SMTP testing) |
| **DevOps** | Docker Compose (5 containers), Render (production deployment) |

## ✨ Features

- 🎥 **Jitsi Video Consultations** — Fully embedded Jitsi Meet rooms for both doctors and patients with live call status tracking, an automatic patient waiting room, and WebSocket-driven consultation start notifications.
- 🤖 **AI Health Chatbot** — A floating chat panel on the patient dashboard providing real-time symptom guidance, powered by the hospital's available doctor/specialization data.
- 🧠 **AI Specialist Recommendation** — Analyzes patient-described symptoms and returns matching department/specialization suggestions from the actual doctor database during appointment booking.
- 📝 **AI Patient History Summarization** — Generates concise clinical summaries from a patient's completed appointment records, prescriptions, and diagnoses for the doctor's review. Persists the summary to the patient's profile.
- 💊 **AI Prescription Summarization** — Translates complex prescriptions into patient-friendly language with explanations, health suggestions, and warnings.
- 🔍 **Medicine Autocomplete** — Doctors get live medicine name suggestions (with strength and form data) pulled from the MedEx API, including a recent-medicines cache for quick re-prescribing.
- 📄 **Prescription PDF Generation & Email** — Doctors can generate, print, and download prescription PDFs. Prescriptions are automatically emailed to patients on completion.
- 🔔 **Real-Time Notifications** — Pusher-powered WebSocket events for appointment requests, confirmations, consultation starts, and prescription uploads — with persistent in-app notification history.
- 🏥 **Room Admission Management** — A full admission portal for front-desk admins to manage patient check-ins, bed assignments, room transfers, progress notes, discharge, and cancellation.
- 🔐 **Google OAuth** — One-click patient sign-in/registration via Google accounts alongside traditional email/password authentication.
- 🛡️ **Role-Based Access Control** — Four distinct roles (Patient, Doctor, Department Admin, Super Admin) enforced at both the API middleware and frontend routing levels.
- 📅 **Appointment Slot System** — Dynamic time-slot generation based on per-doctor availability schedules, with real-time booked-slot checking to prevent double bookings.

## 👥 What Users Can Do

- 👤 **Patients** — Register via email or Google, chat with the AI Health Assistant, book in-person or online appointments with AI-powered doctor suggestions, join live Jitsi video consultations, view room admission status, view/download prescription PDFs, get AI prescription summaries, and receive real-time notifications.
- 🩺 **Doctors** — View and manage appointment queues, access AI-generated patient history summaries, start and end Jitsi video consultation sessions, write prescriptions with MedEx-powered medicine autocomplete and recommended tests, print/download prescription PDFs, and update their profile and availability.
- 💼 **Department Admins** — Review and approve/reject appointment requests for their department, view department-level statistics and doctor lists.
- 👑 **Super Admins** — Create doctor and admin accounts, view all hospital appointments, access global statistics (total doctors, patients, today's and upcoming appointments), and manage the room admission portal (admissions, bed transfers, discharge, progress notes).

## 🔨 The Process

1. 📐 **Database Design** — Modeled a relational MySQL schema covering users (with role column), patients, doctors, admins, appointments, prescriptions, consultations, notifications, rooms, room beds, room admissions, and admission event logs.
2. 🔒 **Backend API & Auth** — Built a RESTful API in Laravel 10 with JWT-based stateless authentication, custom role middleware (`RoleMiddleware`, `SuperAdminMiddleware`, `AdmissionManagerMiddleware`), and Google OAuth via Socialite.
3. 🤖 **AI Service Layer** — Created a provider-agnostic `AiService` class that normalizes requests/responses across Gemini, OpenAI, Anthropic, xAI, Mistral, and Ollama — switchable via a single `.env` variable.
4. 🎥 **Telehealth Integration** — Integrated Jitsi Meet through embedded iframes on both doctor and patient consultation pages. The backend manages consultation lifecycle (start/end) with a unique room name per session, WebSocket broadcasts to notify the patient, and queued email notifications.
5. 💊 **Prescription System** — Built a full prescription flow: doctors enter diagnoses, medicines (with MedEx autocomplete), dosages, instructions, and recommended tests. On save, the system generates a PDF via DomPDF, emails it to the patient, creates an in-app notification, and marks the appointment as completed.
6. 💻 **Frontend Dashboards** — Developed responsive role-specific dashboards in React 19 with TailwindCSS and Framer Motion animations, client-side routing with protected role guards, and a reusable notification system.
7. 🐳 **Containerization & Deployment** — Configured a 5-container Docker Compose setup (PHP-FPM, Nginx, MySQL, Node/React, Mailpit) for local development, and a Dockerfile with Apache for Render production deployment using Aiven-hosted MySQL.

## 📚 What We Learned

- 🤖 **Provider-Agnostic AI Architecture** — Building a single service interface that abstracts the varying API schemas (Gemini's `contents` format vs. OpenAI's `messages` format vs. Anthropic's `system` field) behind one consistent `chat()` / `structuredChat()` API.
- 🎥 **Jitsi Iframe Integration** — Handling browser permission policies (`camera; microphone; display-capture`) for embedded iframes, managing consultation state transitions (waiting → started → ended) across doctor and patient views, and graceful session termination.
- ⚡ **Real-Time Event Architecture** — Designing Laravel broadcast events that fire on appointment creation, status changes, and consultation starts — and wiring them to Pusher channels scoped per user for instant client-side updates.
- 🌐 **Cross-Origin Decoupled Stack** — Managing CORS, cookie/session configuration, and JWT token refresh flows across a fully decoupled React frontend and Laravel API backend.
- 🔌 **External API Integration** — Scraping and parsing MedEx HTML responses into structured medicine suggestion data with server-side caching to reduce latency and API load.

## 💡 How It Could Be Improved

- 💳 **Payment Gateway Integration** — Adding Stripe or SSLCommerz for online consultation fee payments and room admission billing.
- 📱 **Mobile App** — Porting the patient portal to React Native with native push notifications for appointment reminders and consultation alerts.
- 📊 **Advanced Analytics Dashboard** — Building charts and trend analysis for admins to track appointment volumes, doctor utilization, revenue, and patient satisfaction over time.

## 🚀 How to Run the Project

### 📋 Prerequisites
- [Docker & Docker Compose](https://www.docker.com/)
- [Node.js & npm](https://nodejs.org/) *(only if running the frontend outside Docker)*

### 🔧 Setup

1. 📥 **Clone the repository:**
   ```bash
   git clone https://github.com/shads-01/PulsePortal.git
   ```

2. ⚙️ **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your database credentials, Pusher keys, Google OAuth credentials, and AI API key (`AI_PROVIDER`, `AI_API_KEY`).

3. 🚀 **Start all services:**
   ```bash
   docker-compose up -d --build
   ```

4. ⚙️ **Initialize the backend:**
   ```bash
   docker exec -it pulseportal_app php artisan key:generate
   docker exec -it pulseportal_app php artisan jwt:secret
   docker exec -it pulseportal_app php artisan migrate:fresh --seed
   ```

5. 🌐 **Access the application:**

   | 🖥️ Service | 🔗 URL |
   | :--- | :--- |
   | Frontend (React) | http://localhost:5173 |
   | Backend API | http://localhost:8000/api |
   | Mailpit (Email Testing) | http://localhost:8025 |
   | MySQL | `localhost:3308` (user: `root`, pass: `root`) |

### 🔑 Test Accounts
All seeded accounts use the password: `password123`

| 👥 Role | 📧 Email |
| :--- | :--- |
| Super Admin | `admin@pulseportal.com` |
| Dept Admin (Cardio) | `cardio@pulseportal.com` |
| Doctor (Cardio) | `doctor@pulseportal.com` |
| Patient | `patient@pulseportal.com` |

---

🔗 **Live Demo:** [https://pulseportal.onrender.com](https://pulseportal.onrender.com)
