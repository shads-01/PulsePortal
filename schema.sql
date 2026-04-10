CREATE DATABASE pulse_portal;

CREATE USER 'admin' @'localhost' IDENTIFIED BY 'admin';

GRANT ALL PRIVILEGES ON pulse_portal.* TO 'admin' @'localhost';

FLUSH PRIVILEGES;

USE pulse_portal;
 
DROP TABLE IF EXISTS visit_notes;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS users;
 
-- ── TABLE 1: users ───────────────────────────────────────────────
-- Central identity table. Every person has one row here.
-- The role column determines which dashboard they see after login.
CREATE TABLE users (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name               VARCHAR(255)    NOT NULL,
    email              VARCHAR(255)    NOT NULL,
    password           VARCHAR(255)    NULL,
    google_id          VARCHAR(255)    NULL,
    role               ENUM('patient','doctor','admin')
                                       NOT NULL DEFAULT 'patient',
    email_verified_at  TIMESTAMP       NULL,
    remember_token     VARCHAR(100)    NULL,
    created_at         TIMESTAMP       NULL,
    updated_at         TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY users_email_unique (email),
    UNIQUE KEY users_google_id_unique (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
-- ── TABLE 2: patients ───────────────────────────────────────────
-- Patient medical profile. Created automatically when a patient registers.
-- UNIQUE on user_id enforces the one-to-one relationship with users.
CREATE TABLE patients (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id            BIGINT UNSIGNED NOT NULL,
    dob                DATE            NULL,
    blood_group        ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-')
                                       NULL,
    medical_history    TEXT            NULL,
    phone              VARCHAR(20)     NULL,
    address            TEXT            NULL,
    emergency_contact  VARCHAR(100)    NULL,
    emergency_phone    VARCHAR(20)     NULL,
    created_at         TIMESTAMP       NULL,
    updated_at         TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY patients_user_id_unique (user_id),
    CONSTRAINT fk_patients_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
-- ── TABLE 3: doctors ────────────────────────────────────────────
-- Doctor profile. Created by admin users ONLY (not via registration).
-- availability stored as JSON: {"mon":["09:00","17:00"], ...}
CREATE TABLE doctors (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id            BIGINT UNSIGNED NOT NULL,
    specialization     VARCHAR(255)    NOT NULL,
    bio                TEXT            NULL,
    phone              VARCHAR(20)     NULL,
    consultation_fee   DECIMAL(10,2)   NOT NULL DEFAULT '0.00',
    availability       JSON            NULL,
    is_available       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at         TIMESTAMP       NULL,
    updated_at         TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY doctors_user_id_unique (user_id),
    CONSTRAINT fk_doctors_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
-- ── TABLE 4: admins ─────────────────────────────────────────────
-- Thin table. Only marks a user as admin.
CREATE TABLE admins (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id            BIGINT UNSIGNED NOT NULL,
    created_at         TIMESTAMP       NULL,
    updated_at         TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY admins_user_id_unique (user_id),
    CONSTRAINT fk_admins_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
-- ── TABLE 5: appointments ───────────────────────────────────────
-- Core junction table. Connects patients with doctors.
-- Status lifecycle: pending → confirmed → completed (or cancelled)
CREATE TABLE appointments (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id         BIGINT UNSIGNED NOT NULL,
    doctor_id          BIGINT UNSIGNED NOT NULL,
    appointment_date   DATE            NOT NULL,
    appointment_time   TIME            NULL,
    type               ENUM('in_person','online')
                                       NOT NULL DEFAULT 'in_person',
    status             ENUM('pending','confirmed','completed','cancelled')
                                       NOT NULL DEFAULT 'pending',
    symptoms           TEXT            NOT NULL,
    admin_notes        TEXT            NULL,
    created_at         TIMESTAMP       NULL,
    updated_at         TIMESTAMP       NULL,
    PRIMARY KEY (id),
    INDEX idx_appointments_patient (patient_id),
    INDEX idx_appointments_doctor  (doctor_id),
    INDEX idx_appointments_date    (appointment_date),
    CONSTRAINT fk_appointments_patient
        FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
    CONSTRAINT fk_appointments_doctor
        FOREIGN KEY (doctor_id)  REFERENCES doctors  (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 
-- ── TABLE 6: visit_notes ────────────────────────────────────────
-- One note per appointment (UNIQUE on appointment_id).
-- ai_* columns are NULL until Milestone 3 (Gemini integration).
CREATE TABLE visit_notes (
    id                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    appointment_id              BIGINT UNSIGNED NOT NULL,
    doctor_notes                TEXT            NOT NULL,
    ai_summary                  TEXT            NULL,
    ai_specialist_recommendation TEXT           NULL,
    ai_history_summary          TEXT            NULL,
    created_at                  TIMESTAMP       NULL,
    updated_at                  TIMESTAMP       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY visit_notes_appointment_id_unique (appointment_id),
    CONSTRAINT fk_visit_notes_appointment
        FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(100)
);

CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Foreign key to users
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

INSERT INTO
    users (name, email, password)
VALUES (
        'Alice',
        'alice@example.com',
        'password123'
    );

INSERT INTO
    posts (user_id, title, content)
VALUES (
        1,
        'My First Post',
        'This is the content of my first post.'
    );
*/