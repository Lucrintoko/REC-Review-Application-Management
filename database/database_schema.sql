-- =============================================================================
-- Database Schema: Research Ethics Review Application and Management System
-- Course: Web Systems and Technologies (WEBSYSTECH - B)
-- Institution: Ateneo de Zamboanga University (AdZU) - CS Department
-- Target DBMS: PostgreSQL (Supabase)
-- Level: 3rd-Year BSIT Normalized Relational Schema (3NF)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUM TYPES DEFINITIONS
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'affiliation_enum') THEN CREATE TYPE affiliation_enum AS ENUM ('Internal', 'External'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role_enum') THEN CREATE TYPE admin_role_enum AS ENUM ('Secretariat', 'Ethics Chair', 'Primary Reviewer', 'Non-Primary Reviewer'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'research_type_enum') THEN CREATE TYPE research_type_enum AS ENUM ('Undergraduate', 'Graduate', 'Faculty', 'Externally Funded'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_type_enum') THEN CREATE TYPE review_type_enum AS ENUM ('Undetermined', 'Exempted', 'Expedited', 'Full Board'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum') THEN CREATE TYPE status_enum AS ENUM ('Draft', 'Submitted', 'Payment Pending', 'Payment Verification', 'Determining Review Type', 'Under Review', 'Recommendations Requested', 'Revising', 'Revisions Submitted', 'Clearance Granted', 'Rejected', 'Withdrawn', 'Ongoing Amendments'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN CREATE TYPE payment_status_enum AS ENUM ('Pending', 'Verified', 'Rejected'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type_enum') THEN CREATE TYPE document_type_enum AS ENUM ('Research Protocol', 'Informed Consent Form', 'Data Collection Instrument', 'Curriculum Vitae', 'Endorsement Letter', 'Revised Protocol', 'Letter of Decision', 'Clearance Certificate', 'Other'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reviewer_role_enum') THEN CREATE TYPE reviewer_role_enum AS ENUM ('Ethics Chair', 'Primary Reviewer', 'Non-Primary Reviewer', 'REC Board Member'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status_enum') THEN CREATE TYPE review_status_enum AS ENUM ('In Progress', 'Completed'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_enum') THEN CREATE TYPE recommendation_enum AS ENUM ('Approved', 'Minor Revisions', 'Major Revisions', 'Disapproved'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recipient_type_enum') THEN CREATE TYPE recipient_type_enum AS ENUM ('Applicant', 'Admin'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum') THEN CREATE TYPE notification_type_enum AS ENUM ('Status Update', 'Payment Verification', 'Review Assignment', 'Revision Request', 'Decision Issued', 'Clearance Granted', 'System Alert'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'process_point_enum') THEN CREATE TYPE process_point_enum AS ENUM ('Initial Submission', 'Payment Required', 'Payment Verification', 'Review Type Assessment', 'Ethical Review', 'Decision Issued', 'Proponent Revisions', 'Revisions Verification', 'Clearance Granted', 'Application Rejected', 'Application Withdrawn'); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'history_status_enum') THEN CREATE TYPE history_status_enum AS ENUM ('Pending', 'Completed'); END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. Table: APPLICANTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applicants (
    applicant_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    affiliation_type affiliation_enum NOT NULL DEFAULT 'Internal',
    department_agency VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_applicant_email ON applicants(email);

-- -----------------------------------------------------------------------------
-- 2. Table: ADMINS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    admin_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role admin_role_enum NOT NULL DEFAULT 'Secretariat',
    specialization VARCHAR(100) NULL,
    contact_number VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admin_role ON admins(role);

-- -----------------------------------------------------------------------------
-- 3. Table: RESEARCH_APPLICATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research_applications (
    application_id SERIAL PRIMARY KEY,
    protocol_code VARCHAR(50) NOT NULL UNIQUE,
    applicant_id INT NOT NULL,
    research_title VARCHAR(255) NOT NULL,
    research_type research_type_enum NOT NULL DEFAULT 'Undergraduate',
    review_type review_type_enum NOT NULL DEFAULT 'Undetermined',
    status status_enum NOT NULL DEFAULT 'Submitted',
    submission_date DATE NOT NULL,
    decision_date DATE NULL,
    clearance_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_application_applicant
        FOREIGN KEY (applicant_id) REFERENCES applicants (applicant_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_app_status ON research_applications(status);
CREATE INDEX IF NOT EXISTS idx_app_review_type ON research_applications(review_type);
CREATE INDEX IF NOT EXISTS idx_app_submission_date ON research_applications(submission_date);

-- -----------------------------------------------------------------------------
-- 4. Table: PAYMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    application_id INT NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    or_number VARCHAR(50) NOT NULL,
    proof_of_payment VARCHAR(255) NULL,
    payment_status payment_status_enum NOT NULL DEFAULT 'Pending',
    verified_by_admin_id INT NULL,
    verification_notes TEXT NULL,
    payment_date DATE NOT NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_application
        FOREIGN KEY (application_id) REFERENCES research_applications (application_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_payment_admin
        FOREIGN KEY (verified_by_admin_id) REFERENCES admins (admin_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payments(payment_status);

-- -----------------------------------------------------------------------------
-- 5. Table: RESEARCH_DOCUMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research_documents (
    document_id SERIAL PRIMARY KEY,
    application_id INT NOT NULL,
    document_type document_type_enum NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size_kb INT NULL,
    version_number INT NOT NULL DEFAULT 1,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_application
        FOREIGN KEY (application_id) REFERENCES research_applications (application_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_doc_application_type ON research_documents(application_id, document_type);

-- -----------------------------------------------------------------------------
-- 6. Table: PROTOCOL_REVIEWS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS protocol_reviews (
    review_id SERIAL PRIMARY KEY,
    application_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    reviewer_role reviewer_role_enum NOT NULL,
    review_status review_status_enum NOT NULL DEFAULT 'In Progress',
    recommendation recommendation_enum NULL,
    comments TEXT NULL,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_application
        FOREIGN KEY (application_id) REFERENCES research_applications (application_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_review_admin
        FOREIGN KEY (reviewer_id) REFERENCES admins (admin_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    UNIQUE (application_id, reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_review_status ON protocol_reviews(review_status);

-- -----------------------------------------------------------------------------
-- 7. Table: NOTIFICATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    application_id INT NOT NULL,
    recipient_type recipient_type_enum NOT NULL,
    recipient_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    notification_type notification_type_enum NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_application
        FOREIGN KEY (application_id) REFERENCES research_applications (application_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_recipient ON notifications(recipient_type, recipient_id, is_read);

-- -----------------------------------------------------------------------------
-- 8. Table: APPLICATION_HISTORY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_history (
    history_id SERIAL PRIMARY KEY,
    application_id INT NOT NULL,
    process_point process_point_enum NOT NULL,
    status history_status_enum NOT NULL DEFAULT 'Pending',
    proponent_name VARCHAR(100) NOT NULL,
    date_completed TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_application
        FOREIGN KEY (application_id) REFERENCES research_applications (application_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_history_app ON application_history(application_id);
CREATE INDEX IF NOT EXISTS idx_history_process ON application_history(process_point);

-- -----------------------------------------------------------------------------
-- 9. Initial Seed Data
-- -----------------------------------------------------------------------------
INSERT INTO admins (admin_id, first_name, last_name, email, password_hash, role)
VALUES 
(1, 'Admin', 'Secretariat', 'secretariat@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', 'Secretariat'),
(2, 'Ethics', 'Chair', 'chair@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', 'Ethics Chair'),
(3, 'Primary', 'Reviewer', 'primary@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', 'Primary Reviewer'),
(4, 'Non-Primary', 'Reviewer', 'nonprimary@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', 'Non-Primary Reviewer')
ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email;

INSERT INTO applicants (applicant_id, first_name, last_name, email, password_hash, contact_number, affiliation_type, department_agency)
VALUES 
(1, 'Juan', 'Dela Cruz', 'jdelacruz@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', '09171234567', 'Internal', 'College of Science and Information Technology')
ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name;

INSERT INTO research_applications (application_id, protocol_code, applicant_id, research_title, research_type, review_type, status, submission_date, decision_date, clearance_date)
VALUES
(1, '2026-001', 1, 'Ethical Implications of AI-Assisted Clinical Diagnostics in Zamboanga City Health Centers', 'Undergraduate', 'Expedited', 'Under Review', '2026-09-15', NULL, NULL),
(2, '2026-002', 1, 'Prevalence of Digital Burnout Among Healthcare Workers in Western Mindanao', 'Faculty', 'Exempted', 'Clearance Granted', '2026-09-10', '2026-09-20', '2026-09-20'),
(3, '2026-003', 1, 'Biocultural Diversity and Indigenous Health Practices in Rural Communities', 'Graduate', 'Full Board', 'Draft', '2026-09-22', NULL, NULL),
(4, '2026-004', 1, 'Psychological Resilience in Post-Pandemic Blended Learning Environments', 'Undergraduate', 'Undetermined', 'Payment Verification', '2026-09-18', NULL, NULL),
(5, '2026-005', 1, 'Assessing Telehealth Privacy Protocols in Regional Public Hospitals', 'Externally Funded', 'Full Board', 'Revising', '2026-09-05', NULL, NULL),
(6, '2026-006', 1, 'Longitudinal Study on Community Water Fluoridation and Dental Health', 'Faculty', 'Undetermined', 'Submitted', '2026-08-28', NULL, NULL),
(7, '2026-007', 1, 'Pediatric Nutritional Interventions in Urban Coastal Barangays', 'Graduate', 'Undetermined', 'Payment Pending', '2026-09-24', NULL, NULL),
(8, '2026-008', 1, 'Impact of AI on Modern Education in Zamboanga', 'Graduate', 'Full Board', 'Under Review', '2026-10-01', NULL, NULL),
(9, '2026-009', 1, 'Marine Biodiversity in the Sulu Sea', 'Faculty', 'Expedited', 'Clearance Granted', '2026-09-01', '2026-09-15', '2026-09-18'),
(10, '2026-010', 1, 'Renewable Energy Adoption in Rural Communities', 'Externally Funded', 'Undetermined', 'Payment Pending', '2026-10-05', NULL, NULL),
(11, '2026-011', 1, 'Mental Health among IT Professionals Post-Pandemic', 'Undergraduate', 'Expedited', 'Revising', '2026-09-10', NULL, NULL),
(12, '2026-012', 1, 'Evaluating E-Government Services Efficiency', 'Graduate', 'Exempted', 'Clearance Granted', '2026-08-20', '2026-08-25', '2026-08-26'),
(13, '2026-013', 1, 'Telemedicine Viability in Geographically Isolated Areas', 'Faculty', 'Full Board', 'Recommendations Requested', '2026-09-12', '2026-09-28', NULL),
(14, '2026-014', 1, 'Comparative Study of Machine Learning Algorithms', 'Undergraduate', 'Undetermined', 'Submitted', '2026-10-06', NULL, NULL),
(15, '2026-015', 1, 'Public Perception of Smart City Initiatives', 'Graduate', 'Undetermined', 'Payment Verification', '2026-10-02', NULL, NULL),
(16, '2026-016', 1, 'Dietary Habits and Lifestyle Diseases in Urban Areas', 'Externally Funded', 'Full Board', 'Rejected', '2026-07-15', '2026-08-10', NULL),
(17, '2026-017', 1, 'Effectiveness of Flipped Classrooms in STEM', 'Faculty', 'Expedited', 'Withdrawn', '2026-08-01', NULL, NULL),
(18, '2026-018', 1, 'Data Privacy Challenges in IoT Devices', 'Undergraduate', 'Undetermined', 'Draft', '2026-10-06', NULL, NULL),
(19, '2026-019', 1, 'Microplastics in Local Water Sources', 'Faculty', 'Full Board', 'Ongoing Amendments', '2026-09-02', '2026-09-15', '2026-09-20'),
(20, '2026-020', 1, 'Socio-economic Impact of E-wallets', 'Graduate', 'Expedited', 'Clearance Granted', '2026-08-14', '2026-08-30', '2026-09-02'),
(21, '2026-021', 1, 'Gamification in Special Education', 'Undergraduate', 'Undetermined', 'Payment Verification', '2026-10-04', NULL, NULL),
(22, '2026-022', 1, 'Effects of Sleep Deprivation on Academic Performance', 'Undergraduate', 'Exempted', 'Clearance Granted', '2026-07-22', '2026-08-01', '2026-08-02'),
(23, '2026-023', 1, 'Agricultural Supply Chain Optimization', 'Faculty', 'Expedited', 'Revising', '2026-09-18', '2026-10-01', NULL),
(24, '2026-024', 1, 'Cybersecurity Protocols in Local Banks', 'Externally Funded', 'Full Board', 'Under Review', '2026-09-25', NULL, NULL),
(25, '2026-025', 1, 'Urban Farming Feasibility in Zamboanga', 'Graduate', 'Undetermined', 'Determining Review Type', '2026-10-03', NULL, NULL),
(26, '2026-026', 1, 'Social Media Influence on Voter Behavior', 'Graduate', 'Full Board', 'Rejected', '2026-06-11', '2026-07-05', NULL),
(27, '2026-027', 1, 'Development of a Low-Cost Water Purifier', 'Faculty', 'Expedited', 'Revisions Submitted', '2026-09-14', '2026-09-28', NULL),
(28, '2026-028', 1, 'Virtual Reality in Medical Training', 'Externally Funded', 'Full Board', 'Recommendations Requested', '2026-08-25', '2026-09-20', NULL),
(29, '2026-029', 1, 'Ethnomedicinal Plants of the Yakan Tribe', 'Graduate', 'Full Board', 'Under Review', '2026-09-28', NULL, NULL),
(30, '2026-030', 1, 'Automated Traffic Violation Detection System', 'Undergraduate', 'Undetermined', 'Payment Pending', '2026-10-05', NULL, NULL),
(31, '2026-031', 1, 'Impact of Hybrid Work on Employee Productivity', 'Faculty', 'Exempted', 'Clearance Granted', '2026-08-05', '2026-08-15', '2026-08-15'),
(32, '2026-032', 1, 'Climate Change Awareness among High School Students', 'Undergraduate', 'Undetermined', 'Submitted', '2026-10-06', NULL, NULL),
(33, '2026-033', 1, 'Blockchain for Land Registry Systems', 'Graduate', 'Full Board', 'Draft', '2026-10-06', NULL, NULL),
(34, '2026-034', 1, 'Nutritional Value of Indigenous Fruits', 'Faculty', 'Expedited', 'Withdrawn', '2026-07-10', NULL, NULL),
(35, '2026-035', 1, 'AI-Driven Pest Management in Agriculture', 'Externally Funded', 'Full Board', 'Ongoing Amendments', '2026-08-20', '2026-09-10', '2026-09-25'),
(36, '2026-036', 1, 'Consumer Perception of Lab-Grown Meat', 'Graduate', 'Expedited', 'Clearance Granted', '2026-07-28', '2026-08-12', '2026-08-14'),
(37, '2026-037', 1, 'Ergonomics of Online Distance Learning Setups', 'Undergraduate', 'Undetermined', 'Determining Review Type', '2026-10-01', NULL, NULL)
ON CONFLICT (protocol_code) DO UPDATE SET research_title = EXCLUDED.research_title;


-- -----------------------------------------------------------------------------
-- 10. Application History Seed Data
-- -----------------------------------------------------------------------------

INSERT INTO application_history (history_id, application_id, process_point, status, proponent_name, date_completed, created_at) VALUES
('1', '1', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-09-15 00:00:00', '2026-09-15 00:00:00'),
('2', '1', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-09-16 00:00:00', '2026-09-16 00:00:00'),
('3', '1', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-09-17 00:00:00', '2026-09-17 00:00:00'),
('4', '1', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-09-18 00:00:00', '2026-09-18 00:00:00'),
('5', '1', 'Ethical Review', 'Pending', 'Juan Dela Cruz', NULL, '2026-09-19 00:00:00'),
('6', '2', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-09-10 00:00:00', '2026-09-10 00:00:00'),
('7', '2', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-09-11 00:00:00', '2026-09-11 00:00:00'),
('8', '2', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-09-12 00:00:00', '2026-09-12 00:00:00'),
('9', '2', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-09-13 00:00:00', '2026-09-13 00:00:00'),
('10', '2', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-09-14 00:00:00', '2026-09-14 00:00:00'),
('11', '2', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-09-15 00:00:00', '2026-09-15 00:00:00'),
('12', '2', 'Clearance Granted', 'Completed', 'Juan Dela Cruz', '2026-09-16 00:00:00', '2026-09-16 00:00:00'),
('13', '4', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-09-18 00:00:00', '2026-09-18 00:00:00'),
('14', '4', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-09-19 00:00:00', '2026-09-19 00:00:00'),
('15', '4', 'Payment Verification', 'Pending', 'Juan Dela Cruz', NULL, '2026-09-20 00:00:00'),
('16', '5', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-09-05 00:00:00', '2026-09-05 00:00:00'),
('17', '5', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-09-06 00:00:00', '2026-09-06 00:00:00'),
('18', '5', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-09-07 00:00:00', '2026-09-07 00:00:00'),
('19', '5', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-09-08 00:00:00', '2026-09-08 00:00:00'),
('20', '5', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-09-09 00:00:00', '2026-09-09 00:00:00'),
('21', '5', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-09-10 00:00:00', '2026-09-10 00:00:00'),
('22', '5', 'Proponent Revisions', 'Pending', 'Juan Dela Cruz', NULL, '2026-09-11 00:00:00'),
('23', '6', 'Initial Submission', 'Pending', 'Juan Dela Cruz', NULL, '2026-08-28 00:00:00'),
('24', '7', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-09-24 00:00:00', '2026-09-24 00:00:00'),
('25', '7', 'Payment Required', 'Pending', 'Juan Dela Cruz', NULL, '2026-09-25 00:00:00'),
('26', '8', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-10-01 00:00:00', '2026-10-01 00:00:00'),
('27', '8', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-10-02 00:00:00', '2026-10-02 00:00:00'),
('28', '8', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-10-03 00:00:00', '2026-10-03 00:00:00'),
('29', '8', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-10-04 00:00:00', '2026-10-04 00:00:00'),
('30', '8', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-10-05 00:00:00', '2026-10-05 00:00:00'),
('31', '8', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-10-06 00:00:00', '2026-10-06 00:00:00'),
('32', '8', 'Clearance Granted', 'Completed', 'Juan Dela Cruz', '2026-10-07 00:00:00', '2026-10-07 00:00:00'),
('33', '9', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-10-02 00:00:00', '2026-10-02 00:00:00'),
('34', '9', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-10-03 00:00:00', '2026-10-03 00:00:00'),
('35', '9', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-10-04 00:00:00', '2026-10-04 00:00:00'),
('36', '9', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-10-05 00:00:00', '2026-10-05 00:00:00'),
('37', '9', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-10-06 00:00:00', '2026-10-06 00:00:00'),
('38', '9', 'Decision Issued', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-07 00:00:00'),
('39', '10', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-10-03 00:00:00', '2026-10-03 00:00:00'),
('40', '10', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-10-04 00:00:00', '2026-10-04 00:00:00'),
('41', '10', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-10-05 00:00:00', '2026-10-05 00:00:00'),
('42', '10', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-10-06 00:00:00', '2026-10-06 00:00:00'),
('43', '10', 'Ethical Review', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-07 00:00:00'),
('44', '11', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-10-04 00:00:00', '2026-10-04 00:00:00'),
('45', '11', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-10-05 00:00:00', '2026-10-05 00:00:00'),
('46', '11', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-10-06 00:00:00', '2026-10-06 00:00:00'),
('47', '11', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-10-07 00:00:00', '2026-10-07 00:00:00'),
('48', '11', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-10-08 00:00:00', '2026-10-08 00:00:00'),
('49', '11', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-10-09 00:00:00', '2026-10-09 00:00:00'),
('50', '11', 'Proponent Revisions', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-10 00:00:00'),
('51', '12', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-10-05 00:00:00', '2026-10-05 00:00:00'),
('52', '12', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-10-06 00:00:00', '2026-10-06 00:00:00'),
('53', '12', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-10-07 00:00:00', '2026-10-07 00:00:00'),
('54', '12', 'Review Type Assessment', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-08 00:00:00'),
('55', '13', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-10-06 00:00:00', '2026-10-06 00:00:00'),
('56', '13', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-10-07 00:00:00', '2026-10-07 00:00:00'),
('57', '13', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-10-08 00:00:00', '2026-10-08 00:00:00'),
('58', '13', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-10-09 00:00:00', '2026-10-09 00:00:00'),
('59', '13', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-10-10 00:00:00', '2026-10-10 00:00:00'),
('60', '13', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-10-11 00:00:00', '2026-10-11 00:00:00'),
('61', '13', 'Proponent Revisions', 'Completed', 'Juan Dela Cruz', '2026-10-12 00:00:00', '2026-10-12 00:00:00'),
('62', '13', 'Revisions Verification', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-13 00:00:00'),
('63', '14', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-10-07 00:00:00', '2026-10-07 00:00:00'),
('64', '14', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-10-08 00:00:00', '2026-10-08 00:00:00'),
('65', '14', 'Payment Verification', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-09 00:00:00'),
('66', '15', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-10-08 00:00:00', '2026-10-08 00:00:00'),
('67', '15', 'Payment Required', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-09 00:00:00'),
('68', '16', 'Initial Submission', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-09 00:00:00'),
('69', '17', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-10-10 00:00:00', '2026-10-10 00:00:00'),
('70', '17', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-10-11 00:00:00', '2026-10-11 00:00:00'),
('71', '17', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-10-12 00:00:00', '2026-10-12 00:00:00'),
('72', '17', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-10-13 00:00:00', '2026-10-13 00:00:00'),
('73', '17', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-10-14 00:00:00', '2026-10-14 00:00:00'),
('74', '17', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-10-15 00:00:00', '2026-10-15 00:00:00'),
('75', '17', 'Clearance Granted', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-16 00:00:00'),
('76', '19', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-09-02 00:00:00', '2026-09-02 00:00:00'),
('77', '19', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-09-03 00:00:00', '2026-09-03 00:00:00'),
('78', '19', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-09-04 00:00:00', '2026-09-04 00:00:00'),
('79', '19', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-09-05 00:00:00', '2026-09-05 00:00:00'),
('80', '19', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-09-06 00:00:00', '2026-09-06 00:00:00'),
('81', '19', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-09-07 00:00:00', '2026-09-07 00:00:00'),
('82', '19', 'Clearance Granted', 'Pending', 'Juan Dela Cruz', NULL, '2026-09-08 00:00:00'),
('83', '20', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-08-14 00:00:00', '2026-08-14 00:00:00'),
('84', '20', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-08-15 00:00:00', '2026-08-15 00:00:00'),
('85', '20', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-08-16 00:00:00', '2026-08-16 00:00:00'),
('86', '20', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-08-17 00:00:00', '2026-08-17 00:00:00'),
('87', '20', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-08-18 00:00:00', '2026-08-18 00:00:00'),
('88', '20', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-08-19 00:00:00', '2026-08-19 00:00:00'),
('89', '20', 'Clearance Granted', 'Completed', 'Juan Dela Cruz', '2026-08-20 00:00:00', '2026-08-20 00:00:00'),
('90', '21', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-10-04 00:00:00', '2026-10-04 00:00:00'),
('91', '21', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-10-05 00:00:00', '2026-10-05 00:00:00'),
('92', '21', 'Payment Verification', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-06 00:00:00'),
('93', '22', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-07-22 00:00:00', '2026-07-22 00:00:00'),
('94', '22', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-07-23 00:00:00', '2026-07-23 00:00:00'),
('95', '22', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-07-24 00:00:00', '2026-07-24 00:00:00'),
('96', '22', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-07-25 00:00:00', '2026-07-25 00:00:00'),
('97', '22', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-07-26 00:00:00', '2026-07-26 00:00:00'),
('98', '22', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-07-27 00:00:00', '2026-07-27 00:00:00'),
('99', '22', 'Clearance Granted', 'Completed', 'Juan Dela Cruz', '2026-07-28 00:00:00', '2026-07-28 00:00:00'),
('100', '23', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-09-18 00:00:00', '2026-09-18 00:00:00'),
('101', '23', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-09-19 00:00:00', '2026-09-19 00:00:00'),
('102', '23', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-09-20 00:00:00', '2026-09-20 00:00:00'),
('103', '23', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-09-21 00:00:00', '2026-09-21 00:00:00'),
('104', '23', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-09-22 00:00:00', '2026-09-22 00:00:00'),
('105', '23', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-09-23 00:00:00', '2026-09-23 00:00:00'),
('106', '23', 'Proponent Revisions', 'Pending', 'Juan Dela Cruz', NULL, '2026-09-24 00:00:00'),
('107', '24', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-09-25 00:00:00', '2026-09-25 00:00:00'),
('108', '24', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-09-26 00:00:00', '2026-09-26 00:00:00'),
('109', '24', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
('110', '24', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-09-28 00:00:00', '2026-09-28 00:00:00'),
('111', '24', 'Ethical Review', 'Pending', 'Juan Dela Cruz', NULL, '2026-09-29 00:00:00'),
('112', '25', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-10-03 00:00:00', '2026-10-03 00:00:00'),
('113', '25', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-10-04 00:00:00', '2026-10-04 00:00:00'),
('114', '25', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-10-05 00:00:00', '2026-10-05 00:00:00'),
('115', '25', 'Review Type Assessment', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-06 00:00:00'),
('116', '26', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-06-11 00:00:00', '2026-06-11 00:00:00'),
('117', '26', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-06-12 00:00:00', '2026-06-12 00:00:00'),
('118', '26', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-06-13 00:00:00', '2026-06-13 00:00:00'),
('119', '26', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-06-14 00:00:00', '2026-06-14 00:00:00'),
('120', '26', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-06-15 00:00:00', '2026-06-15 00:00:00'),
('121', '26', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-06-16 00:00:00', '2026-06-16 00:00:00'),
('122', '26', 'Application Rejected', 'Completed', 'Juan Dela Cruz', '2026-06-17 00:00:00', '2026-06-17 00:00:00'),
('123', '27', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-09-14 00:00:00', '2026-09-14 00:00:00'),
('124', '27', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-09-15 00:00:00', '2026-09-15 00:00:00'),
('125', '27', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-09-16 00:00:00', '2026-09-16 00:00:00'),
('126', '27', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-09-17 00:00:00', '2026-09-17 00:00:00'),
('127', '27', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-09-18 00:00:00', '2026-09-18 00:00:00'),
('128', '27', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-09-19 00:00:00', '2026-09-19 00:00:00'),
('129', '27', 'Proponent Revisions', 'Completed', 'Juan Dela Cruz', '2026-09-20 00:00:00', '2026-09-20 00:00:00'),
('130', '27', 'Revisions Verification', 'Pending', 'Juan Dela Cruz', NULL, '2026-09-21 00:00:00'),
('131', '28', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-08-25 00:00:00', '2026-08-25 00:00:00'),
('132', '28', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-08-26 00:00:00', '2026-08-26 00:00:00'),
('133', '28', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-08-27 00:00:00', '2026-08-27 00:00:00'),
('134', '28', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-08-28 00:00:00', '2026-08-28 00:00:00'),
('135', '28', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-08-29 00:00:00', '2026-08-29 00:00:00'),
('136', '28', 'Decision Issued', 'Pending', 'Juan Dela Cruz', NULL, '2026-08-30 00:00:00'),
('137', '29', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-09-28 00:00:00', '2026-09-28 00:00:00'),
('138', '29', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-09-29 00:00:00', '2026-09-29 00:00:00'),
('139', '29', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-09-30 00:00:00', '2026-09-30 00:00:00'),
('140', '29', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-10-01 00:00:00', '2026-10-01 00:00:00'),
('141', '29', 'Ethical Review', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-02 00:00:00'),
('142', '30', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-10-05 00:00:00', '2026-10-05 00:00:00'),
('143', '30', 'Payment Required', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-06 00:00:00'),
('144', '31', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-08-05 00:00:00', '2026-08-05 00:00:00'),
('145', '31', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-08-06 00:00:00', '2026-08-06 00:00:00'),
('146', '31', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-08-07 00:00:00', '2026-08-07 00:00:00'),
('147', '31', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-08-08 00:00:00', '2026-08-08 00:00:00'),
('148', '31', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-08-09 00:00:00', '2026-08-09 00:00:00'),
('149', '31', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-08-10 00:00:00', '2026-08-10 00:00:00'),
('150', '31', 'Clearance Granted', 'Completed', 'Juan Dela Cruz', '2026-08-11 00:00:00', '2026-08-11 00:00:00'),
('151', '32', 'Initial Submission', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-06 00:00:00'),
('152', '34', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-07-10 00:00:00', '2026-07-10 00:00:00'),
('153', '34', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-07-11 00:00:00', '2026-07-11 00:00:00'),
('154', '34', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-07-12 00:00:00', '2026-07-12 00:00:00'),
('155', '34', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-07-13 00:00:00', '2026-07-13 00:00:00'),
('156', '34', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-07-14 00:00:00', '2026-07-14 00:00:00'),
('157', '34', 'Application Withdrawn', 'Completed', 'Juan Dela Cruz', '2026-07-15 00:00:00', '2026-07-15 00:00:00'),
('158', '35', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-08-20 00:00:00', '2026-08-20 00:00:00'),
('159', '35', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-08-21 00:00:00', '2026-08-21 00:00:00'),
('160', '35', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-08-22 00:00:00', '2026-08-22 00:00:00'),
('161', '35', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-08-23 00:00:00', '2026-08-23 00:00:00'),
('162', '35', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-08-24 00:00:00', '2026-08-24 00:00:00'),
('163', '35', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-08-25 00:00:00', '2026-08-25 00:00:00'),
('164', '35', 'Clearance Granted', 'Pending', 'Juan Dela Cruz', NULL, '2026-08-26 00:00:00'),
('165', '36', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-07-28 00:00:00', '2026-07-28 00:00:00'),
('166', '36', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-07-29 00:00:00', '2026-07-29 00:00:00'),
('167', '36', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-07-30 00:00:00', '2026-07-30 00:00:00'),
('168', '36', 'Review Type Assessment', 'Completed', 'Juan Dela Cruz', '2026-07-31 00:00:00', '2026-07-31 00:00:00'),
('169', '36', 'Ethical Review', 'Completed', 'Juan Dela Cruz', '2026-08-01 00:00:00', '2026-08-01 00:00:00'),
('170', '36', 'Decision Issued', 'Completed', 'Juan Dela Cruz', '2026-08-02 00:00:00', '2026-08-02 00:00:00'),
('171', '36', 'Clearance Granted', 'Completed', 'Juan Dela Cruz', '2026-08-03 00:00:00', '2026-08-03 00:00:00'),
('172', '37', 'Initial Submission', 'Completed', 'Juan Dela Cruz', '2026-10-01 00:00:00', '2026-10-01 00:00:00'),
('173', '37', 'Payment Required', 'Completed', 'Juan Dela Cruz', '2026-10-02 00:00:00', '2026-10-02 00:00:00'),
('174', '37', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-10-03 00:00:00', '2026-10-03 00:00:00'),
('175', '37', 'Review Type Assessment', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-04 00:00:00');

