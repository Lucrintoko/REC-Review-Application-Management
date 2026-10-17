// Supported application types / statuses for sidebar filtering
export const APPLICATION_TYPES = [
  {
    id: "Drafts",
    label: "Drafts",
    aliases: ["Draft", "Drafts"],
  },
  {
    id: "Payment Pending",
    label: "Payment Pending",
    aliases: ["Payment Pending", "Payment Required"],
  },
  {
    id: "Ongoing Verification",
    label: "Ongoing Verification",
    aliases: [
      "Ongoing Verification",
      "Payment Verified",
      "Submitted",
      "Protocols Submitted",
      "Payment Verification",
      "Type of Review",
      "Determining Review Type",
      "Review Type Assessment"
    ],
  },
  {
    id: "Under Review",
    label: "Under Review",
    aliases: ["Under Review", "Ongoing Review"],
  },
  {
    id: "Needs Revisions",
    label: "Needs Revisions",
    aliases: [
      "Needs Revisions",
      "Revisions Required",
      "Revisions Submitted",
      "Decision Letter Issued",
      "Protocol Revision Required",
      "Revision Required"
    ],
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

// Table column definitions
export const APPLICATION_COLUMNS = [
  { key: "research_title", label: "Application Title", width: "45%" },
  { key: "protocol_code", label: "Protocol No.", width: "20%" },
  { key: "submission_date", label: "Date Submitted", width: "15%" },
  { key: "status", label: "Status", width: "10%" },
  { key: "actions", label: "Actions", width: "10%" },
];
