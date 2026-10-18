-- =============================================================================
-- Migration: Stage 5 Consolidated Evaluations Table
-- Target DBMS: PostgreSQL 14+
-- =============================================================================

DO $$ BEGIN
    -- Status of the consolidation synthesis workflow
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consolidation_status_enum') THEN 
        CREATE TYPE consolidation_status_enum AS ENUM ('Draft', 'Finalized'); 
    END IF;

    -- Level of consensus among reviewers per question
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consensus_type_enum') THEN 
        CREATE TYPE consensus_type_enum AS ENUM ('unanimous', 'split', 'flagged'); 
    END IF;

    -- Evaluator finding category
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finding_status_enum') THEN 
        CREATE TYPE finding_status_enum AS ENUM ('Satisfactory', 'Requires Modification', 'Unable to Assess', 'Not Applicable'); 
    END IF;

    -- Add Consolidation of Review to process_point_enum if not present
    BEGIN
        ALTER TYPE process_point_enum ADD VALUE IF NOT EXISTS 'Consolidation of Review';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END;
END $$;

CREATE TABLE IF NOT EXISTS consolidated_evaluations (
    consolidation_id SERIAL PRIMARY KEY,
    application_id INT NOT NULL,
    chair_id INT NOT NULL,
    cycle_number INT NOT NULL DEFAULT 1,
    status consolidation_status_enum NOT NULL DEFAULT 'Draft',
    consolidated_recommendation recommendation_enum NOT NULL DEFAULT 'Minor Revisions',
    
    -- Synthesis narrative & directives
    summary_notes TEXT NULL,
    directives_for_revisions TEXT NULL,
    meeting_date DATE NULL, -- REC Board meeting date (applicable for Full Board reviews)
    
    -- Rich JSONB Schemas
    per_question_findings JSONB NOT NULL DEFAULT '{}'::jsonb,
    actionable_directives JSONB NOT NULL DEFAULT '[]'::jsonb,
    compliance_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
    reviewer_snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Offline PDF Export Path
    pdf_report_path VARCHAR(255) NULL,

    -- Timestamps & Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP WITH TIME ZONE NULL,

    -- Constraints
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

-- B-Tree Performance Indexes
CREATE INDEX IF NOT EXISTS idx_consolidation_app_id ON consolidated_evaluations(application_id);
CREATE INDEX IF NOT EXISTS idx_consolidation_status ON consolidated_evaluations(status);
CREATE INDEX IF NOT EXISTS idx_consolidation_chair_id ON consolidated_evaluations(chair_id);

-- GIN Indexes for High-Performance Deep JSONB Querying & Filtering
CREATE INDEX IF NOT EXISTS idx_consolidation_findings_gin ON consolidated_evaluations USING gin (per_question_findings);
CREATE INDEX IF NOT EXISTS idx_consolidation_directives_gin ON consolidated_evaluations USING gin (actionable_directives);

-- Trigger to maintain updated_at automatically
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
