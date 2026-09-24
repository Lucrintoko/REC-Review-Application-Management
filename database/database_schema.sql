-- =============================================================================
-- Database Schema: Research Ethics Review Application and Management System
-- Course: Web Systems and Technologies (WEBSYSTECH - B)
-- Institution: Ateneo de Zamboanga University (AdZU) - CS Department
-- Target DBMS: MariaDB (XAMPP Environment)
-- Level: 3rd-Year BSIT Normalized Relational Schema (3NF)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `rec_review_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `rec_review_db`;

-- -----------------------------------------------------------------------------
-- 1. Table: APPLICANTS
-- Represents student, faculty, or external researchers submitting protocols.
-- Implements role-based authentication credentials and institutional affiliation.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `applicants` (
    `applicant_id` INT AUTO_INCREMENT PRIMARY KEY,
    `first_name` VARCHAR(50) NOT NULL,
    `last_name` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `contact_number` VARCHAR(20) NOT NULL,
    `affiliation_type` ENUM('Internal', 'External') NOT NULL DEFAULT 'Internal',
    `department_agency` VARCHAR(150) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_applicant_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Table: ADMINS
-- Represents ERB staff, Ethics Committee Chair, and multidisciplinary Reviewers.
-- Allows granular role-based access for workflow hand-offs and review types.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admins` (
    `admin_id` INT AUTO_INCREMENT PRIMARY KEY,
    `first_name` VARCHAR(50) NOT NULL,
    `last_name` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('Staff', 'Ethics Chair', 'Reviewer') NOT NULL DEFAULT 'Staff',
    `specialization` VARCHAR(100) NULL COMMENT 'Field of expertise for review matching',
    `contact_number` VARCHAR(20) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_admin_email` (`email`),
    INDEX `idx_admin_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Table: RESEARCH_APPLICATIONS
-- Core entity tracking protocol lifecycle, review classifications, and statuses.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `research_applications` (
    `application_id` INT AUTO_INCREMENT PRIMARY KEY,
    `protocol_code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique tracking code e.g. REC-2026-001',
    `applicant_id` INT NOT NULL,
    `research_title` VARCHAR(255) NOT NULL,
    `research_type` ENUM('Undergraduate', 'Graduate', 'Faculty', 'Externally Funded') NOT NULL DEFAULT 'Undergraduate',
    `review_type` ENUM('Undetermined', 'Exempted', 'Expedited', 'Full Board') NOT NULL DEFAULT 'Undetermined',
    `status` ENUM(
        'Draft',
        'Submitted',
        'Payment Pending',
        'Payment Verified',
        'Under Review',
        'Revisions Required',
        'Revisions Submitted',
        'Clearance Granted',
        'Rejected',
        'Withdrawn'
    ) NOT NULL DEFAULT 'Submitted',
    `submission_date` DATE NOT NULL,
    `decision_date` DATE NULL,
    `clearance_date` DATE NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_application_applicant`
        FOREIGN KEY (`applicant_id`) REFERENCES `applicants` (`applicant_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    INDEX `idx_app_status` (`status`),
    INDEX `idx_app_review_type` (`review_type`),
    INDEX `idx_app_submission_date` (`submission_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Table: PAYMENTS
-- Financial gateway prerequisite module before protocol reaches evaluation.
-- Verified by ERB Admin Staff to prevent revenue loss.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
    `payment_id` INT AUTO_INCREMENT PRIMARY KEY,
    `application_id` INT NOT NULL UNIQUE COMMENT '1-to-1 relationship with research application',
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `payment_method` ENUM('AdZU Finance Office', 'Bank Transfer', 'GCash', 'Cashier Receipt') NOT NULL,
    `or_number` VARCHAR(50) NULL COMMENT 'Official Receipt / Reference Number from AdZU Finance',
    `proof_of_payment` VARCHAR(255) NOT NULL COMMENT 'Relative file path to uploaded scanned receipt',
    `payment_status` ENUM('Pending', 'Verified', 'Rejected') NOT NULL DEFAULT 'Pending',
    `verified_by_admin_id` INT NULL,
    `verification_notes` TEXT NULL,
    `payment_date` DATE NOT NULL,
    `verified_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_payment_application`
        FOREIGN KEY (`application_id`) REFERENCES `research_applications` (`application_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT `fk_payment_admin`
        FOREIGN KEY (`verified_by_admin_id`) REFERENCES `admins` (`admin_id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    INDEX `idx_payment_status` (`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Table: RESEARCH_DOCUMENTS
-- E-Archiving and repository indexing all soft-copy protocols, forms, and letters.
-- Supports versioning for protocol revisions based on reviewer recommendations.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `research_documents` (
    `document_id` INT AUTO_INCREMENT PRIMARY KEY,
    `application_id` INT NOT NULL,
    `document_type` ENUM(
        'Research Protocol',
        'Informed Consent Form',
        'Data Collection Instrument',
        'Curriculum Vitae',
        'Endorsement Letter',
        'Revised Protocol',
        'Letter of Decision',
        'Clearance Certificate',
        'Other'
    ) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `file_size_kb` INT UNSIGNED NULL,
    `version_number` INT NOT NULL DEFAULT 1,
    `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_document_application`
        FOREIGN KEY (`application_id`) REFERENCES `research_applications` (`application_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    INDEX `idx_doc_application_type` (`application_id`, `document_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Table: PROTOCOL_REVIEWS
-- Bridges multi-reviewer assignments per the core flowchart:
-- - Exempted: 1 review by Ethics Chair
-- - Expedited: 3 reviewers (2 Primary, 1 Non-Primary)
-- - Full Board: All REC board members
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `protocol_reviews` (
    `review_id` INT AUTO_INCREMENT PRIMARY KEY,
    `application_id` INT NOT NULL,
    `reviewer_id` INT NOT NULL,
    `reviewer_role` ENUM(
        'Ethics Chair',
        'Primary Reviewer',
        'Non-Primary Reviewer',
        'REC Board Member'
    ) NOT NULL,
    `review_status` ENUM('Assigned', 'In Progress', 'Completed') NOT NULL DEFAULT 'Assigned',
    `recommendation` ENUM(
        'Approved',
        'Minor Revisions',
        'Major Revisions',
        'Disapproved'
    ) NULL,
    `comments` TEXT NULL,
    `assigned_date` DATE NOT NULL DEFAULT (CURRENT_DATE),
    `completed_date` DATE NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_review_application`
        FOREIGN KEY (`application_id`) REFERENCES `research_applications` (`application_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT `fk_review_admin`
        FOREIGN KEY (`reviewer_id`) REFERENCES `admins` (`admin_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    UNIQUE KEY `unique_app_reviewer` (`application_id`, `reviewer_id`),
    INDEX `idx_review_status` (`review_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Table: NOTIFICATIONS
-- Automated alerts and email distribution logs for status changes,
-- missing requirements, revision requests, and clearance notices.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
    `notification_id` INT AUTO_INCREMENT PRIMARY KEY,
    `application_id` INT NOT NULL,
    `recipient_type` ENUM('Applicant', 'Admin') NOT NULL,
    `recipient_id` INT NOT NULL COMMENT 'References applicant_id or admin_id',
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `notification_type` ENUM(
        'Status Update',
        'Payment Verification',
        'Review Assignment',
        'Revision Request',
        'Decision Issued',
        'Clearance Granted',
        'System Alert'
    ) NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `email_sent` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_notification_application`
        FOREIGN KEY (`application_id`) REFERENCES `research_applications` (`application_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    INDEX `idx_recipient` (`recipient_type`, `recipient_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
