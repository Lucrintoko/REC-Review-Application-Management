// Institutional units shared by applicant forms and admin analytics.
export const ACADEMIC_COLLEGES = [
  {
    code: "CSITE",
    name: "Science, Info Tech & Engineering",
    fullName: "College of Science, Information, Technology, and Engineering",
    accentColor: "#003366",
    icon: "bi-cpu-fill",
    keywords: ["science", "information technology", "engineering", "csite"],
  },
  {
    code: "CON",
    name: "College of Nursing",
    fullName: "College of Nursing",
    accentColor: "#198754",
    icon: "bi-heart-pulse-fill",
    keywords: ["nursing", "con"],
  },
  {
    code: "SEd",
    name: "School of Education",
    fullName: "School of Education",
    accentColor: "#fd7e14",
    icon: "bi-mortarboard-fill",
    keywords: ["education", "sed"],
  },
  {
    code: "SLA",
    name: "School of Liberal Arts",
    fullName: "School of Liberal Arts",
    accentColor: "#0d6efd",
    icon: "bi-book-fill",
    keywords: ["liberal arts", "sla"],
  },
  {
    code: "SMA",
    name: "Management & Accountancy",
    fullName: "School of Management and Accountancy",
    accentColor: "#b8860b",
    icon: "bi-briefcase-fill",
    keywords: ["management", "accountancy", "sma", "business"],
  },
  {
    code: "GS",
    name: "Graduate School",
    fullName: "Graduate School",
    accentColor: "#6f42c1",
    icon: "bi-award-fill",
    keywords: ["graduate school", "graduate studies", "grad school"],
  },
  {
    code: "SOM",
    name: "School of Medicine",
    fullName: "School of Medicine",
    accentColor: "#dc3545",
    icon: "bi-hospital-fill",
    keywords: ["medicine", "som", "medical"],
  },
  {
    code: "Law",
    name: "College of Law",
    fullName: "Rosendo U. Castillo Jr. College of Law",
    accentColor: "#495057",
    icon: "bi-shield-shaded",
    keywords: ["law", "castillo", "legal"],
  },
];

export const EXTERNAL_ENTITY_DEF = {
  code: "EXT",
  name: "External Entities & Partners",
  fullName: "External Entities & Partner Institutions (ZCMC, DOH, WMSU, etc.)",
  accentColor: "#087990",
  icon: "bi-globe2",
  isExternal: true,
  isOpenEnded: true,
  keywords: [
    "external",
    "partner",
    "zcmc",
    "zamboanga city medical center",
    "doh",
    "department of health",
    "wmsu",
    "brent",
    "hospital",
    "chd ix",
    "clinic",
    "ngo",
    "pharma",
    "sponsored",
  ],
};

export const ALL_INSTITUTIONAL_UNITS = [...ACADEMIC_COLLEGES, EXTERNAL_ENTITY_DEF];

export const INSTITUTION_OPTIONS = ALL_INSTITUTIONAL_UNITS.map((unit) => ({
  value: unit.fullName,
  label: unit.isOpenEnded ? "Other / External Entity" : unit.fullName,
  isOpenEnded: unit.isOpenEnded,
}));
