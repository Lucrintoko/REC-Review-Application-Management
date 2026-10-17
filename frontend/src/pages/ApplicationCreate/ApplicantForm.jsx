/**
 * Proposed backend integration contract. The POST /api/applications handler
 * is not implemented in backend/api/index.php; only GET is currently supported.
 *
 * A future create/draft endpoint must persist the required research_applications
 * fields, including applicant_id from the authenticated session. The schema
 * accepts status "Draft" and review_type "Undetermined". Uploaded File objects
 * cannot be sent in this JSON request; document uploads need multipart/form-data
 * and separate research_documents records.
 *
 * Proposed success response:
 * {
 *   "status": "success",
 *   "message": "Draft saved successfully",
 *   "application_id": 101,
 *   "protocol_code": "REC-2026-0001"
 * }
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import adzuSeal from "../../assets/AdZU Seal.png";
import { apiClient } from "../../services/api";
import DashboardFooter from "../../components/applicant/DashboardFooter";

// =============================================================================
// REUSABLE SUB-COMPONENTS
// =============================================================================

import InfoTooltip from "../ApplicationCreate/components/InfoTooltip.jsx";
import FileUploadWidget from "../ApplicationCreate/components/FileUploadWidget.jsx";
import SectionCard from "../ApplicationCreate/components/SectionCard.jsx";
import RadioCardGroup from "../ApplicationCreate/components/RadioCardGroup.jsx";
import ResearcherManager from "../ApplicationCreate/components/ResearcherManager.jsx";

// =============================================================================
// STATIC CONFIGURATIONS & DEFINITIONS
// =============================================================================

export const DRAFT_STORAGE_KEY = "adzu_rec_application_draft_v1";

export const FORM_SECTIONS = [
  { id: "general-information", number: 1, title: "General Information", shortTitle: "General Information", required: true, icon: "bi-card-list" },
  { id: "brief-description", number: 2, title: "Brief Description of the Study", shortTitle: "Study Description", required: true, icon: "bi-file-earmark-text" },
  { id: "checklist-documents", number: 3, title: "Checklist of Documents", shortTitle: "Checklist of Documents", required: true, icon: "bi-paperclip" },
];

export const STUDY_TYPES = [
  "Clinical Trial (sponsored)",
  "Clinical Trial (researcher-initiated)",
  "Health Operations Research (Health Program and Policies)",
  "Social / Behavioral Research",
  "Biomedical Research (Retrospective, Prospective, and Diagnostic Studies)",
  "Stem Cell Research",
  "Genetic Research",
  "Other (please specify)",
];

export const SITE_CLASSIFICATIONS = [
  "Multicenter (International)",
  "Multicenter (National)",
  "Single Site",
];

export const FUNDING_SOURCES = [
  "Self-funded",
  "Government-funded",
  "Scholarship/Research Grant",
  "Institutional-funded",
  "Pharmaceutical Company Sponsored (please specify)",
  "Other (please specify)",
];

export const INITIAL_FORM_DATA = {
  // 1. Research Compliance Questions
  compliance_technical_reviewed: "",
  compliance_technical_body: "",
  compliance_technical_file: null,
  compliance_technical_files: [],
  compliance_other_erc: "",
  compliance_other_erc_name: "",
  compliance_other_erc_status: "",
  compliance_other_erc_code: "",

  // 2. Full Study Title
  study_title: "",
  rec_code: "REC-2026-0001",
  study_site: "",
  study_site_custom: "",

  // 3. Primary Researchers
  primary_researchers: [
    {
      id: "pr-1",
      firstName: "",
      lastName: "",
      email: "",
      contactNumber: "",
      department: "",
      role: "",
    },
  ],

  // 4. Co-researchers
  co_researchers: [],

  // 5. Institution
  institution_name: "",
  institution_department: "",
  institution_address: "",

  // 6. Contact Information
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  contact_alternate: "",

  // 7. Brief Description of the Study
  description_study: "",

  // 8. Type of Study
  study_type: "",
  study_type_other: "",

  // 9. Site Classification
  site_classification: "",

  // 10. Source of Funding
  funding_source: "",
  funding_pharmaceutical_specify: "",
  funding_other_specify: "",
  funding_agency_name: "",
  funding_amount: "",

  // 11. Study Duration
  duration_start_date: "",
  duration_end_date: "",
  duration_participants_count: "",
  duration_target_population: "",

  // 12. Basic Requirements
  requirements: {
    letterOfRequest: { checked: false, file: null, files: [], name: "Letter/Request for Review" },
    endorsementLetter: { checked: false, file: null, files: [], name: "Endorsement/Referral Letter" },
    fullProtocol: { checked: false, file: null, files: [], name: "Full Proposal/Study Protocol" },
    technicalApproval: { checked: false, file: null, files: [], name: "Technical Review Approval" },
    cvResearchers: { checked: false, file: null, files: [], name: "Curriculum Vitae of Researcher/s" },
    informedConsent: {
      checked: false,
      file: null,
      files: [],
      name: "Informed Consent Form",
      languages: { english: false, filipino: false, other: false, otherSpecify: "" },
    },
    assentForm: {
      checked: false,
      notApplicable: false,
      file: null,
      files: [],
      name: "Assent Form",
      languages: { english: false, filipino: false, other: false, otherSpecify: "" },
    },
  },

  // 13. Supplementary Documents
  supplementary: {
    questionnaire: { checked: false, file: null, files: [], name: "Questionnaire" },
    dataCollectionForms: { checked: false, file: null, files: [], name: "Data Collection Forms" },
    productBrochure: { checked: false, file: null, files: [], name: "Product Brochure" },
    fdaAuthorization: { checked: false, file: null, files: [], name: "Philippine FDA Marketing Authorization or Import License" },
    specialPermits: { checked: false, specify: "", file: null, files: [], name: "Permit/s for special populations" },
    otherSupplementary: { checked: false, specify: "", file: null, files: [], name: "Other Supplementary Documents" },
  },

  // 14. Declaration and Signature
  declaration_agreed: false,
  declaration_signature_name: "",
  declaration_date: new Date().toISOString().split("T")[0],
  declaration_designation: "",
};

// =============================================================================
// UNIFIED VALIDATION LOGIC (Single Source of Truth)
// =============================================================================

function evaluateFormStatusAndErrors(formData) {
  const errors = {};
  const status = {};

  // Section 1: Study Title
  if (!formData.study_title.trim()) {
    errors.study_title = "Full Study Title is required.";
  } else if (formData.study_title.trim().length < 5) {
    errors.study_title = "Study Title must be at least 5 characters.";
  }
  if (!formData.study_site.trim()) {
    errors.study_site = "Study Site is required.";
  }
  status["section-2"] = formData.study_title.trim().length >= 5 && formData.study_site.trim().length > 0;

  // Section 2: Primary Researchers
  if (!formData.primary_researchers || formData.primary_researchers.length === 0) {
    errors.primary_researchers = "At least one Primary Researcher is required.";
  } else {
    formData.primary_researchers.forEach((r, idx) => {
      if (!r.firstName.trim() || !r.lastName.trim()) {
        errors[`researcher_${idx}_name`] = "Primary researcher first and last name required.";
      }
      if (!r.email.trim() || !r.email.includes("@")) {
        errors[`researcher_${idx}_email`] = "Valid email is required.";
      }
    });
  }
  status["section-3"] =
    formData.primary_researchers.length > 0 &&
    formData.primary_researchers.every((r) => r.firstName.trim() && r.lastName.trim() && r.email.trim());

  // Section 3: Co-researchers (optional)
  status["section-4"] = true;

  // Section 4: Institution
  if (!formData.institution_name.trim()) {
    errors.institution_name = "Institution name is required.";
  }
  if (!formData.institution_address.trim()) {
    errors.institution_address = "Institution address is required.";
  }
  status["section-5"] = formData.institution_name.trim().length > 0 && formData.institution_address.trim().length > 0;

  // Section 5: Contact Info
  if (!formData.contact_name.trim()) {
    errors.contact_name = "Primary contact name is required.";
  }
  if (!formData.contact_email.trim() || !formData.contact_email.includes("@")) {
    errors.contact_email = "Valid contact email is required.";
  }
  if (!formData.contact_phone.trim()) {
    errors.contact_phone = "Contact number is required.";
  }
  status["section-6"] =
    formData.contact_name.trim().length > 0 &&
    formData.contact_email.trim().length > 0 &&
    formData.contact_phone.trim().length > 0;

  // Section 6: Description
  if (!formData.description_study.trim() || formData.description_study.trim().length < 20) {
    errors.description_study = "A brief description of the study must be at least 20 characters.";
  }
  status["section-7"] = formData.description_study.trim().length >= 20;

  // Section 7: Type of Study
  if (!formData.study_type) {
    errors.study_type = "Please select a study type.";
  }
  if (formData.study_type === "Other (please specify)" && !formData.study_type_other.trim()) {
    errors.study_type_other = "Please specify the other type of study.";
  }
  status["section-8"] =
    Boolean(formData.study_type) &&
    (formData.study_type !== "Other (please specify)" || formData.study_type_other.trim().length > 0);

  // Section 8: Site Classification
  if (!formData.site_classification) {
    errors.site_classification = "Site classification selection is required.";
  }
  status["section-9"] = Boolean(formData.site_classification);

  // Section 9: Funding Source
  if (!formData.funding_source) {
    errors.funding_source = "Source of funding is required.";
  }
  if (formData.funding_source === "Pharmaceutical Company Sponsored (please specify)" && !formData.funding_pharmaceutical_specify.trim()) {
    errors.funding_pharmaceutical_specify = "Please specify sponsor name.";
  }
  if (formData.funding_source === "Other (please specify)" && !formData.funding_other_specify.trim()) {
    errors.funding_other_specify = "Please specify other funding source.";
  }
  status["section-10"] =
    Boolean(formData.funding_source) &&
    (formData.funding_source !== "Pharmaceutical Company Sponsored (please specify)" || formData.funding_pharmaceutical_specify.trim().length > 0) &&
    (formData.funding_source !== "Other (please specify)" || formData.funding_other_specify.trim().length > 0);

  // Section 10: Duration
  if (!formData.duration_start_date) {
    errors.duration_start_date = "Proposed start date is required.";
  }
  if (!formData.duration_end_date) {
    errors.duration_end_date = "Proposed end date is required.";
  }
  if (formData.duration_start_date && formData.duration_end_date && formData.duration_end_date < formData.duration_start_date) {
    errors.duration_end_date = "End date cannot be prior to start date.";
  }
  status["section-11"] =
    Boolean(formData.duration_start_date) &&
    Boolean(formData.duration_end_date) &&
    formData.duration_end_date >= formData.duration_start_date;

  // Section 11: Reviewed by Technical Review Committee and Other ERC
  if (!formData.compliance_technical_reviewed) {
    errors.compliance_technical_reviewed = "Please indicate if protocol underwent technical review.";
  }
  if (
    formData.compliance_technical_reviewed === "Yes" &&
    !formData.compliance_technical_file &&
    !formData.requirements.technicalApproval.file
  ) {
    errors.compliance_technical_file = "Technical Review approval attachment is required when 'Yes' is chosen.";
  }
  if (!formData.compliance_other_erc) {
    errors.compliance_other_erc = "Please indicate if submitted to another ERC.";
  }
  if (formData.compliance_other_erc === "Yes" && !formData.compliance_other_erc_name.trim()) {
    errors.compliance_other_erc_name = "Please provide the name of the previous ERC.";
  }
  const hasDoc = (item) => Boolean(item && (item.file || (Array.isArray(item.files) && item.files.length > 0)));
  const hasComplianceDoc = Boolean(formData.compliance_technical_file || (Array.isArray(formData.compliance_technical_files) && formData.compliance_technical_files.length > 0));

  status["section-1"] =
    Boolean(formData.compliance_technical_reviewed) &&
    (formData.compliance_technical_reviewed === "No" ||
      hasComplianceDoc ||
      hasDoc(formData.requirements.technicalApproval)) &&
    Boolean(formData.compliance_other_erc) &&
    (formData.compliance_other_erc === "No" || formData.compliance_other_erc_name.trim().length > 0);

  // Section 12: Basic Requirements
  const req = formData.requirements;
  if (!hasDoc(req.letterOfRequest)) errors.letterOfRequest = "Letter / Request for Review document is required.";
  if (!hasDoc(req.endorsementLetter)) errors.endorsementLetter = "Endorsement / Referral Letter is required.";
  if (!hasDoc(req.fullProtocol)) errors.fullProtocol = "Full Proposal / Study Protocol document is required.";
  if (!hasDoc(req.technicalApproval) && !hasComplianceDoc) {
    errors.technicalApproval = "Technical Review Approval attachment is required.";
  }
  if (!hasDoc(req.cvResearchers)) errors.cvResearchers = "Curriculum Vitae of Researcher/s is required.";
  if (!hasDoc(req.informedConsent)) errors.informedConsent = "Informed Consent Form document is required.";

  const icfLang = req.informedConsent.languages;
  if (!icfLang.english && !icfLang.filipino && !icfLang.other) {
    errors.informedConsentLanguages = "Please select at least one language for Informed Consent.";
  }

  if (!req.assentForm.notApplicable) {
    if (!hasDoc(req.assentForm)) errors.assentForm = "Assent Form document is required (or check Not Applicable).";
    const assentLang = req.assentForm.languages;
    if (!assentLang.english && !assentLang.filipino && !assentLang.other) {
      errors.assentFormLanguages = "Please select at least one language for Assent Form.";
    }
  }
  status["section-12"] =
    hasDoc(req.letterOfRequest) &&
    hasDoc(req.endorsementLetter) &&
    hasDoc(req.fullProtocol) &&
    (hasDoc(req.technicalApproval) || hasComplianceDoc) &&
    hasDoc(req.cvResearchers) &&
    hasDoc(req.informedConsent) &&
    (icfLang.english || icfLang.filipino || icfLang.other) &&
    (req.assentForm.notApplicable ||
      (hasDoc(req.assentForm) && (req.assentForm.languages.english || req.assentForm.languages.filipino || req.assentForm.languages.other)));

  // Section 13: Supplementary (optional)
  status["section-13"] = true;

  // Section 14: Declaration
  if (!formData.declaration_agreed) {
    errors.declaration_agreed = "You must agree to the ethical declarations to submit.";
  }
  if (!formData.declaration_signature_name.trim()) {
    errors.declaration_signature_name = "Signatory full name is required.";
  }
  status["section-14"] = formData.declaration_agreed && formData.declaration_signature_name.trim().length > 0;

  status["general-information"] = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11].every((section) => status[`section-${section}`]);
  status["brief-description"] = status["section-7"];
  status["checklist-documents"] = status["section-12"] && status["section-13"] && status["section-14"];

  // Determine first section with error for auto-scroll
  let firstErrorSectionId = null;
  if (errors.compliance_technical_reviewed || errors.compliance_technical_file || errors.compliance_other_erc || errors.compliance_other_erc_name) {
    firstErrorSectionId = "general-information";
  } else if (errors.study_title || errors.study_site) {
    firstErrorSectionId = "general-information";
  } else if (errors.primary_researchers || Object.keys(errors).some((k) => k.startsWith("researcher_"))) {
    firstErrorSectionId = "general-information";
  } else if (errors.institution_name || errors.institution_address) {
    firstErrorSectionId = "general-information";
  } else if (errors.contact_name || errors.contact_email || errors.contact_phone) {
    firstErrorSectionId = "general-information";
  } else if (errors.description_study) {
    firstErrorSectionId = "brief-description";
  } else if (errors.study_type || errors.study_type_other) {
    firstErrorSectionId = "general-information";
  } else if (errors.site_classification) {
    firstErrorSectionId = "general-information";
  } else if (errors.funding_source || errors.funding_pharmaceutical_specify || errors.funding_other_specify) {
    firstErrorSectionId = "general-information";
  } else if (errors.duration_start_date || errors.duration_end_date || errors.duration_participants_count) {
    firstErrorSectionId = "general-information";
  } else if (
    errors.letterOfRequest ||
    errors.endorsementLetter ||
    errors.fullProtocol ||
    errors.technicalApproval ||
    errors.cvResearchers ||
    errors.informedConsent ||
    errors.informedConsentLanguages ||
    errors.assentForm ||
    errors.assentFormLanguages
  ) {
    firstErrorSectionId = "checklist-documents";
  } else if (errors.declaration_agreed || errors.declaration_signature_name) {
    firstErrorSectionId = "checklist-documents";
  }

  return {
    errors,
    sectionStatus: status,
    firstErrorSectionId,
    isValid: Object.keys(errors).length === 0,
  };
}

// =============================================================================
// MAIN APPLICANT FORM COMPONENT
// =============================================================================

function ApplicantForm({ onBack }) {
  const navigate = useNavigate();
  const brandHeaderRef = useRef(null);

  // Primary State
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.data) {
          const merged = { ...INITIAL_FORM_DATA, ...parsed.data };
          // Validate the merged data to ensure no deeply nested keys are missing from older drafts
          evaluateFormStatusAndErrors(merged); 
          return merged;
        }
      }
    } catch (e) {
      console.warn("Saved draft is outdated or corrupted. Discarding to prevent errors.", e);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
    return INITIAL_FORM_DATA;
  });

  const [activeSectionId, setActiveSectionId] = useState("general-information");
  const [toastMessage, setToastMessage] = useState(null);
  const [hasDraftNotice, setHasDraftNotice] = useState(() => Boolean(localStorage.getItem(DRAFT_STORAGE_KEY)));
  const [validationErrors, setValidationErrors] = useState({});
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [stickyHeaderOffset, setStickyHeaderOffset] = useState(0);
  const isProgrammaticScroll = useRef(false);
  const scrollSpyLockTimeoutRef = useRef(null);

  const [lastSavedTime, setLastSavedTime] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.savedAt ? new Date(parsed.savedAt).toLocaleTimeString() : null;
      }
    } catch {
      return null;
    }
    return null;
  });

  // Unified status & validation computation
  const { sectionStatus } = useMemo(() => evaluateFormStatusAndErrors(formData), [formData]);

  const progressPercent = useMemo(() => {
    const requiredSections = FORM_SECTIONS.filter((s) => s.required);
    const completedRequired = requiredSections.filter((s) => sectionStatus[s.id]).length;
    return Math.round((completedRequired / requiredSections.length) * 100);
  }, [sectionStatus]);

  // Keep the sidebar aligned with the last main section crossed while scrolling.
  useEffect(() => {
    const updateActiveSection = () => {
      if (isProgrammaticScroll.current) return;

      const sectionOffset = 120;
      const crossedSections = FORM_SECTIONS.filter((section) => {
        const element = document.getElementById(section.id);
        return element && element.getBoundingClientRect().top <= sectionOffset;
      });

      setActiveSectionId(crossedSections.at(-1)?.id || FORM_SECTIONS[0].id);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  useEffect(() => {
    const header = brandHeaderRef.current;
    if (!header) return;

    const updateHeaderOffset = () => setStickyHeaderOffset(header.offsetHeight);
    updateHeaderOffset();

    const observer = new ResizeObserver(updateHeaderOffset);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  // Generic Field Updater Callback
  const updateField = useCallback((field, value) => {
    setFormData((prev) => {
      if (field === "compliance_technical_file") {
        const fileList = value ? (Array.isArray(value) ? value : [value]) : [];
        return {
          ...prev,
          compliance_technical_file: fileList.length > 0 ? fileList[0] : null,
          compliance_technical_files: fileList,
        };
      }
      return { ...prev, [field]: value };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Toast Helper
  const showToast = useCallback((message, type = "success") => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4500);
  }, []);

  // Save Draft to LocalStorage
  const handleSaveDraft = useCallback(
    (isAuto = false) => {
      try {
        const now = new Date();
        const payload = { data: formData, savedAt: now.toISOString() };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
        setHasUnsavedChanges(false);
        const formattedTime = now.toLocaleTimeString();
        setLastSavedTime(formattedTime);

        if (!isAuto) {
          showToast(`Draft successfully saved at ${formattedTime}! You can safely close or resume later.`, "success");
        }
      } catch (e) {
        console.error("Draft save failed:", e);
        if (!isAuto) showToast("Error saving draft to local storage.", "danger");
      }
    },
    [formData, showToast]
  );

  // Clear Draft
  const handleClearDraft = useCallback(() => {
    if (window.confirm("Are you sure you want to clear your current draft and reset all fields?")) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setFormData(INITIAL_FORM_DATA);
      setHasUnsavedChanges(false);
      setValidationErrors({});
      setHasDraftNotice(false);
      setLastSavedTime(null);
      showToast("Draft cleared. Fresh form ready.", "info");
    }
  }, [showToast]);

  // Smooth Scroll Helper
  const scrollToSection = useCallback((sectionId) => {
    setActiveSectionId(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      isProgrammaticScroll.current = true;
      if (scrollSpyLockTimeoutRef.current) {
        clearTimeout(scrollSpyLockTimeoutRef.current);
      }
      window.scrollTo({ top: y, behavior: "smooth" });
      scrollSpyLockTimeoutRef.current = setTimeout(() => {
        isProgrammaticScroll.current = false;
        scrollSpyLockTimeoutRef.current = null;
      }, Math.min(1200, Math.max(400, Math.abs(window.pageYOffset - y) * 0.5)));
    }
  }, []);

  // Dynamic Researcher Handlers
  const addResearcher = useCallback((isPrimary) => {
    const key = isPrimary ? "primary_researchers" : "co_researchers";
    const newEntry = isPrimary
      ? {
          id: `pr-${Date.now()}`,
          firstName: "",
          lastName: "",
          email: "",
          contactNumber: "",
          department: "",
          role: "",
        }
      : {
          id: `cr-${Date.now()}`,
          firstName: "",
          lastName: "",
          email: "",
          affiliation: "",
          role: "",
        };
    setFormData((prev) => ({ ...prev, [key]: [...prev[key], newEntry] }));
    setHasUnsavedChanges(true);
  }, []);

  const removeResearcher = useCallback((isPrimary, id) => {
    const key = isPrimary ? "primary_researchers" : "co_researchers";
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].filter((item, idx) => (item.id ? item.id !== id : idx !== id)),
    }));
    setHasUnsavedChanges(true);
  }, []);

  const updateResearcher = useCallback((isPrimary, id, field, val) => {
    const key = isPrimary ? "primary_researchers" : "co_researchers";
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].map((item, idx) =>
        (item.id ? item.id === id : idx === id) ? { ...item, [field]: val } : item
      ),
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Requirement & Supplementary Updaters
  const updateRequirement = useCallback((key, updates) => {
    setFormData((prev) => {
      const prevReq = prev.requirements[key] || {};
      let updatedFiles = prevReq.files || [];
      let updatedFile = prevReq.file || null;

      if (updates.files !== undefined) {
        updatedFiles = Array.isArray(updates.files) ? updates.files : (updates.files ? [updates.files] : []);
        updatedFile = updatedFiles[0] || null;
      } else if (updates.file !== undefined) {
        if (Array.isArray(updates.file)) {
          updatedFiles = updates.file;
          updatedFile = updatedFiles[0] || null;
        } else if (updates.file) {
          updatedFiles = [updates.file];
          updatedFile = updates.file;
        } else {
          updatedFiles = [];
          updatedFile = null;
        }
      }

      return {
        ...prev,
        requirements: {
          ...prev.requirements,
          [key]: {
            ...prevReq,
            ...updates,
            files: updatedFiles,
            file: updatedFile,
            checked: updates.checked !== undefined ? updates.checked : (updatedFiles.length > 0 || prevReq.checked),
          },
        },
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  const updateSupplementary = useCallback((key, updates) => {
    setFormData((prev) => {
      const prevSupp = prev.supplementary[key] || {};
      let updatedFiles = prevSupp.files || [];
      let updatedFile = prevSupp.file || null;

      if (updates.files !== undefined) {
        updatedFiles = Array.isArray(updates.files) ? updates.files : (updates.files ? [updates.files] : []);
        updatedFile = updatedFiles[0] || null;
      } else if (updates.file !== undefined) {
        if (Array.isArray(updates.file)) {
          updatedFiles = updates.file;
          updatedFile = updatedFiles[0] || null;
        } else if (updates.file) {
          updatedFiles = [updates.file];
          updatedFile = updates.file;
        } else {
          updatedFiles = [];
          updatedFile = null;
        }
      }

      return {
        ...prev,
        supplementary: {
          ...prev.supplementary,
          [key]: {
            ...prevSupp,
            ...updates,
            files: updatedFiles,
            file: updatedFile,
            checked: updates.checked !== undefined ? updates.checked : (updatedFiles.length > 0 || Boolean(updates.specify)),
          },
        },
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Pre-Submit Validation Trigger
  const handlePreSubmit = (e) => {
    e.preventDefault();
    const { isValid, errors, firstErrorSectionId } = evaluateFormStatusAndErrors(formData);
    setValidationErrors(errors);

    if (!isValid) {
      showToast(`Please complete all required fields. Found ${Object.keys(errors).length} missing item(s).`, "danger");
      if (firstErrorSectionId) {
        scrollToSection(firstErrorSectionId);
      }
      return;
    }

    setShowSubmitConfirmModal(true);
  };

  const handleSaveDraftAndContinue = async () => {
    setIsSavingDraft(true);
    const generatedCode = formData.rec_code || `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();

    // Deep clone formData to avoid mutating state
    const cleanFormData = JSON.parse(JSON.stringify(formData, (key, value) => {
      // JSON.stringify drops the File object automatically anyway,
      // but we strip rawFile to be perfectly clean in the JSON.
      if (key === 'rawFile') return undefined;
      return value;
    }));

    const submissionPayload = {
      protocol_code: generatedCode,
      research_title: formData.study_title,
      research_type: "Undergraduate",
      review_type: "Undetermined",
      status: "Payment Pending",
      submission_date: formData.declaration_date || new Date().toISOString().split("T")[0],
      formDataSnapshot: cleanFormData,
    };

    let savedLocally = false;
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ data: cleanFormData, savedAt: now.toISOString() })
      );
      savedLocally = true;
      setLastSavedTime(now.toLocaleTimeString());
      setHasUnsavedChanges(false);

      // Create FormData payload
      const multipartData = new FormData();
      multipartData.append("payload", JSON.stringify(submissionPayload));

      // Extract all raw files and append to FormData
      let fileCount = 0;
      const appendFiles = (obj, path = "") => {
        if (!obj || typeof obj !== "object") return;

        if (Array.isArray(obj)) {
          obj.forEach((item, idx) => {
            appendFiles(item, `${path}[${idx}]`);
          });
          return;
        }

        // If this object has a 'files' array with files, prioritize uploading from 'files'
        // and skip redundant single 'file' property to prevent duplicate uploads.
        if (Array.isArray(obj.files) && obj.files.length > 0) {
          obj.files.forEach((f, idx) => {
            appendFiles(f, `${path}[files][${idx}]`);
          });
          for (const key in obj) {
            if (key !== 'file' && key !== 'files') {
              appendFiles(obj[key], path ? `${path}[${key}]` : `[${key}]`);
            }
          }
          return;
        }

        if (obj.rawFile && obj.rawFile instanceof File) {
          multipartData.append(`files${path}`, obj.rawFile);
          fileCount++;
        } else {
          for (const key in obj) {
            appendFiles(obj[key], path ? `${path}[${key}]` : `[${key}]`);
          }
        }
      };
      appendFiles(formData);

      const response = await apiClient.post("/applications", multipartData, true); // true = isFormData

      if (response?.status !== "success") {
        throw new Error(response?.message || "The server did not save the draft.");
      }
      setShowSubmitConfirmModal(false);
      showToast("Application submitted successfully.", "success");

      // Clear draft since it was submitted
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      
      // Redirect to dashboard after a short delay so user sees the success toast
      setTimeout(() => {
        navigate('/applicant/dashboard');
      }, 1500);
    } catch (err) {
      console.error("Draft save failed:", err);
      showToast(
        savedLocally
          ? "Draft saved in this browser, but could not be synced with the server."
          : "Draft could not be saved. Your form data is still available on this page.",
        "warning"
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleNavigateHome = () => {
    if (onBack) onBack();
    else navigate("/");
  };

  // =========================================================================
  // VIEW: Main Form Layout
  // =========================================================================
  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      {/* ---------------- Top Brand Header (Official REC Form 013) ---------------- */}
      <header ref={brandHeaderRef} className="brand-header shadow-sm py-2 px-3 px-md-4 sticky-top" style={{ zIndex: 1030 }}>
        <div className="container-fluid d-flex justify-content-between align-items-center flex-wrap gap-2">
          {/* Left Brand and Title */}
          <div className="d-flex align-items-center gap-3">
            <img src={adzuSeal} alt="AdZU Seal" style={{ height: "42px", width: "auto" }} />
            <div>
              <div className="d-flex align-items-center gap-2">
                <h5 className="applicant-header-title mb-0 fw-bold text-white">Application for Ethics Review of a New Protocol</h5>
                <span className="badge bg-warning text-dark d-none d-sm-inline-block">REC Form No. 013</span>
              </div>
              <small className="text-light opacity-75 d-none d-sm-block">
                Version No. ___, Date of Effectivity: October 1, 2022
              </small>
            </div>
          </div>

          {/* Right Header Action Buttons */}
          <div className="applicant-header-actions d-flex align-items-center gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-sm btn-light text-primary d-flex align-items-center gap-1"
              onClick={handleNavigateHome}
              title="Return to Dashboard"
              aria-label="Return to Dashboard"
            >
              <i className="bi bi-arrow-left"></i>
              <span className="d-none d-sm-inline">Dashboard</span>
            </button>

            <div className="applicant-header-secondary-actions d-flex gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-sm btn-outline-light d-flex align-items-center gap-1"
                onClick={() => handleSaveDraft(false)}
                title="Save progress to local storage"
                aria-label="Save Draft"
              >
                <i className="bi bi-floppy"></i>
                <span className="d-none d-sm-inline">Save Draft</span>
              </button>

              <button
                type="button"
                className="btn btn-sm btn-success fw-semibold d-flex align-items-center gap-1"
                onClick={handlePreSubmit}
                aria-label="Submit Application"
              >
                <i className="bi bi-send-check"></i>
                <span className="d-sm-none">Submit</span>
                <span className="d-none d-sm-inline">Submit Application</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="container-fluid mt-2 pt-1 border-top border-primary-subtle">
          <div className="d-flex justify-content-between align-items-center small text-light mb-1">
            <span className="d-none d-sm-inline">
              Application Progress: <strong>{progressPercent}%</strong> Completed
            </span>
            <span className="d-sm-none">
              Progress: <strong>{progressPercent}%</strong>
            </span>
            <span className="d-none d-sm-inline">
              {lastSavedTime ? (
                <span className="fst-italic opacity-75">
                  <i className="bi bi-cloud-check me-1"></i>Last saved at {lastSavedTime}
                </span>
              ) : (
                <span className="opacity-75">Not saved yet</span>
              )}
            </span>
          </div>
          <div className="progress" style={{ height: "6px" }}>
            <div
              className={`progress-bar progress-bar-striped progress-bar-animated ${
                progressPercent === 100 ? "bg-success" : "bg-warning"
              }`}
              role="progressbar"
              style={{ width: `${progressPercent}%` }}
              aria-valuenow={progressPercent}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>
        </div>
      </header>

      {/* ---------------- Toast Notification Banner ---------------- */}
      {toastMessage && (
        <div
          className={`alert alert-${toastMessage.type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg`}
          style={{ zIndex: 1090, maxWidth: "600px", width: "90%" }}
          role="alert"
        >
          <i
            className={`bi ${
              toastMessage.type === "success"
                ? "bi-check-circle-fill"
                : toastMessage.type === "danger"
                ? "bi-exclamation-triangle-fill"
                : "bi-info-circle-fill"
            } me-2`}
          ></i>
          <span>{toastMessage.message}</span>
          <button
            type="button"
            className="btn-close"
            onClick={() => setToastMessage(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* ---------------- Main Body Layout ---------------- */}
      <main className="container-fluid px-lg-5 my-4 flex-grow-1">
        {/* Draft Notice Banner */}
        {hasDraftNotice && (
          <div className="alert alert-info alert-dismissible fade show mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2 shadow-sm">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-clock-history fs-4 text-primary"></i>
              <div>
                <strong>Existing Draft Loaded</strong>
                <div className="small text-secondary">
                  You are editing a saved draft. Changes are kept in local storage until submitted.
                </div>
              </div>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={handleClearDraft}
              >
                <i className="bi bi-trash me-1"></i> Clear Draft & Start Fresh
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setHasDraftNotice(false)}
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        )}

        {/* Validation Errors Global Banner */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="alert alert-danger alert-dismissible fade show mb-4 shadow-sm" role="alert">
            <h6 className="fw-bold mb-2 d-flex align-items-center">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Please resolve the following required fields before submitting:
            </h6>
            <ul className="mb-1 ps-3 small">
              {Object.values(validationErrors).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="row g-4">
          {/* ============================================================= */}
          {/* SIDEBAR NAVIGATION (Desktop) & DROPDOWN (Mobile)             */}
          {/* ============================================================= */}
          <aside
            className="application-form-sidebar col-12 col-lg-3 col-xl-3"
            style={{ top: `${stickyHeaderOffset + 24}px` }}
          >
            {/* Mobile Dropdown Nav */}
            <div className="card shadow-sm border-0 d-lg-none mb-3">
              <div className="card-body p-3">
                <label className="form-label fw-bold small text-secondary mb-1">
                  <i className="bi bi-compass me-1"></i> Jump to Form Section:
                </label>
                <select
                  className="form-select form-select-sm"
                  value={activeSectionId}
                  onChange={(e) => scrollToSection(e.target.value)}
                >
                  {FORM_SECTIONS.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.number}. {sec.title} {sectionStatus[sec.id] ? "✓" : sec.required ? "*" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sticky Desktop Sidebar */}
            <div
              className="card shadow-sm border-0 d-none d-lg-block sticky-top rounded-3"
              style={{ top: "115px", maxHeight: "calc(100vh - 140px)", overflowY: "auto" }}
            >
              <div className="card-header bg-white py-3 border-bottom">
                <h6 className="fw-bold mb-0 text-theme-primary d-flex align-items-center justify-content-between">
                  <span>
                    <i className="bi bi-list-task me-2"></i>Form Sections
                  </span>
                  <span className="badge bg-primary-subtle text-primary">
                    {FORM_SECTIONS.filter((s) => sectionStatus[s.id]).length}/{FORM_SECTIONS.length}
                  </span>
                </h6>
                <small className="text-muted">Click any section to scroll directly</small>
              </div>

              <div className="list-group list-group-flush small">
                {FORM_SECTIONS.map((sec) => {
                  const isActive = activeSectionId === sec.id;
                  const isDone = sectionStatus[sec.id];

                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between py-2 px-3 border-start border-2 ${
                        isActive
                          ? "border-primary bg-primary-subtle text-primary fw-bold"
                          : "border-transparent text-secondary"
                      }`}
                    >
                      <div className="d-flex align-items-center gap-2 text-truncate pe-1">
                        <i className={`bi ${sec.icon} ${isActive ? "text-primary" : "text-muted"}`}></i>
                        <span className="text-truncate">
                          {sec.number}. {sec.shortTitle}
                        </span>
                      </div>

                      <div>
                        {isDone ? (
                          <i className="bi bi-check-circle-fill text-success" title="Completed"></i>
                        ) : sec.required ? (
                          <span className="badge bg-danger-subtle text-danger rounded-pill" title="Required">
                            *
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted" title="Optional">
                            opt
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="card-footer bg-light p-3 border-top text-center">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm w-100 mb-2"
                  onClick={() => handleSaveDraft(false)}
                >
                  <i className="bi bi-floppy me-1"></i> Save Draft
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm w-100 fw-bold"
                  onClick={handlePreSubmit}
                >
                  <i className="bi bi-send-check me-1"></i> Submit Application
                </button>
              </div>
            </div>
          </aside>

          {/* ============================================================= */}
          {/* MAIN FORM SECTIONS CONTENT AREA                               */}
          {/* ============================================================= */}
          <section className="col-12 col-lg-9 col-xl-9">
            <form onSubmit={handlePreSubmit} noValidate>
              <div id="general-information" className="form-main-section" style={{ display: "flex", flexDirection: "column" }}>
                <div className="mb-3">
                  <h2 className="h4 fw-bold text-primary mb-1">General Information</h2>
                  <p className="text-muted mb-0">Provide the study, researcher, institution, funding, and participant details.</p>
                </div>

              <div style={{ order: 10 }}>
                {/* SECTION 1: Research Compliance Questions */}
                <SectionCard
                  id="section-1"
                  number={10}
                  title="Research Review Questions"
                  isRequired={true}
                  isComplete={sectionStatus["section-1"]}
                  icon="bi-shield-check"
                >
                <div className="alert alert-info d-flex align-items-start gap-2 mb-4">
                  <i className="bi bi-info-circle-fill fs-5"></i>
                  <div>
                    Review questions verify whether your study protocol has passed institutional technical review
                    and whether it is currently active under any other ethics review committee.
                  </div>
                </div>

                {/* Technical Review Question */}
                <div className="mb-4 pb-3 border-bottom">
                  <label className="form-label fw-semibold d-block">
                    Has the review / research protocol undergone technical review? <span className="text-danger">*</span>
                    <InfoTooltip
                      title="Technical Review"
                      text="A technical review certifies scientific merit, methodology rigor, and departmental feasibility before ethics review."
                    />
                  </label>

                  <div className="d-flex gap-4 mb-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="compliance_technical_reviewed"
                        id="techReviewYes"
                        value="Yes"
                        checked={formData.compliance_technical_reviewed === "Yes"}
                        onChange={(e) => updateField("compliance_technical_reviewed", e.target.value)}
                      />
                      <label className="form-check-label" htmlFor="techReviewYes">
                        Yes (Attachment required)
                      </label>
                    </div>

                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="compliance_technical_reviewed"
                        id="techReviewNo"
                        value="No"
                        checked={formData.compliance_technical_reviewed === "No"}
                        onChange={(e) => updateField("compliance_technical_reviewed", e.target.value)}
                      />
                      <label className="form-check-label" htmlFor="techReviewNo">
                        No
                      </label>
                    </div>
                  </div>
                  {validationErrors.compliance_technical_reviewed && (
                    <div className="text-danger small">{validationErrors.compliance_technical_reviewed}</div>
                  )}

                  {formData.compliance_technical_reviewed === "Yes" && (
                    <div className="p-3 bg-light rounded-3 mt-3 border">
                      <div className="mb-3">
                        <label className="form-label small fw-semibold">
                          Technical Review Body / Department Committee:
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. CS Department Research Panel, School of Medicine Tech Panel"
                          value={formData.compliance_technical_body}
                          onChange={(e) => updateField("compliance_technical_body", e.target.value)}
                        />
                      </div>

                      <FileUploadWidget
                        label="Technical Review Approval"
                        isRequired={true}
                        file={formData.compliance_technical_file}
                        files={formData.compliance_technical_files}
                        error={validationErrors.compliance_technical_file}
                        onFileSelect={(f) => updateField("compliance_technical_file", f)}
                        onFileRemove={() => updateField("compliance_technical_file", null)}
                      />
                    </div>
                  )}

                  {formData.compliance_technical_reviewed === "No" && (
                    <div className="small text-muted mt-2 fst-italic">
                      <i className="bi bi-exclamation-circle me-1"></i>
                      Note: For certain academic programs, ethics review clearance will be contingent upon concurrent or subsequent technical approval.
                    </div>
                  )}
                </div>

                {/* Another ERC Question */}
                <div>
                  <label className="form-label fw-semibold d-block">
                    Has the research been submitted to another Research Ethics Committee (REC)? <span className="text-danger">*</span>
                    <InfoTooltip
                      title="Prior ERC Submission"
                      text="Disclose if this research was previously evaluated or is concurrently undergoing review at another hospital, university, or national board."
                    />
                  </label>

                  <div className="d-flex gap-4 mb-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="compliance_other_erc"
                        id="otherErcYes"
                        value="Yes"
                        checked={formData.compliance_other_erc === "Yes"}
                        onChange={(e) => updateField("compliance_other_erc", e.target.value)}
                      />
                      <label className="form-check-label" htmlFor="otherErcYes">
                        Yes
                      </label>
                    </div>

                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="compliance_other_erc"
                        id="otherErcNo"
                        value="No"
                        checked={formData.compliance_other_erc === "No"}
                        onChange={(e) => updateField("compliance_other_erc", e.target.value)}
                      />
                      <label className="form-check-label" htmlFor="otherErcNo">
                        No
                      </label>
                    </div>
                  </div>
                  {validationErrors.compliance_other_erc && (
                    <div className="text-danger small">{validationErrors.compliance_other_erc}</div>
                  )}

                  {formData.compliance_other_erc === "Yes" && (
                    <div className="row g-3 mt-2 p-3 bg-light rounded-3 border">
                      <div className="col-12 col-md-6 mt-0">
                        <label className="form-label small fw-semibold">
                          Name of Other ERC / IRB: <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. ZCMC Ethics Research Board"
                          value={formData.compliance_other_erc_name}
                          onChange={(e) => updateField("compliance_other_erc_name", e.target.value)}
                        />
                        {validationErrors.compliance_other_erc_name && (
                          <div className="text-danger small">{validationErrors.compliance_other_erc_name}</div>
                        )}
                      </div>

                      <div className="col-12 col-md-6 mt-0">
                        <label className="form-label small fw-semibold">Status / Decision of Other ERC:</label>
                        <select
                          className="form-select form-select-sm"
                          value={formData.compliance_other_erc_status}
                          onChange={(e) => updateField("compliance_other_erc_status", e.target.value)}
                        >
                          <option value="">Select status...</option>
                          <option value="Approved">Approved</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Revisions Requested">Revisions Requested</option>
                          <option value="Disapproved">Disapproved</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                </SectionCard>
              </div>

              {/* SECTION 2: Full Study Title */}
              <SectionCard
                id="section-2"
                number={1}
                title="Title of the Study"
                isRequired={true}
                isComplete={sectionStatus["section-2"]}
                icon="bi-card-heading"
              >
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Title of the Study: <span className="text-danger">*</span>
                    <InfoTooltip
                      title="Study Title"
                      text="Enter the complete formal title of the research as stated in your full protocol document."
                    />
                  </label>
                  <textarea
                    rows="2"
                    className={`form-control ${validationErrors.study_title ? "is-invalid" : ""}`}
                    placeholder="e.g. Ethical Implications of AI-Assisted Clinical Diagnostics in Zamboanga City Health Centers"
                    value={formData.study_title}
                    onChange={(e) => updateField("study_title", e.target.value)}
                  ></textarea>
                  {validationErrors.study_title && (
                    <div className="invalid-feedback">{validationErrors.study_title}</div>
                  )}
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">
                      REC Code:
                      <InfoTooltip
                        title="REC Tracking Code"
                        text="Your unique official tracking code will be automatically assigned to your application once you submit this form."
                      />
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted">
                        <i className="bi bi-upc-scan"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control bg-light fst-italic text-secondary"
                        value="Assigned after submission"
                        readOnly
                      />
                    </div>
                    <small className="text-muted">Assigned protocol code for submission tracking</small>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">
                      Study Site / Location: <span className="text-danger">*</span>
                      <InfoTooltip
                        title="Study Site"
                        text="Specify where participant recruitment, interviews, or experimental interventions will take place."
                      />
                    </label>
                    <input
                      type="text"
                      className={`form-control ${validationErrors.study_site ? "is-invalid" : ""}`}
                      placeholder="e.g. Ateneo de Zamboanga University - Salvador Campus"
                      value={formData.study_site}
                      onChange={(e) => updateField("study_site", e.target.value)}
                    />
                    {validationErrors.study_site && (
                      <div className="invalid-feedback">{validationErrors.study_site}</div>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* SECTION 3: Primary Researchers */}
              <SectionCard
                id="section-3"
                number={2}
                title="Primary Researchers"
                isRequired={true}
                isComplete={sectionStatus["section-3"]}
                icon="bi-people-fill"
              >
                <p className="text-muted small mb-3">
                  Please list the Principal Investigator (PI) and any Co-Principal Investigators. At least one Primary Researcher is required.
                </p>
                <ResearcherManager
                  researchers={formData.primary_researchers}
                  onAdd={() => addResearcher(true)}
                  onRemove={(id) => removeResearcher(true, id)}
                  onUpdate={(id, field, val) => updateResearcher(true, id, field, val)}
                  isPrimary={true}
                  validationErrors={validationErrors}
                />
              </SectionCard>

              {/* SECTION 4: Co-researchers */}
              <SectionCard
                id="section-4"
                number={3}
                title="Co-researchers (if any)"
                isRequired={false}
                isComplete={true}
                icon="bi-person-plus"
              >
                <p className="text-muted small mb-3">
                  Include any student co-investigators, research assistants, or technical collaborators assisting in data collection.
                </p>
                <ResearcherManager
                  researchers={formData.co_researchers}
                  onAdd={() => addResearcher(false)}
                  onRemove={(id) => removeResearcher(false, id)}
                  onUpdate={(id, field, val) => updateResearcher(false, id, field, val)}
                  isPrimary={false}
                />
              </SectionCard>

              {/* SECTION 5: Institution */}
              <SectionCard
                id="section-5"
                number={4}
                title="Institution"
                isRequired={true}
                isComplete={sectionStatus["section-5"]}
                icon="bi-building"
              >
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">
                      Institution Name: <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${validationErrors.institution_name ? "is-invalid" : ""}`}
                      placeholder="e.g. Ateneo de Zamboanga University"
                      value={formData.institution_name}
                      onChange={(e) => updateField("institution_name", e.target.value)}
                    />
                    {validationErrors.institution_name && (
                      <div className="invalid-feedback">{validationErrors.institution_name}</div>
                    )}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">Department / School / Unit:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. College of Science and Information Technology"
                      value={formData.institution_department}
                      onChange={(e) => updateField("institution_department", e.target.value)}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">
                      Institutional Address: <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${validationErrors.institution_address ? "is-invalid" : ""}`}
                      placeholder="e.g. La Purisima St., Zamboanga City, 7000 Philippines"
                      value={formData.institution_address}
                      onChange={(e) => updateField("institution_address", e.target.value)}
                    />
                    {validationErrors.institution_address && (
                      <div className="invalid-feedback">{validationErrors.institution_address}</div>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* SECTION 6: Contact Information */}
              <SectionCard
                id="section-6"
                number={5}
                title="Contact Information"
                isRequired={true}
                isComplete={sectionStatus["section-6"]}
                icon="bi-telephone"
              >
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">
                      Primary Contact Person: <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${validationErrors.contact_name ? "is-invalid" : ""}`}
                      placeholder="Full Name"
                      value={formData.contact_name}
                      onChange={(e) => updateField("contact_name", e.target.value)}
                    />
                    {validationErrors.contact_name && (
                      <div className="invalid-feedback">{validationErrors.contact_name}</div>
                    )}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">
                      Official Email: <span className="text-danger">*</span>
                      <InfoTooltip
                        title="Official Email"
                        text="Decision letters, revision notices, and meeting schedules will be forwarded to this address."
                      />
                    </label>
                    <input
                      type="email"
                      className={`form-control ${validationErrors.contact_email ? "is-invalid" : ""}`}
                      placeholder="name@adzu.edu.ph"
                      value={formData.contact_email}
                      onChange={(e) => updateField("contact_email", e.target.value)}
                    />
                    {validationErrors.contact_email && (
                      <div className="invalid-feedback">{validationErrors.contact_email}</div>
                    )}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">
                      Mobile / Telephone Number: <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${validationErrors.contact_phone ? "is-invalid" : ""}`}
                      placeholder="e.g. 09171234567"
                      value={formData.contact_phone}
                      onChange={(e) => updateField("contact_phone", e.target.value)}
                    />
                    {validationErrors.contact_phone && (
                      <div className="invalid-feedback">{validationErrors.contact_phone}</div>
                    )}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">Alternative Contact / Landline (Optional):</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. (062) 991-0871 local 2200"
                      value={formData.contact_alternate}
                      onChange={(e) => updateField("contact_alternate", e.target.value)}
                    />
                  </div>
                </div>
              </SectionCard>

              {/* SECTION 8: Type of Study */}
              <SectionCard
                id="section-8"
                number={6}
                title="Type of Study"
                isRequired={true}
                isComplete={sectionStatus["section-8"]}
                icon="bi-ui-radios-grid"
              >
                <label className="form-label fw-semibold mb-3">
                  Select the primary classification of the study: <span className="text-danger">*</span>
                  <InfoTooltip
                    title="Study Classification"
                    text="Determines ethics review pathway (Exempted, Expedited, or Full Board Review) based on participant risk."
                  />
                </label>

                <RadioCardGroup
                  options={STUDY_TYPES}
                  value={formData.study_type}
                  onChange={(val) => updateField("study_type", val)}
                  name="study_type"
                />

                {formData.study_type === "Other (please specify)" && (
                  <div className="mt-3 p-3 bg-light rounded-3 border">
                    <label className="form-label small fw-semibold">
                      Please specify study type: <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${validationErrors.study_type_other ? "is-invalid" : ""}`}
                      placeholder="e.g. Educational Intervention Study"
                      value={formData.study_type_other}
                      onChange={(e) => updateField("study_type_other", e.target.value)}
                    />
                    {validationErrors.study_type_other && (
                      <div className="invalid-feedback">{validationErrors.study_type_other}</div>
                    )}
                  </div>
                )}
                {validationErrors.study_type && (
                  <div className="text-danger small mt-2">{validationErrors.study_type}</div>
                )}
              </SectionCard>

              {/* SECTION 9: Site Classification */}
              <SectionCard
                id="section-9"
                number={7}
                title="Site Classification"
                isRequired={true}
                isComplete={sectionStatus["section-9"]}
                icon="bi-geo-alt"
              >
                <label className="form-label fw-semibold mb-3">
                  Select study site classification: <span className="text-danger">*</span>
                  <InfoTooltip
                    title="Site Classification"
                    text="Multicenter trials require ethics clearance or acknowledgment from each participating institution."
                  />
                </label>

                <RadioCardGroup
                  options={SITE_CLASSIFICATIONS}
                  value={formData.site_classification}
                  onChange={(val) => updateField("site_classification", val)}
                  name="site_classification"
                  gridCols="col-12 col-md-4"
                />
                {validationErrors.site_classification && (
                  <div className="text-danger small mt-2">{validationErrors.site_classification}</div>
                )}
              </SectionCard>

              {/* SECTION 10: Source of Funding */}
              <SectionCard
                id="section-10"
                number={8}
                title="Source of Funding"
                isRequired={true}
                isComplete={sectionStatus["section-10"]}
                icon="bi-cash-coin"
              >
                <label className="form-label fw-semibold mb-3">
                  Select primary funding source: <span className="text-danger">*</span>
                  <InfoTooltip
                    title="Funding Disclosure"
                    text="Ethical guidelines require full disclosure of funding sources to assess potential conflict of interest."
                  />
                </label>

                <RadioCardGroup
                  options={FUNDING_SOURCES}
                  value={formData.funding_source}
                  onChange={(val) => updateField("funding_source", val)}
                  name="funding_source"
                />

                {formData.funding_source === "Pharmaceutical Company Sponsored (please specify)" && (
                  <div className="mt-3 p-3 bg-light rounded-3 border">
                    <label className="form-label small fw-semibold">
                      Sponsor / Pharmaceutical Company Name: <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${validationErrors.funding_pharmaceutical_specify ? "is-invalid" : ""}`}
                      placeholder="e.g. Pfizer, Novartis, Unilab"
                      value={formData.funding_pharmaceutical_specify}
                      onChange={(e) => updateField("funding_pharmaceutical_specify", e.target.value)}
                    />
                    {validationErrors.funding_pharmaceutical_specify && (
                      <div className="invalid-feedback">{validationErrors.funding_pharmaceutical_specify}</div>
                    )}
                  </div>
                )}

                {formData.funding_source === "Other (please specify)" && (
                  <div className="mt-3 p-3 bg-light rounded-3 border">
                    <label className="form-label small fw-semibold">
                      Please specify funding source: <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${validationErrors.funding_other_specify ? "is-invalid" : ""}`}
                      placeholder="e.g. NGO grant, international consortium"
                      value={formData.funding_other_specify}
                      onChange={(e) => updateField("funding_other_specify", e.target.value)}
                    />
                    {validationErrors.funding_other_specify && (
                      <div className="invalid-feedback">{validationErrors.funding_other_specify}</div>
                    )}
                  </div>
                )}

                <div className="row g-3 mt-2">
                  <div className="col-12 col-md-8">
                    <label className="form-label small fw-semibold">Grant / Funding Agency Name (Optional):</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. DOST-PCHRD, CHED DARE-TO, AdZU University Research Grant"
                      value={formData.funding_agency_name}
                      onChange={(e) => updateField("funding_agency_name", e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label small fw-semibold">Estimated Budget (PHP, Optional):</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      placeholder="e.g. 50000"
                      value={formData.funding_amount}
                      onChange={(e) => updateField("funding_amount", e.target.value)}
                    />
                  </div>
                </div>

                {validationErrors.funding_source && (
                  <div className="text-danger small mt-2">{validationErrors.funding_source}</div>
                )}
              </SectionCard>

              {/* SECTION 11: Study Duration & Participants */}
              <SectionCard
                id="section-11"
                number={9}
                title="Study Duration & Participants"
                isRequired={true}
                isComplete={sectionStatus["section-11"]}
                icon="bi-calendar-range"
              >
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <label className="form-label fw-semibold">
                      Proposed Start Date: <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className={`form-control ${validationErrors.duration_start_date ? "is-invalid" : ""}`}
                      value={formData.duration_start_date}
                      onChange={(e) => updateField("duration_start_date", e.target.value)}
                    />
                    {validationErrors.duration_start_date && (
                      <div className="invalid-feedback">{validationErrors.duration_start_date}</div>
                    )}
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label fw-semibold">
                      Proposed End Date: <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className={`form-control ${validationErrors.duration_end_date ? "is-invalid" : ""}`}
                      value={formData.duration_end_date}
                      onChange={(e) => updateField("duration_end_date", e.target.value)}
                    />
                    {validationErrors.duration_end_date && (
                      <div className="invalid-feedback">{validationErrors.duration_end_date}</div>
                    )}
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label fw-semibold">
                      Number of Participants (Optional):
                      <InfoTooltip
                        title="Sample Size"
                        text="Total target number of human subjects, interviewees, or patient records to be included."
                      />
                    </label>
                    <input
                      type="number"
                      min="1"
                      className={`form-control ${validationErrors.duration_participants_count ? "is-invalid" : ""}`}
                      placeholder="e.g. 150"
                      value={formData.duration_participants_count}
                      onChange={(e) => updateField("duration_participants_count", e.target.value)}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-semibold">
                      Target Participant Group / Population Characteristics (Optional):
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. Healthcare workers in Zamboanga City, Undergraduate IT students, Patients aged 18-65"
                      value={formData.duration_target_population}
                      onChange={(e) => updateField("duration_target_population", e.target.value)}
                    />
                  </div>
                </div>
              </SectionCard>

              </div>

              <div id="brief-description" className="form-main-section">
                <div className="mb-3">
                  <h2 className="h4 fw-bold text-primary mb-1">Brief Description of the Study</h2>
                  <p className="text-muted mb-0">Describe the study in one clear, complete summary.</p>
                </div>

                {/* SECTION 7: Brief Description of the Study */}
                <SectionCard
                  id="section-7"
                  number={11}
                  title="Brief Description of the Study"
                  isRequired={true}
                  isComplete={sectionStatus["section-7"]}
                  icon="bi-file-earmark-text"
                >
                  <div className="alert alert-warning d-flex align-items-center gap-2 mb-4" role="alert">
                    <i className="bi bi-lightbulb-fill text-warning me-1"></i>
                    Summarize your research in clear, understandable language for multidisciplinary ethics committee members who may not be experts in your exact field.
                  </div>

                  <div className="mb-2">
                    <label className="form-label fw-semibold">
                      Brief Description of the Study: <span className="text-danger">*</span>
                      <InfoTooltip
                        title="Study Description"
                        text="Include the background, objectives, methodology, target population, and ethical considerations in one summary."
                      />
                    </label>
                    <textarea
                      rows="10"
                      className={`form-control ${validationErrors.description_study ? "is-invalid" : ""}`}
                      placeholder="Summarize the background and rationale, objectives, study design, methodology, participants, recruitment, data collection, and expected benefits or risks..."
                      value={formData.description_study}
                      onChange={(e) => updateField("description_study", e.target.value)}
                    ></textarea>
                    {validationErrors.description_study && (
                      <div className="invalid-feedback">{validationErrors.description_study}</div>
                    )}
                  </div>
                </SectionCard>
              </div>

              <div id="checklist-documents" className="form-main-section">
                <div className="mb-3">
                  <h2 className="h4 fw-bold text-primary mb-1">Checklist of Documents</h2>
                  <p className="text-muted mb-0">Complete the basic requirements, add supplementary documents, and sign with the submission date.</p>
                </div>

              {/* SECTION 12: Basic Requirements */}
              <SectionCard
                id="section-12"
                number={12}
                title="Basic Requirements"
                isRequired={true}
                isComplete={sectionStatus["section-12"]}
                icon="bi-paperclip"
              >
                <div className="alert alert-light border small text-secondary mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-cloud-arrow-up-fill fs-4"></i>
                  <div>
                    All protocols require the standard set of ethics documents. Please check each item and upload the corresponding PDF or Word document (Max size: 10MB per file).
                  </div>
                </div>

                {/* 1. Letter / Request for Review */}
                <div className="mb-3 p-3 bg-light rounded-3 border">
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="chk_letterOfRequest"
                      checked={formData.requirements.letterOfRequest.checked || !!formData.requirements.letterOfRequest.file}
                      onChange={(e) => updateRequirement("letterOfRequest", { checked: e.target.checked })}
                    />
                    <label className="form-check-label fw-bold" htmlFor="chk_letterOfRequest">
                      Letter / Request for Review <span className="text-danger">*</span>
                    </label>
                  </div>
                  <FileUploadWidget
                    label="Upload Signed Letter of Request (addressed to AdZU-ERB Chair)"
                    isRequired={true}
                    file={formData.requirements.letterOfRequest.file}
                    files={formData.requirements.letterOfRequest.files}
                    error={validationErrors.letterOfRequest}
                    onFileSelect={(f) => updateRequirement("letterOfRequest", { file: f, checked: true })}
                    onFileRemove={() => updateRequirement("letterOfRequest", { file: null })}
                  />
                </div>

                {/* 2. Endorsement/Referral Letter */}
                <div className="mb-3 p-3 bg-light rounded-3 border">
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="chk_endorsementLetter"
                      checked={formData.requirements.endorsementLetter.checked || !!formData.requirements.endorsementLetter.file || (formData.requirements.endorsementLetter.files && formData.requirements.endorsementLetter.files.length > 0)}
                      onChange={(e) => updateRequirement("endorsementLetter", { checked: e.target.checked })}
                    />
                    <label className="form-check-label fw-bold" htmlFor="chk_endorsementLetter">
                      Endorsement / Referral Letter <span className="text-danger">*</span>
                      <InfoTooltip
                        title="Endorsement"
                        text="From Dean, Department Chair, Thesis Adviser, or Agency Head."
                      />
                    </label>
                  </div>
                  <FileUploadWidget
                    label="Upload Endorsement / Referral Letter"
                    isRequired={true}
                    file={formData.requirements.endorsementLetter.file}
                    files={formData.requirements.endorsementLetter.files}
                    error={validationErrors.endorsementLetter}
                    onFileSelect={(f) => updateRequirement("endorsementLetter", { file: f, checked: true })}
                    onFileRemove={() => updateRequirement("endorsementLetter", { file: null })}
                  />
                </div>

                {/* 3. Full Protocol */}
                <div className="mb-3 p-3 bg-light rounded-3 border">
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="chk_fullProtocol"
                      checked={formData.requirements.fullProtocol.checked || !!formData.requirements.fullProtocol.file || (formData.requirements.fullProtocol.files && formData.requirements.fullProtocol.files.length > 0)}
                      onChange={(e) => updateRequirement("fullProtocol", { checked: e.target.checked })}
                    />
                    <label className="form-check-label fw-bold" htmlFor="chk_fullProtocol">
                      Full Proposal / Study Protocol <span className="text-danger">*</span>
                    </label>
                  </div>
                  <FileUploadWidget
                    label="Upload Full Proposal / Study Protocol Document"
                    isRequired={true}
                    file={formData.requirements.fullProtocol.file}
                    files={formData.requirements.fullProtocol.files}
                    error={validationErrors.fullProtocol}
                    onFileSelect={(f) => updateRequirement("fullProtocol", { file: f, checked: true })}
                    onFileRemove={() => updateRequirement("fullProtocol", { file: null })}
                  />
                </div>

                {/* 4. Technical Review Approval */}
                <div className="mb-3 p-3 bg-light rounded-3 border">
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="chk_technicalApproval"
                      checked={
                        formData.requirements.technicalApproval.checked ||
                        !!formData.requirements.technicalApproval.file ||
                        (formData.requirements.technicalApproval.files && formData.requirements.technicalApproval.files.length > 0) ||
                        !!formData.compliance_technical_file
                      }
                      onChange={(e) => updateRequirement("technicalApproval", { checked: e.target.checked })}
                    />
                    <label className="form-check-label fw-bold" htmlFor="chk_technicalApproval">
                      Technical Review Approval <span className="text-danger">*</span>
                    </label>
                  </div>
                  <FileUploadWidget
                    label="Upload Technical Review Approval"
                    isRequired={true}
                    file={formData.requirements.technicalApproval.file || formData.compliance_technical_file}
                    files={formData.requirements.technicalApproval.files?.length > 0 ? formData.requirements.technicalApproval.files : formData.compliance_technical_files}
                    error={validationErrors.technicalApproval}
                    onFileSelect={(f) => updateRequirement("technicalApproval", { file: f, checked: true })}
                    onFileRemove={() => updateRequirement("technicalApproval", { file: null })}
                  />
                </div>

                {/* 5. CV of Researcher/s */}
                <div className="mb-3 p-3 bg-light rounded-3 border">
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="chk_cvResearchers"
                      checked={formData.requirements.cvResearchers.checked || !!formData.requirements.cvResearchers.file || (formData.requirements.cvResearchers.files && formData.requirements.cvResearchers.files.length > 0)}
                      onChange={(e) => updateRequirement("cvResearchers", { checked: e.target.checked })}
                    />
                    <label className="form-check-label fw-bold" htmlFor="chk_cvResearchers">
                      Curriculum Vitae of Researcher/s <span className="text-danger">*</span>
                      <InfoTooltip
                        title="Curriculum Vitae"
                        text="Include updated CV of PI and Co-PIs with any Good Clinical Practice (GCP) or Ethics training certificates."
                      />
                    </label>
                  </div>
                  <FileUploadWidget
                    label="Upload Consolidated CVs of All Researchers"
                    isRequired={true}
                    file={formData.requirements.cvResearchers.file}
                    files={formData.requirements.cvResearchers.files}
                    error={validationErrors.cvResearchers}
                    onFileSelect={(f) => updateRequirement("cvResearchers", { file: f, checked: true })}
                    onFileRemove={() => updateRequirement("cvResearchers", { file: null })}
                  />
                </div>

                {/* 6. Informed Consent Form */}
                <div className="mb-3 p-3 bg-light rounded-3 border">
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="chk_informedConsent"
                      checked={formData.requirements.informedConsent.checked || !!formData.requirements.informedConsent.file}
                      onChange={(e) => updateRequirement("informedConsent", { checked: e.target.checked })}
                    />
                    <label className="form-check-label fw-bold" htmlFor="chk_informedConsent">
                      Informed Consent Form <span className="text-danger">*</span>
                    </label>
                  </div>

                  <div className="ps-4 mb-2">
                    <label className="form-label small fw-semibold text-secondary mb-1">
                      Language Version(s): <span className="text-danger">*</span>
                    </label>
                    <div className="d-flex flex-wrap gap-3 align-items-center mb-2">
                      {["english", "filipino", "other"].map((lang) => (
                        <div key={lang} className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`icf_${lang}`}
                            checked={formData.requirements.informedConsent.languages[lang]}
                            onChange={(e) =>
                              updateRequirement("informedConsent", {
                                languages: {
                                  ...formData.requirements.informedConsent.languages,
                                  [lang]: e.target.checked,
                                },
                              })
                            }
                          />
                          <label className="form-check-label small text-capitalize" htmlFor={`icf_${lang}`}>
                            {lang === "other" ? "Other (please specify)" : lang}
                          </label>
                        </div>
                      ))}
                    </div>

                    {formData.requirements.informedConsent.languages.other && (
                      <input
                        type="text"
                        className="form-control form-control-sm mb-2"
                        placeholder="e.g. Chavacano, Tausug, Sinama"
                        value={formData.requirements.informedConsent.languages.otherSpecify}
                        onChange={(e) =>
                          updateRequirement("informedConsent", {
                            languages: {
                              ...formData.requirements.informedConsent.languages,
                              otherSpecify: e.target.value,
                            },
                          })
                        }
                      />
                    )}
                    {validationErrors.informedConsentLanguages && (
                      <div className="text-danger small">{validationErrors.informedConsentLanguages}</div>
                    )}
                  </div>

                  <FileUploadWidget
                    label="Upload Informed Consent Form Document(s)"
                    isRequired={true}
                    file={formData.requirements.informedConsent.file}
                    files={formData.requirements.informedConsent.files}
                    error={validationErrors.informedConsent}
                    onFileSelect={(f) => updateRequirement("informedConsent", { file: f, checked: true })}
                    onFileRemove={() => updateRequirement("informedConsent", { file: null })}
                  />
                </div>

                {/* 7. Assent Form */}
                <div className="p-3 bg-light rounded-3 border">
                  <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="chk_assentForm"
                        checked={formData.requirements.assentForm.checked || !!formData.requirements.assentForm.file || (formData.requirements.assentForm.files && formData.requirements.assentForm.files.length > 0)}
                        disabled={formData.requirements.assentForm.notApplicable}
                        onChange={(e) => updateRequirement("assentForm", { checked: e.target.checked })}
                      />
                      <label className="form-check-label fw-bold" htmlFor="chk_assentForm">
                        Assent Form <span className="text-danger">*</span>
                        <InfoTooltip
                          title="Assent Form"
                          text="Required when minors (under 18) or individuals with diminished capacity participate."
                        />
                      </label>
                    </div>

                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="assent_na"
                        checked={formData.requirements.assentForm.notApplicable}
                        onChange={(e) =>
                          updateRequirement("assentForm", {
                            notApplicable: e.target.checked,
                            checked: false,
                          })
                        }
                      />
                      <label className="form-check-label small text-muted fw-semibold" htmlFor="assent_na">
                        Not Applicable (No minor/vulnerable participants)
                      </label>
                    </div>
                  </div>

                  {!formData.requirements.assentForm.notApplicable ? (
                    <>
                      <div className="ps-4 mb-2">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                          Language Version(s): <span className="text-danger">*</span>
                        </label>
                        <div className="d-flex flex-wrap gap-3 align-items-center mb-2">
                          {["english", "filipino", "other"].map((lang) => (
                            <div key={lang} className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`assent_${lang}`}
                                checked={formData.requirements.assentForm.languages[lang]}
                                onChange={(e) =>
                                  updateRequirement("assentForm", {
                                    languages: {
                                      ...formData.requirements.assentForm.languages,
                                      [lang]: e.target.checked,
                                    },
                                  })
                                }
                              />
                              <label className="form-check-label small text-capitalize" htmlFor={`assent_${lang}`}>
                                {lang === "other" ? "Other (please specify)" : lang}
                              </label>
                            </div>
                          ))}
                        </div>

                        {formData.requirements.assentForm.languages.other && (
                          <input
                            type="text"
                            className="form-control form-control-sm mb-2"
                            placeholder="e.g. Chavacano, Tausug"
                            value={formData.requirements.assentForm.languages.otherSpecify}
                            onChange={(e) =>
                              updateRequirement("assentForm", {
                                languages: {
                                  ...formData.requirements.assentForm.languages,
                                  otherSpecify: e.target.value,
                                },
                              })
                            }
                          />
                        )}
                        {validationErrors.assentFormLanguages && (
                          <div className="text-danger small">{validationErrors.assentFormLanguages}</div>
                        )}
                      </div>

                      <FileUploadWidget
                        label="Upload Assent Form Document"
                        isRequired={true}
                        file={formData.requirements.assentForm.file}
                        files={formData.requirements.assentForm.files}
                        error={validationErrors.assentForm}
                        onFileSelect={(f) => updateRequirement("assentForm", { file: f, checked: true })}
                        onFileRemove={() => updateRequirement("assentForm", { file: null })}
                      />
                    </>
                  ) : (
                    <div className="small text-muted fst-italic ps-4">
                      Assent requirement marked as Not Applicable for this protocol.
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* SECTION 13: Supplementary Documents */}
              <SectionCard
                id="section-13"
                number={13}
                title="Supplementary Documents (if any)"
                isRequired={false}
                isComplete={true}
                icon="bi-files"
              >
                <p className="text-muted small mb-3">
                  Check and upload any additional instruments or permits relevant to your study design.
                </p>

                {[
                  { key: "questionnaire", label: "Questionnaire" },
                  { key: "dataCollectionForms", label: "Data Collection Forms" },
                  { key: "productBrochure", label: "Product Brochure" },
                  { key: "fdaAuthorization", label: "Philippine FDA Marketing Authorization or Import License" },
                  { key: "specialPermits", label: "Permit/s for special populations (specify)", hasSpecify: true, placeholder: "e.g. NCIP FPIC Clearance, DepEd Division Permit, LGU Clearance" },
                  { key: "otherSupplementary", label: "Other (please specify)", hasSpecify: true, placeholder: "Specify document title or permit type" },
                ].map((item) => (
                  <div key={item.key} className="mb-3 p-3 bg-light rounded-3 border">
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`chk_${item.key}`}
                        checked={formData.supplementary[item.key].checked || !!formData.supplementary[item.key].file || (formData.supplementary[item.key].files && formData.supplementary[item.key].files.length > 0)}
                        onChange={(e) => updateSupplementary(item.key, { checked: e.target.checked })}
                      />
                      <label className="form-check-label fw-bold" htmlFor={`chk_${item.key}`}>
                        {item.label}
                      </label>
                    </div>

                    {item.hasSpecify && (
                      <input
                        type="text"
                        className="form-control form-control-sm mb-2"
                        placeholder={item.placeholder}
                        value={formData.supplementary[item.key].specify || ""}
                        onChange={(e) =>
                          updateSupplementary(item.key, {
                            specify: e.target.value,
                            checked: true,
                          })
                        }
                      />
                    )}

                    <FileUploadWidget
                      label={`Upload ${item.label}`}
                      file={formData.supplementary[item.key].file}
                      files={formData.supplementary[item.key].files}
                      onFileSelect={(f) => updateSupplementary(item.key, { file: f, checked: true })}
                      onFileRemove={() => updateSupplementary(item.key, { file: null })}
                    />
                  </div>
                ))}
              </SectionCard>

              {/* SECTION 14: Declaration and Signature */}
              <SectionCard
                id="section-14"
                number={14}
                title="Declaration and Signature"
                isRequired={true}
                isComplete={sectionStatus["section-14"]}
                icon="bi-pen"
                badgeClass="border-top border-4 border-primary"
              >
                <div className="p-3 bg-light rounded-3 border mb-3 small text-secondary">
                  <h6 className="fw-bold text-dark mb-2">Ethical Commitment & Declaration:</h6>
                  <ul className="ps-3 mb-0">
                    <li className="mb-1">
                      I/We certify that all statements and information contained in this application and accompanying documents are true, correct, and complete.
                    </li>
                    <li className="mb-1">
                      I/We agree to conduct this study in full compliance with the National Ethical Guidelines for Health and Health-Related Research (NEGHHR), the Declaration of Helsinki, and AdZU-ERB Standard Operating Procedures (SOPs).
                    </li>
                    <li className="mb-1">
                      I/We will not initiate participant recruitment, consent procedures, or data collection until formal ethical clearance is granted by the AdZU-ERB.
                    </li>
                    <li className="mb-0">
                      I/We will report any unanticipated problems involving risks to human subjects, serious adverse events, or proposed protocol amendments to the committee immediately.
                    </li>
                  </ul>
                </div>

                <div className="form-check mb-4">
                  <input
                    className={`form-check-input ${validationErrors.declaration_agreed ? "is-invalid" : ""}`}
                    type="checkbox"
                    id="declarationAgree"
                    checked={formData.declaration_agreed}
                    onChange={(e) => updateField("declaration_agreed", e.target.checked)}
                  />
                  <label className="form-check-label fw-bold text-dark" htmlFor="declarationAgree">
                    I have read, understood, and solemnly agree to the above ethical declarations. <span className="text-danger">*</span>
                  </label>
                  {validationErrors.declaration_agreed && (
                    <div className="text-danger small">{validationErrors.declaration_agreed}</div>
                  )}
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">
                      Printed Name of Principal Investigator (Electronic Signature): <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <i className="bi bi-pen-fill text-primary"></i>
                      </span>
                      <input
                        type="text"
                        className={`form-control ${validationErrors.declaration_signature_name ? "is-invalid" : ""}`}
                        value={formData.declaration_signature_name}
                        onChange={(e) => updateField("declaration_signature_name", e.target.value)}
                        placeholder="Full Legal Name"
                      />
                    </div>
                    {validationErrors.declaration_signature_name && (
                      <div className="text-danger small">{validationErrors.declaration_signature_name}</div>
                    )}
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label fw-semibold">Academic Designation:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Lead Researcher / Student"
                      value={formData.declaration_designation}
                      onChange={(e) => updateField("declaration_designation", e.target.value)}
                    />
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label fw-semibold">Date Submitted:</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.declaration_date}
                      onChange={(e) => updateField("declaration_date", e.target.value)}
                    />
                  </div>
                </div>
              </SectionCard>

              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="card shadow-sm border-0 rounded-3 p-3 bg-white mb-5">
                <div className="applicant-form-action-bar d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div className="applicant-form-secondary-actions d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleNavigateHome}
                      aria-label="Cancel and return to dashboard"
                    >
                      <i className="bi bi-arrow-left me-1"></i>
                      <span className="d-none d-sm-inline">Cancel &amp; Return</span>
                      <span className="d-sm-none">Cancel</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => handleSaveDraft(false)}
                      aria-label="Save as Draft"
                    >
                      <i className="bi bi-floppy me-1"></i>
                      <span className="d-none d-sm-inline">Save as Draft</span>
                      <span className="d-sm-none">Save Draft</span>
                    </button>
                  </div>

                  <div className="applicant-form-primary-actions d-flex align-items-center gap-3">
                    <span className="small text-muted d-none d-sm-inline">
                      {progressPercent}% Complete
                    </span>
                    <button
                      type="submit"
                      className="btn btn-success fw-bold px-4 py-2 shadow-sm d-flex align-items-center gap-2"
                      aria-label="Submit for Ethics Review"
                    >
                      <i className="bi bi-check2-circle fs-5"></i>
                      <span>Submit for Ethics Review</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </section>
        </div>
      </main>

      {/* ---------------- Submit Confirmation Modal ---------------- */}
      {showSubmitConfirmModal && (
        <>
          <div className="modal-backdrop show" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1070 }}></div>
          <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1080 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header bg-primary text-white rounded-top-4">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-shield-check me-2"></i> Review Before Saving Draft
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowSubmitConfirmModal(false)}
                    disabled={isSavingDraft}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <p className="text-secondary mb-3">
                    Review your application summary before saving it as a draft and continuing to payment:
                  </p>

                  <div className="card bg-light border-0 rounded-3 p-3 mb-3">
                    <div className="mb-2">
                      <span className="text-muted small d-block">Study Title:</span>
                      <strong className="text-dark">{formData.study_title || "(No title entered)"}</strong>
                    </div>
                    <div className="row g-2 small">
                      <div className="col-12 col-md-6">
                        <span className="text-muted d-block">Principal Investigator:</span>
                        <strong>
                          {formData.primary_researchers[0]?.firstName} {formData.primary_researchers[0]?.lastName}
                        </strong>
                      </div>
                      <div className="col-12 col-md-6">
                        <span className="text-muted d-block">Institution / Department:</span>
                        <strong>{formData.institution_department || formData.institution_name || "N/A"}</strong>
                      </div>
                      <div className="col-12 col-md-6">
                        <span className="text-muted d-block">Study Classification:</span>
                        <strong>{formData.study_type || "N/A"}</strong>
                      </div>
                      <div className="col-12 col-md-6">
                        <span className="text-muted d-block">Proposed Duration:</span>
                        <strong>
                          {formData.duration_start_date} to {formData.duration_end_date} ({formData.duration_participants_count} subjects)
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="alert alert-warning small mb-0">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Your application will be saved as a draft. It will remain editable until final submission.
                  </div>
                </div>

                <div className="modal-footer bg-light rounded-bottom-4">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowSubmitConfirmModal(false)}
                    disabled={isSavingDraft}
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-success fw-bold px-4"
                    onClick={handleSaveDraftAndContinue}
                    disabled={isSavingDraft}
                  >
                    {isSavingDraft ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Saving Draft...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-floppy me-2"></i> Save Draft &amp; Continue
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ---------------- Footer ---------------- */}
      <DashboardFooter />
    </div>
  );
}

export default ApplicantForm;
