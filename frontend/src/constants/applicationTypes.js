// Supported application types / statuses for sidebar filtering
export const APPLICATION_TYPES = [
  {
    id: "Drafts",
    label: "Drafts",
    aliases: ["Draft", "Drafts"],
  },
  {
    id: "Ongoing Verification",
    label: "Ongoing Verification",
    aliases: ["Ongoing Verification", "Payment Pending", "Payment Verified", "Submitted"],
  },
  {
    id: "Under Review",
    label: "Under Review",
    aliases: ["Under Review"],
  },
  {
    id: "Needs Revisions",
    label: "Needs Revisions",
    aliases: ["Needs Revisions", "Revisions Required", "Revisions Submitted"],
  },
  {
    id: "Needs Progress Report",
    label: "Needs Progress Report",
    aliases: ["Needs Progress Report"],
  },
  {
    id: "Awaiting Approval",
    label: "Awaiting Approval",
    aliases: ["Awaiting Approval"],
  },
  {
    id: "Certification Finished",
    label: "Certification Finished",
    aliases: ["Certification Finished", "Clearance Granted"],
  },
];

// Fallback seed data in case database/backend is offline or empty during development
export const FALLBACK_APPLICATIONS = [
  {
    application_id: 1,
    protocol_code: "REC-2026-001",
    applicant_id: 1,
    research_title: "Ethical Implications of AI-Assisted Clinical Diagnostics in Zamboanga City Health Centers",
    research_type: "Undergraduate",
    review_type: "Expedited",
    status: "Under Review",
    submission_date: "2026-09-15",
  },
  {
    application_id: 2,
    protocol_code: "REC-2026-002",
    applicant_id: 1,
    research_title: "Prevalence of Digital Burnout Among Healthcare Workers in Western Mindanao",
    research_type: "Faculty",
    review_type: "Exempted",
    status: "Clearance Granted",
    submission_date: "2026-09-10",
  },
  {
    application_id: 3,
    protocol_code: "REC-2026-003",
    applicant_id: 1,
    research_title: "Biocultural Diversity and Indigenous Health Practices in Rural Communities",
    research_type: "Graduate",
    review_type: "Full Board",
    status: "Draft",
    submission_date: "2026-09-22",
  },
  {
    application_id: 4,
    protocol_code: "REC-2026-004",
    applicant_id: 1,
    research_title: "Psychological Resilience in Post-Pandemic Blended Learning Environments",
    research_type: "Undergraduate",
    review_type: "Expedited",
    status: "Ongoing Verification",
    submission_date: "2026-09-18",
  },
  {
    application_id: 5,
    protocol_code: "REC-2026-005",
    applicant_id: 1,
    research_title: "Assessing Telehealth Privacy Protocols in Regional Public Hospitals",
    research_type: "Externally Funded",
    review_type: "Full Board",
    status: "Needs Revisions",
    submission_date: "2026-09-05",
  },
  {
    application_id: 6,
    protocol_code: "REC-2026-006",
    applicant_id: 1,
    research_title: "Longitudinal Study on Community Water Fluoridation and Dental Health",
    research_type: "Faculty",
    review_type: "Expedited",
    status: "Needs Progress Report",
    submission_date: "2026-08-28",
  },
  {
    application_id: 7,
    protocol_code: "REC-2026-007",
    applicant_id: 1,
    research_title: "Pediatric Nutritional Interventions in Urban Coastal Barangays",
    research_type: "Graduate",
    review_type: "Expedited",
    status: "Awaiting Approval",
    submission_date: "2026-09-24",
  },
  {
    application_id: 8,
    protocol_code: "REC-2026-008",
    applicant_id: 1,
    research_title: "Epidemiological Surveillance of Vector-Borne Diseases Using Mobile GIS",
    research_type: "Faculty",
    review_type: "Full Board",
    status: "Certification Finished",
    submission_date: "2026-08-12",
  },
];

// Table column definitions
export const APPLICATION_COLUMNS = [
  { key: "research_title", label: "Application Title", width: "45%" },
  { key: "protocol_code", label: "Protocol No.", width: "20%" },
  { key: "submission_date", label: "Date Submitted", width: "18%" },
  { key: "status", label: "Status", width: "17%" },
];
