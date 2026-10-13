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
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum') THEN CREATE TYPE status_enum AS ENUM ('Draft', 'Protocols Submitted', 'Payment Pending', 'Payment Verified', 'Type of Review', 'Ongoing Review', 'Consolidation of Evaluation', 'Decision Letter Issued', 'Revisions Submitted', 'Clearance Granted', 'Rejected', 'Withdrawn', 'Amendments'); END IF;
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
    status status_enum NOT NULL DEFAULT 'Protocols Submitted',
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

-- =============================================================================
-- DUMMY DATA INSERTS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Data for table: applicants
-- -----------------------------------------------------------------------------
INSERT INTO applicants (applicant_id, first_name, last_name, email, password_hash, contact_number, affiliation_type, department_agency, created_at, updated_at) VALUES
('1', 'Juan', 'Dela Cruz', 'jdelacruz@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', '09171234567', 'Internal', 'College of Science and Information Technology', '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176');

-- -----------------------------------------------------------------------------
-- Data for table: admins
-- -----------------------------------------------------------------------------
INSERT INTO admins (admin_id, first_name, last_name, email, password_hash, role, specialization, contact_number, created_at, updated_at) VALUES
('1', 'Admin', 'Secretariat', 'secretariat@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', 'Secretariat', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('2', 'Ethics', 'Chair', 'chair@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', 'Ethics Chair', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('3', 'Primary', 'Reviewer', 'primary@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', 'Primary Reviewer', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('4', 'Non-Primary', 'Reviewer', 'nonprimary@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', 'Non-Primary Reviewer', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176');

-- -----------------------------------------------------------------------------
-- Data for table: research_applications
-- -----------------------------------------------------------------------------
INSERT INTO research_applications (application_id, protocol_code, applicant_id, research_title, research_type, review_type, status, submission_date, decision_date, clearance_date, created_at, updated_at) VALUES
('1', '2026-0001', '1', 'Ethical Implications of AI-Assisted Clinical Diagnostics in Zamboanga City Health Centers', 'Undergraduate', 'Expedited', 'Ongoing Review', '2026-09-15', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('2', '2026-0002', '1', 'Prevalence of Digital Burnout Among Healthcare Workers in Western Mindanao', 'Faculty', 'Exempted', 'Clearance Granted', '2026-09-10', '2026-09-20', '2026-09-20', '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('3', '2026-0003', '1', 'Biocultural Diversity and Indigenous Health Practices in Rural Communities', 'Graduate', 'Full Board', 'Draft', '2026-09-22', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('4', '2026-0004', '1', 'Psychological Resilience in Post-Pandemic Blended Learning Environments', 'Undergraduate', 'Undetermined', 'Type of Review', '2026-09-18', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('5', '2026-0005', '1', 'Assessing Telehealth Privacy Protocols in Regional Public Hospitals', 'Externally Funded', 'Full Board', 'Decision Letter Issued', '2026-09-05', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('6', '2026-0006', '1', 'Longitudinal Study on Community Water Fluoridation and Dental Health', 'Faculty', 'Undetermined', 'Protocols Submitted', '2026-08-28', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('7', '2026-0007', '1', 'Pediatric Nutritional Interventions in Urban Coastal Barangays', 'Graduate', 'Undetermined', 'Payment Pending', '2026-09-24', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('8', '2026-0008', '1', 'Impact of AI on Modern Education in Zamboanga', 'Graduate', 'Full Board', 'Ongoing Review', '2026-10-01', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('9', '2026-0009', '1', 'Marine Biodiversity in the Sulu Sea', 'Faculty', 'Expedited', 'Clearance Granted', '2026-09-01', '2026-09-15', '2026-09-18', '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('10', '2026-0010', '1', 'Renewable Energy Adoption in Rural Communities', 'Externally Funded', 'Undetermined', 'Payment Pending', '2026-10-05', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('11', '2026-0011', '1', 'Mental Health among IT Professionals Post-Pandemic', 'Undergraduate', 'Expedited', 'Decision Letter Issued', '2026-09-10', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('12', '2026-0012', '1', 'Evaluating E-Government Services Efficiency', 'Graduate', 'Exempted', 'Clearance Granted', '2026-08-20', '2026-08-25', '2026-08-26', '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('13', '2026-0013', '1', 'Telemedicine Viability in Geographically Isolated Areas', 'Faculty', 'Full Board', 'Consolidation of Evaluation', '2026-09-12', '2026-09-28', NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('14', '2026-0014', '1', 'Comparative Study of Machine Learning Algorithms', 'Undergraduate', 'Undetermined', 'Protocols Submitted', '2026-10-06', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('15', '2026-0015', '1', 'Public Perception of Smart City Initiatives', 'Graduate', 'Undetermined', 'Payment Pending', '2026-10-02', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('16', '2026-0016', '1', 'Dietary Habits and Lifestyle Diseases in Urban Areas', 'Externally Funded', 'Full Board', 'Rejected', '2026-07-15', '2026-08-10', NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('17', '2026-0017', '1', 'Effectiveness of Flipped Classrooms in STEM', 'Faculty', 'Expedited', 'Withdrawn', '2026-08-01', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('18', '2026-0018', '1', 'Data Privacy Challenges in IoT Devices', 'Undergraduate', 'Undetermined', 'Draft', '2026-10-06', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('19', '2026-0019', '1', 'Microplastics in Local Water Sources', 'Faculty', 'Full Board', 'Amendments', '2026-09-02', '2026-09-15', '2026-09-20', '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('20', '2026-0020', '1', 'Socio-economic Impact of E-wallets', 'Graduate', 'Expedited', 'Clearance Granted', '2026-08-14', '2026-08-30', '2026-09-02', '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('21', '2026-0021', '1', 'Gamification in Special Education', 'Undergraduate', 'Undetermined', 'Payment Verified', '2026-10-04', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('22', '2026-0022', '1', 'Effects of Sleep Deprivation on Academic Performance', 'Undergraduate', 'Exempted', 'Clearance Granted', '2026-07-22', '2026-08-01', '2026-08-02', '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('23', '2026-0023', '1', 'Agricultural Supply Chain Optimization', 'Faculty', 'Expedited', 'Decision Letter Issued', '2026-09-18', '2026-10-01', NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('24', '2026-0024', '1', 'Cybersecurity Protocols in Local Banks', 'Externally Funded', 'Full Board', 'Ongoing Review', '2026-09-25', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('25', '2026-0025', '1', 'Urban Farming Feasibility in Zamboanga', 'Graduate', 'Undetermined', 'Type of Review', '2026-10-03', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('26', '2026-0026', '1', 'Social Media Influence on Voter Behavior', 'Graduate', 'Full Board', 'Rejected', '2026-06-11', '2026-07-05', NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('27', '2026-0027', '1', 'Development of a Low-Cost Water Purifier', 'Faculty', 'Expedited', 'Revisions Submitted', '2026-09-14', '2026-09-28', NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('28', '2026-0028', '1', 'Virtual Reality in Medical Training', 'Externally Funded', 'Full Board', 'Consolidation of Evaluation', '2026-08-25', '2026-09-20', NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('29', '2026-0029', '1', 'Ethnomedicinal Plants of the Yakan Tribe', 'Graduate', 'Full Board', 'Ongoing Review', '2026-09-28', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('30', '2026-0030', '1', 'Automated Traffic Violation Detection System', 'Undergraduate', 'Undetermined', 'Payment Pending', '2026-10-05', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('31', '2026-0031', '1', 'Impact of Hybrid Work on Employee Productivity', 'Faculty', 'Exempted', 'Clearance Granted', '2026-08-05', '2026-08-15', '2026-08-15', '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('32', '2026-0032', '1', 'Climate Change Awareness among High School Students', 'Undergraduate', 'Undetermined', 'Protocols Submitted', '2026-10-06', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('33', '2026-0033', '1', 'Blockchain for Land Registry Systems', 'Graduate', 'Full Board', 'Draft', '2026-10-06', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('34', '2026-0034', '1', 'Nutritional Value of Indigenous Fruits', 'Faculty', 'Expedited', 'Withdrawn', '2026-07-10', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('35', '2026-0035', '1', 'AI-Driven Pest Management in Agriculture', 'Externally Funded', 'Full Board', 'Amendments', '2026-08-20', '2026-09-10', '2026-09-25', '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('36', '2026-0036', '1', 'Consumer Perception of Lab-Grown Meat', 'Graduate', 'Expedited', 'Clearance Granted', '2026-07-28', '2026-08-12', '2026-08-14', '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('37', '2026-0037', '1', 'Ergonomics of Online Distance Learning Setups', 'Undergraduate', 'Undetermined', 'Type of Review', '2026-10-01', NULL, NULL, '2026-10-07 12:10:52.517176', '2026-10-07 12:10:52.517176'),
('38', '2026-0038', '1', 'Epidemiological Study on the Effects of Urbanization on Dengue Fever Incidences in Zamboanga City', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('39', '2026-0039', '1', 'Psychological Impacts of Blended Learning on Senior High School Students in Zamboanga Peninsula', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('40', '2026-0040', '1', 'Comparative Analysis of Indigenous Healing Practices vs Modern Medicine in Rural Communities', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('41', '2026-0041', '1', 'Assessing the Efficacy of Local Medicinal Plants in Treating Common Respiratory Infections', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('42', '2026-0042', '1', 'Nutritional Status and Academic Performance of Elementary Students in Public Schools', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('43', '2026-0043', '1', 'Socio-Economic Factors Influencing Maternal Health Outcomes in Island Municipalities', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('44', '2026-0044', '1', 'Impact of Marine Plastic Pollution on Local Fishing Communities'' Livelihoods', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('45', '2026-0045', '1', 'Prevalence of Hypertension among Call Center Agents: A Cross-Sectional Study', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('46', '2026-0046', '1', 'Mental Health Correlates of Excessive Social Media Use among University Students', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('47', '2026-0047', '1', 'The Role of Community-Based Rehabilitation for Stroke Patients in Low-Income Areas', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('48', '2026-0048', '1', 'Knowledge, Attitudes, and Practices Regarding Tuberculosis Prevention in Congested Barangays', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('49', '2026-0049', '1', 'Effectiveness of Telemedicine Consultations for Chronic Disease Management in Rural Areas', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('50', '2026-0050', '1', 'Occupational Hazards and Health Vulnerabilities of Street Sweepers', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('51', '2026-0051', '1', 'Dietary Diversity and Stunting in Children Under Five in Zamboanga del Sur', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('52', '2026-0052', '1', 'Challenges of Nurses in Handling Pediatric Emergency Cases in Public Hospitals', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('53', '2026-0053', '1', 'Evaluation of Solid Waste Management Practices and Their Environmental Health Impacts', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('54', '2026-0054', '1', 'Vaccine Hesitancy among Parents: Factors and Implications for Public Health Programs', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('55', '2026-0055', '1', 'Lived Experiences of Frontline Health Workers During Local Dengue Outbreaks', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('56', '2026-0056', '1', 'Analysis of Water Quality in Selected Deep Wells and Its Correlation to Waterborne Diseases', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('57', '2026-0057', '1', 'Physical Activity Levels and Risk of Type 2 Diabetes in Sedentary Office Workers', 'Faculty', 'Undetermined', 'Payment Pending', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('58', '2026-0058', '1', 'Impact of Noise Pollution on the Cognitive Development of Children in Urban Centers', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('59', '2026-0059', '1', 'The Efficacy of Community-led Interventions in Reducing Teenage Pregnancy Rates', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('60', '2026-0060', '1', 'Perceived Stress and Coping Mechanisms of Medical Interns in Tertiary Hospitals', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('61', '2026-0061', '1', 'Evaluating the Implementation of the Universal Health Care Law at the Local Government Level', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('62', '2026-0062', '1', 'Antibiotic Resistance Patterns in Common Pathogens Isolated from Clinical Samples', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('63', '2026-0063', '1', 'Risk Factors Associated with Early-Onset Alzheimer''s Disease in the Region', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('64', '2026-0064', '1', 'The Influence of Parental Feeding Styles on Childhood Obesity', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('65', '2026-0065', '1', 'Maternal and Child Health Service Utilization among Indigenous Populations', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('66', '2026-0066', '1', 'The Impact of Shift Work on Sleep Quality and Metabolic Syndrome in BPO Employees', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('67', '2026-0067', '1', 'Effectiveness of School-based Mental Health Literacy Programs', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('68', '2026-0068', '1', 'Prevalence of Intestinal Parasitic Infections among School-aged Children', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('69', '2026-0069', '1', 'Indoor Air Quality and Its Association with Asthma Exacerbations in Children', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('70', '2026-0070', '1', 'Knowledge and Practices on Solid Waste Management among Households', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('71', '2026-0071', '1', 'The Role of Pharmacists in Antimicrobial Stewardship in Community Settings', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('72', '2026-0072', '1', 'Burnout and Job Satisfaction among Special Education Teachers', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('73', '2026-0073', '1', 'Epidemiology of Road Traffic Accidents in Major Highways of Zamboanga', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('74', '2026-0074', '1', 'Nutritional Interventions for Anemia among Pregnant Women in Rural Clinics', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('75', '2026-0075', '1', 'The Impact of Access to Safe Drinking Water on the Incidence of Diarrheal Diseases', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('76', '2026-0076', '1', 'Cultural Beliefs and Practices Influencing Healthcare Seeking Behavior in Suba', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('77', '2026-0077', '1', 'Effects of a Structured Physical Activity Program on Elderly Fall Prevention', 'Faculty', 'Undetermined', 'Payment Verified', '2026-10-07', NULL, NULL, '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128');

-- -----------------------------------------------------------------------------
-- Data for table: payments
-- -----------------------------------------------------------------------------
INSERT INTO payments (payment_id, application_id, amount, or_number, proof_of_payment, payment_status, verified_by_admin_id, verification_notes, payment_date, verified_at, created_at) VALUES
('2', '4', '2361.00', 'OR-524422', NULL, 'Verified', '1', 'Verified via Finance Logbook
', '2026-03-28', '2026-10-07 15:16:29.436687', '2026-03-28 18:23:56'),
('5', '15', '3440.00', 'OR-490966', NULL, 'Rejected', '1', '', '2026-09-07', '2026-10-07 15:19:08.942506', '2026-09-07 04:34:25'),
('6', '21', '4901.00', 'OR-274574', NULL, 'Pending', NULL, NULL, '2026-01-14', NULL, '2026-01-14 11:51:54'),
('28', '58', '2224.00', 'OR-147368', NULL, 'Pending', NULL, NULL, '2026-08-21', NULL, '2026-08-21 11:30:56'),
('29', '59', '755.00', 'OR-539687', NULL, 'Pending', NULL, NULL, '2026-09-26', NULL, '2026-09-26 09:39:55'),
('30', '60', '3883.00', 'OR-356098', NULL, 'Pending', NULL, NULL, '2026-06-03', NULL, '2026-06-03 06:58:52'),
('31', '61', '3064.00', 'OR-961175', NULL, 'Pending', NULL, NULL, '2026-06-29', NULL, '2026-06-29 05:38:31'),
('32', '62', '4242.00', 'OR-997443', NULL, 'Pending', NULL, NULL, '2026-03-06', NULL, '2026-03-06 08:00:14'),
('33', '63', '3880.00', 'OR-396782', NULL, 'Pending', NULL, NULL, '2026-08-07', NULL, '2026-08-07 18:59:35'),
('34', '64', '2852.00', 'OR-223066', NULL, 'Pending', NULL, NULL, '2026-06-03', NULL, '2026-06-03 20:29:20'),
('35', '65', '1061.00', 'OR-886039', NULL, 'Pending', NULL, NULL, '2026-02-03', NULL, '2026-02-03 06:40:51'),
('36', '66', '2608.00', 'OR-851348', NULL, 'Pending', NULL, NULL, '2026-04-06', NULL, '2026-04-06 06:56:01'),
('37', '67', '4223.00', 'OR-914109', NULL, 'Pending', NULL, NULL, '2026-06-09', NULL, '2026-06-09 11:44:20'),
('38', '68', '3201.00', 'OR-118162', NULL, 'Pending', NULL, NULL, '2026-09-11', NULL, '2026-09-11 15:15:49'),
('39', '69', '2830.00', 'OR-150311', NULL, 'Pending', NULL, NULL, '2026-09-18', NULL, '2026-09-18 03:57:04'),
('40', '70', '4818.00', 'OR-551411', NULL, 'Pending', NULL, NULL, '2026-05-01', NULL, '2026-05-01 08:38:09'),
('41', '71', '4076.00', 'OR-379714', NULL, 'Pending', NULL, NULL, '2026-08-07', NULL, '2026-08-07 22:17:17'),
('42', '72', '2197.00', 'OR-497764', NULL, 'Pending', NULL, NULL, '2026-03-16', NULL, '2026-03-16 12:52:22'),
('43', '73', '3752.00', 'OR-935223', NULL, 'Pending', NULL, NULL, '2026-09-11', NULL, '2026-09-11 06:54:44'),
('44', '74', '2277.00', 'OR-413534', NULL, 'Pending', NULL, NULL, '2026-02-26', NULL, '2026-02-26 04:58:40'),
('45', '75', '1285.00', 'OR-302753', NULL, 'Pending', NULL, NULL, '2026-09-13', NULL, '2026-09-13 00:11:04'),
('46', '76', '2156.00', 'OR-994747', NULL, 'Pending', NULL, NULL, '2026-07-28', NULL, '2026-07-28 20:38:29'),
('47', '77', '1433.00', 'OR-949030', NULL, 'Pending', NULL, NULL, '2026-01-28', NULL, '2026-01-28 17:01:29');

-- -----------------------------------------------------------------------------
-- Data for table: application_history
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
('15', '4', 'Payment Verification', 'Completed', 'Juan Dela Cruz', '2026-10-07 15:16:29.436687', '2026-09-20 00:00:00'),
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
('175', '37', 'Review Type Assessment', 'Pending', 'Juan Dela Cruz', NULL, '2026-10-04 00:00:00'),
('176', '38', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('177', '38', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('178', '39', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('179', '39', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('180', '40', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('181', '40', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('182', '41', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('183', '41', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('184', '42', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('185', '42', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('186', '43', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('187', '43', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('188', '44', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('189', '44', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('190', '45', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('191', '45', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('192', '46', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('193', '46', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('194', '47', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('195', '47', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('196', '48', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('197', '48', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('198', '49', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('199', '49', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('200', '50', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('201', '50', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('202', '51', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('203', '51', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('204', '52', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('205', '52', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('206', '53', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('207', '53', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('208', '54', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('209', '54', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('210', '55', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('211', '55', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('212', '56', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('213', '56', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('214', '57', 'Initial Submission', 'Completed', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('215', '57', 'Payment Required', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('216', '58', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('217', '58', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('218', '58', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('219', '59', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('220', '59', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('221', '59', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('222', '60', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('223', '60', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('224', '60', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('225', '61', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('226', '61', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('227', '61', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('228', '62', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('229', '62', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('230', '62', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('231', '63', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('232', '63', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('233', '63', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('234', '64', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('235', '64', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('236', '64', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('237', '65', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('238', '65', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('239', '65', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('240', '66', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('241', '66', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('242', '66', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('243', '67', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('244', '67', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('245', '67', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('246', '68', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('247', '68', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('248', '68', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('249', '69', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('250', '69', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('251', '69', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('252', '70', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('253', '70', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('254', '70', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('255', '71', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('256', '71', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('257', '71', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('258', '72', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('259', '72', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('260', '72', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('261', '73', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('262', '73', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('263', '73', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('264', '74', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('265', '74', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('266', '74', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('267', '75', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('268', '75', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('269', '75', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('270', '76', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('271', '76', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('272', '76', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128'),
('273', '77', 'Initial Submission', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('274', '77', 'Payment Required', 'Completed', 'Dr. Maria Clara', '2026-10-07 14:42:25.04128', '2026-10-07 14:42:25.04128'),
('275', '77', 'Payment Verification', 'Pending', 'Dr. Maria Clara', NULL, '2026-10-07 14:42:25.04128');

