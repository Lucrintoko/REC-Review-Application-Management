-- =============================================================================
-- Database Schema: Research Ethics Review Application and Management System
-- Course: Web Systems and Technologies (WEBSYSTECH - B)
-- Institution: Ateneo de Zamboanga University (AdZU) - CS Department
-- Target DBMS: PostgreSQL (Supabase / Local PostgreSQL 14+)
-- Level: 3rd-Year BSIT Normalized Relational Schema (3NF)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUM TYPES DEFINITIONS
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'affiliation_enum') THEN 
        CREATE TYPE affiliation_enum AS ENUM ('Internal', 'External'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role_enum') THEN 
        CREATE TYPE admin_role_enum AS ENUM ('Secretariat', 'Ethics Chair', 'Primary Reviewer', 'Non-Primary Reviewer'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'research_type_enum') THEN 
        CREATE TYPE research_type_enum AS ENUM ('Undergraduate', 'Graduate', 'Faculty', 'Externally Funded'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_type_enum') THEN 
        CREATE TYPE review_type_enum AS ENUM ('Undetermined', 'Exempted', 'Expedited', 'Full Board'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_enum') THEN 
        CREATE TYPE status_enum AS ENUM ('Draft', 'Protocols Submitted', 'Payment Pending', 'Payment Verified', 'Type of Review', 'Ongoing Review', 'Consolidation of Evaluation', 'Decision Letter Issued', 'Revisions Submitted', 'Clearance Granted', 'Rejected', 'Withdrawn', 'Amendments'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN 
        CREATE TYPE payment_status_enum AS ENUM ('Pending', 'Verified', 'Rejected'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type_enum') THEN 
        CREATE TYPE document_type_enum AS ENUM ('Research Protocol', 'Informed Consent Form', 'Data Collection Instrument', 'Curriculum Vitae', 'Endorsement Letter', 'Revised Protocol', 'Letter of Decision', 'Clearance Certificate', 'Other'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reviewer_role_enum') THEN 
        CREATE TYPE reviewer_role_enum AS ENUM ('Ethics Chair', 'Primary Reviewer', 'Non-Primary Reviewer', 'REC Board Member'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status_enum') THEN 
        CREATE TYPE review_status_enum AS ENUM ('In Progress', 'Completed'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_enum') THEN 
        CREATE TYPE recommendation_enum AS ENUM ('Approved', 'Minor Revisions', 'Major Revisions', 'Disapproved'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recipient_type_enum') THEN 
        CREATE TYPE recipient_type_enum AS ENUM ('Applicant', 'Admin'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum') THEN 
        CREATE TYPE notification_type_enum AS ENUM ('Status Update', 'Payment Verification', 'Review Assignment', 'Revision Request', 'Decision Issued', 'Clearance Granted', 'System Alert'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'process_point_enum') THEN 
        CREATE TYPE process_point_enum AS ENUM ('Initial Submission', 'Payment Required', 'Payment Verification', 'Review Type Assessment', 'Ethical Review', 'Decision Issued', 'Proponent Revisions', 'Revisions Verification', 'Clearance Granted', 'Application Rejected', 'Application Withdrawn', 'Protocol Revision', 'Consolidation of Review'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'history_status_enum') THEN 
        CREATE TYPE history_status_enum AS ENUM ('Pending', 'Completed'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consolidation_status_enum') THEN 
        CREATE TYPE consolidation_status_enum AS ENUM ('Draft', 'Finalized'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consensus_type_enum') THEN 
        CREATE TYPE consensus_type_enum AS ENUM ('unanimous', 'split', 'flagged'); 
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finding_status_enum') THEN 
        CREATE TYPE finding_status_enum AS ENUM ('Satisfactory', 'Requires Modification', 'Unable to Assess', 'Not Applicable'); 
    END IF;
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
    form_data JSONB NULL,
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
    form_data JSONB NULL,
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
    notes TEXT NULL,
    attempt_no INT NOT NULL DEFAULT 1,
    is_rejected BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_history_application
        FOREIGN KEY (application_id) REFERENCES research_applications (application_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_history_app ON application_history(application_id);
CREATE INDEX IF NOT EXISTS idx_history_process ON application_history(process_point);

-- -----------------------------------------------------------------------------
-- 9. Table: CONSOLIDATED_EVALUATIONS (Stage 5 Review Synthesis)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consolidated_evaluations (
    consolidation_id SERIAL PRIMARY KEY,
    application_id INT NOT NULL,
    chair_id INT NOT NULL,
    cycle_number INT NOT NULL DEFAULT 1,
    status consolidation_status_enum NOT NULL DEFAULT 'Draft',
    consolidated_recommendation recommendation_enum NOT NULL DEFAULT 'Minor Revisions',
    summary_notes TEXT NULL,
    directives_for_revisions TEXT NULL,
    meeting_date DATE NULL,
    per_question_findings JSONB NOT NULL DEFAULT '{}'::jsonb,
    actionable_directives JSONB NOT NULL DEFAULT '[]'::jsonb,
    compliance_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
    reviewer_snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
    pdf_report_path VARCHAR(255) NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_consolidation_application
        FOREIGN KEY (application_id) REFERENCES research_applications (application_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_consolidation_chair
        FOREIGN KEY (chair_id) REFERENCES admins (admin_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT uq_application_cycle
        UNIQUE (application_id, cycle_number)
);
CREATE INDEX IF NOT EXISTS idx_consolidation_app_id ON consolidated_evaluations(application_id);
CREATE INDEX IF NOT EXISTS idx_consolidation_chair_id ON consolidated_evaluations(chair_id);
CREATE INDEX IF NOT EXISTS idx_consolidation_status ON consolidated_evaluations(status);
CREATE INDEX IF NOT EXISTS idx_consolidation_findings_gin ON consolidated_evaluations USING gin (per_question_findings);
CREATE INDEX IF NOT EXISTS idx_consolidation_directives_gin ON consolidated_evaluations USING gin (actionable_directives);

-- -----------------------------------------------------------------------------
-- TRIGGERS & FUNCTIONS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_consolidated_evaluations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_consolidated_evaluations_timestamp ON consolidated_evaluations;
CREATE TRIGGER trg_update_consolidated_evaluations_timestamp
BEFORE UPDATE ON consolidated_evaluations
FOR EACH ROW
EXECUTE FUNCTION update_consolidated_evaluations_timestamp();

-- =============================================================================
-- ESSENTIAL BASELINE SYSTEM SEED DATA (AUTHENTICATION & PORTAL ROLES)
-- Note: Contains only default portal accounts with zero dummy research protocols.
-- Default password for all seed accounts: password123
-- =============================================================================

-- Default Applicant Account
INSERT INTO applicants (applicant_id, first_name, last_name, email, password_hash, contact_number, affiliation_type, department_agency)
VALUES (
    1, 
    'Applicant', 
    'User', 
    'applicant@adzu.edu.ph', 
    '$2y$10$1JNot88/wP3eShDbh32YLOn5agLgCqsI6J23IJqBiXvTCM9eYeuXG', 
    '09171234567', 
    'Internal', 
    'College of Science and Information Technology'
)
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    password_hash = EXCLUDED.password_hash;

SELECT setval(pg_get_serial_sequence('applicants', 'applicant_id'), COALESCE(MAX(applicant_id), 1)) FROM applicants;

-- Default Committee Admin Accounts
INSERT INTO admins (admin_id, first_name, last_name, email, password_hash, role, specialization, contact_number)
VALUES 
    (1, 'Admin', 'Secretariat', 'secretariat@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', 'Secretariat', NULL, NULL),
    (2, 'Ethics', 'Chair', 'chair@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', 'Ethics Chair', 'Bioethics & Clinical Research', '09175550102'),
    (3, 'Primary', 'Reviewer', 'primary@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', 'Primary Reviewer', 'Health Sciences & Methodology', '09175550103'),
    (4, 'Non-Primary', 'Reviewer', 'nonprimary@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', 'Non-Primary Reviewer', 'Social Sciences & Informed Consent', '09175550104'),
    (5, 'Maria', 'Santos', 'primary2@adzu.edu.ph', '$2y$10$vUBQpHqA4LH4uAe1fzbBy.tEoWGzJUrbH6pmllwM0TfBz1j.8g6HS', 'Primary Reviewer', 'Public Health and Community Medicine', '09175550105')
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

SELECT setval(pg_get_serial_sequence('admins', 'admin_id'), COALESCE(MAX(admin_id), 1)) FROM admins;

-- =============================================================================
-- END OF SCHEMA DEFINITION
-- =============================================================================