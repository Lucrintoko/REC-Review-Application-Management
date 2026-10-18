import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';

// Standardized AdZU REC Document Taxonomy & Visual Badging
const DOCUMENT_CATEGORIES = {
    restructured_protocol_clean: {
        label: "Clean Restructured Protocol",
        badgeClass: "bg-success text-white",
        icon: "bi-file-earmark-check-fill",
    },
    restructured_protocol_tracked: {
        label: "Tracked Changes Protocol",
        badgeClass: "bg-warning text-dark",
        icon: "bi-file-earmark-diff-fill",
    },
    institutional_safeguard_moa: {
        label: "Institutional Safety Accord / MOA",
        badgeClass: "bg-primary text-white",
        icon: "bi-shield-check",
    },
    specialist_endorsement: {
        label: "Specialist / Dept Endorsement",
        badgeClass: "bg-info text-dark",
        icon: "bi-award-fill",
    },
    revised_protocol_clean: {
        label: "Clean Protocol",
        badgeClass: "bg-success text-white",
        icon: "bi-file-earmark-check-fill",
    },
    revised_protocol_tracked: {
        label: "Tracked Changes Protocol",
        badgeClass: "bg-warning text-dark",
        icon: "bi-file-earmark-diff-fill",
    },
    updated_consent_form: {
        label: "Informed Consent / Assent",
        badgeClass: "bg-info text-dark",
        icon: "bi-person-check-fill",
    },
    consent_form: {
        label: "Informed Consent / Assent",
        badgeClass: "bg-info text-dark",
        icon: "bi-person-check-fill",
    },
    clarification_matrix: {
        label: "Clarification Matrix",
        badgeClass: "bg-primary text-white",
        icon: "bi-table",
    },
    supplementary_instrument: {
        label: "Data Collection Tools",
        badgeClass: "bg-secondary text-white",
        icon: "bi-journal-text",
    },
    technical_review_letter: {
        label: "Tech Review Letter",
        badgeClass: "bg-secondary text-white",
        icon: "bi-patch-check-fill",
    },
    curriculum_vitae: {
        label: "Investigator CV",
        badgeClass: "bg-dark text-white",
        icon: "bi-person-vcard",
    },
    other_supporting: {
        label: "Supporting Document",
        badgeClass: "bg-light text-dark border",
        icon: "bi-paperclip",
    }
};

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
}

function resolveFileUrl(savedPath) {
    if (!savedPath) return '#';
    if (savedPath.startsWith('http://') || savedPath.startsWith('https://')) return savedPath;
    const cleanPath = savedPath.replace(/^\/+/, '');
    if (cleanPath.startsWith('backend/')) {
        return `http://localhost/REC-Review-Application-Management/${cleanPath}`;
    }
    return `http://localhost/REC-Review-Application-Management/backend/${cleanPath}`;
}

// Default Data Schema Constructors matching Form 11 and Form 12 JSON schemas
const buildInitialForm11 = (protocol, reviewerName, isPrimary = "Yes") => ({
    metadata: {
        recFormNo: "11",
        versionNo: "16",
        dateOfEffectivity: "July 9, 2026"
    },
    protocolInformation: {
        titleOfStudy: protocol?.title || protocol?.research_title || "",
        recCode: protocol?.id || protocol?.protocol_code || "",
        typeOfReview: protocol?.type || protocol?.review_type || "",
        projectLeader: protocol?.researchers?.join(', ') || "N/A",
        institution: protocol?.form_data?.institution || "Ateneo de Zamboanga University",
        reviewer: reviewerName || "",
        primaryReviewer: isPrimary
    },
    guideQuestions: {
        socialValue: {
            label: "Does the study have social value?",
            helperText: "(e.g. scientific value, relevance to national / community needs)",
            response: "Unable To Assess",
            comment: ""
        },
        studyBackgroundAdequate: {
            label: "Is the study background adequate?",
            helperText: "Clear theoretical rationale and contextual background",
            response: "Unable To Assess",
            comment: ""
        },
        researchQuestionsSupportedByLiterature: {
            label: "Are the research questions supported by the Review of Literature?",
            helperText: "Literature review is directly aligned with stated questions",
            response: "Unable To Assess",
            comment: ""
        },
        studyObjectivesSmart: {
            label: "Are the study objectives Specific, Measurable, Attainable, Realistic, and Time-bound?",
            helperText: "SMART framework compliance",
            response: "Unable To Assess",
            comment: ""
        },
        researchDesignAppropriate: {
            label: "Is the research design appropriate?",
            populationIdentifiedAndDefined: {
                label: "Is the population identified and defined?",
                response: "Unable To Assess"
            },
            selectionOfParticipantsDescribed: {
                label: "Is the selection of study participants described?",
                response: "Unable To Assess"
            },
            sampleSizeJustified: {
                label: "Is the sample size justified?",
                response: "Unable To Assess"
            },
            dataAnalysisPlanAndDummyTables: {
                label: "Is the plan for data analysis described and are there dummy tables?",
                response: "Unable To Assess"
            },
            comment: ""
        },
        humanParticipantsRequired: {
            label: "Does the research need to be carried out with human participants?",
            helperText: "Justification for involving human subjects instead of non-human models",
            response: "Unable To Assess",
            comment: ""
        },
        vulnerabilityIssue: {
            label: "Does the study involve vulnerable groups?",
            helperText: "Minors, pregnant women, indigenous persons, prisoners, or economically disadvantaged",
            response: "Unable To Assess",
            comment: ""
        },
        vulnerabilityMechanismsInPlace: {
            label: "Are appropriate mechanisms/interventions in place to address the vulnerability issue/s?",
            helperText: "Safeguards against undue coercion and exploitation",
            response: "Unable To Assess",
            comment: ""
        },
        risksToParticipants: {
            label: "Are there risks / probable harms to the human participants in the study?",
            helperText: "Physical, psychological, social, legal, or economic risks",
            response: "Unable To Assess",
            comment: ""
        },
        riskMitigationMeasures: {
            label: "Are there measures to mitigate the risks?",
            helperText: "Safety protocols, referral mechanisms, and confidentiality measures",
            response: "Unable To Assess",
            comment: ""
        },
        informedConsentAdequate: {
            label: "Is the informed consent procedure / form adequate and culturally appropriate?",
            helperText: "Comprehensible translation and voluntary participation safeguards",
            response: "Unable To Assess",
            comment: ""
        },
        investigatorsAdequatelyTrained: {
            label: "Is/are the investigator/s adequately trained and do they have sufficient experience?",
            helperText: "GCP certifications, ethics training, and technical expertise",
            response: "Unable To Assess",
            comment: ""
        },
        conflictOfInterestDisclosure: {
            label: "Is there a disclosure of conflict of interest?",
            helperText: "Financial, institutional, or personal COI statements",
            response: "Unable To Assess",
            comment: ""
        },
        researchFacilitiesAdequate: {
            label: "Are the research facilities adequate?",
            helperText: "Laboratories, interview venues, secure data storage systems",
            response: "Unable To Assess",
            comment: ""
        },
        otherConcernsComment: ""
    },
    recommendations: {
        decision: "Approved",
        minorRevisionsComments: "",
        majorRevisionComments: "",
        disapprovedReasons: ""
    }
});

const buildInitialForm12 = (protocol, reviewerName, isPrimary = "Yes") => ({
    metadata: {
        recFormNo: "12",
        versionNo: "16",
        dateOfEffectivity: "July 9, 2026"
    },
    protocolInformation: {
        titleOfStudy: protocol?.title || protocol?.research_title || "",
        recCode: protocol?.id || protocol?.protocol_code || "",
        typeOfReview: protocol?.type || protocol?.review_type || "",
        projectLeader: protocol?.researchers?.join(', ') || "N/A",
        institution: protocol?.form_data?.institution || "Ateneo de Zamboanga University",
        reviewer: reviewerName || "",
        primaryReviewer: isPrimary
    },
    guideQuestions: {
        informedConsentNecessity: {
            label: "Is it necessary to seek the informed consent of the participants?",
            necessaryToSeekConsent: "Yes",
            ifNoExplanation: ""
        },
        sufficientInformationChecklist: {
            purposeOfStudy: "Yes",
            expectedDurationOfParticipation: "Yes",
            proceduresToBeCarriedOut: "Yes",
            discomfortsAndInconveniences: "Yes",
            risksIncludingDiscrimination: "Yes",
            randomAssignmentToTrialTreatments: "Not Applicable",
            benefitsToParticipants: "Yes",
            alternativeTreatmentsOrProcedures: "Not Applicable",
            compensationOrMedicalTreatmentsForInjury: "Yes",
            contactPersonForQuestionsAndInjuryAssistance: "Yes",
            refusalOrDiscontinuanceWithoutPenalty: "Yes",
            extentOfConfidentiality: "Yes",
            writtenInSimpleUnderstandableLanguage: "Yes",
            adequateProcessForVoluntaryConsent: "Yes",
            otherConcernsComments: ""
        }
    },
    recommendations: {
        decision: "Approved",
        minorRevisionsComments: "",
        majorRevisionComments: "",
        disapprovedReasons: ""
    }
});

function OngoingReviewModal({ protocol, onClose, onRefresh }) {
    const adminName = localStorage.getItem('adminName') || "Reviewer";
    const role = localStorage.getItem('adminRole') || "Staff";
    const adminId = localStorage.getItem('adminId');

    // Role Matrix Variables
    const isPrimaryReviewer = role === 'Primary Reviewer';
    const isNonPrimaryReviewer = role === 'Non-Primary Reviewer';
    const isChair = role === 'Ethics Chair' || role === 'Ethics Committee Chair';
    const isSecretariat = role === 'Secretariat';
    const isExemptedChairAutonomous = isChair && (protocol?.type === 'EXEMPTED' || protocol?.review_type === 'Exempted');
    
    // Evaluation View Mode:
    // If Chair/Secretariat (and not autonomous Exempted), oversight mode is active.
    const isOversightMode = (isChair || isSecretariat) && !isExemptedChairAutonomous;

    // Assigned Reviewers Pool
    const assignedReviewers = useMemo(() => {
        if (Array.isArray(protocol?.assigned_reviewers)) {
            return protocol.assigned_reviewers;
        }
        return [];
    }, [protocol?.assigned_reviewers]);

    // Active reviewer in oversight mode (defaults to first assigned reviewer or current user)
    const [selectedReviewerId, setSelectedReviewerId] = useState(() => {
        if (isOversightMode && assignedReviewers.length > 0) {
            return assignedReviewers[0].reviewer_id;
        }
        return adminId;
    });

    // Find the active review record
    const activeReviewRecord = useMemo(() => {
        if (isOversightMode) {
            return assignedReviewers.find(r => String(r.reviewer_id) === String(selectedReviewerId)) || assignedReviewers[0] || null;
        }
        return assignedReviewers.find(r => String(r.reviewer_id) === String(adminId)) || null;
    }, [assignedReviewers, isOversightMode, selectedReviewerId, adminId]);

    // Determine target reviewer role for UI switching (Primary gets Form 11 + 12; Non-Primary gets Form 12 only)
    const activeTargetRole = useMemo(() => {
        if (isOversightMode && activeReviewRecord) {
            return activeReviewRecord.reviewer_role;
        }
        return role;
    }, [isOversightMode, activeReviewRecord, role]);

    const activeCanViewForm11 = activeTargetRole === 'Primary Reviewer' || isExemptedChairAutonomous;

    // Active Form Tab: 'form11' vs 'form12'
    const [activeFormTab, setActiveFormTab] = useState(() => {
        return activeCanViewForm11 ? 'form11' : 'form12';
    });

    // Automatically enforce Form 12 tab if user/reviewer does not have Form 11 access
    useEffect(() => {
        if (!activeCanViewForm11 && activeFormTab === 'form11') {
            setActiveFormTab('form12');
        }
    }, [activeCanViewForm11, activeFormTab]);

    // Read-Only Enforcement: True if oversight mode OR reviewer already submitted evaluation
    const isReadOnly = useMemo(() => {
        if (isOversightMode) return true;
        if (activeReviewRecord?.review_status === 'Completed') return true;
        return false;
    }, [isOversightMode, activeReviewRecord]);

    // Appeal & Multi-Cycle Re-deliberation Context
    const parsedFormData = useMemo(() => {
        if (!protocol?.form_data) return {};
        if (typeof protocol.form_data === 'string') {
            try { return JSON.parse(protocol.form_data); } catch (e) { return {}; }
        }
        return protocol.form_data;
    }, [protocol?.form_data]);

    const isAppealedProtocol = useMemo(() => {
        return Boolean(
            protocol?.is_appealed || 
            (protocol?.current_cycle && Number(protocol.current_cycle) >= 2) ||
            (Array.isArray(parsedFormData?.appeal_submissions) && parsedFormData.appeal_submissions.length > 0)
        );
    }, [protocol?.is_appealed, protocol?.current_cycle, parsedFormData]);

    const latestAppeal = useMemo(() => {
        if (!isAppealedProtocol || !Array.isArray(parsedFormData?.appeal_submissions) || parsedFormData.appeal_submissions.length === 0) {
            return null;
        }
        return parsedFormData.appeal_submissions[parsedFormData.appeal_submissions.length - 1];
    }, [isAppealedProtocol, parsedFormData]);

    const [isAppealDrawerOpen, setIsAppealDrawerOpen] = useState(true);

    // Document Workspace State & Extraction
    const protocolDocuments = useMemo(() => {
        const list = [];
        const seen = new Set();

        const addFile = (file, fallbackCategory = 'other_supporting') => {
            if (!file || !file.savedPath || seen.has(file.savedPath)) return;
            seen.add(file.savedPath);
            list.push({
                ...file,
                category: file.category || fallbackCategory
            });
        };

        // 0. Appeal Submissions (Prioritized on top for Cycle 2 Re-deliberation)
        if (Array.isArray(parsedFormData?.appeal_submissions)) {
            parsedFormData.appeal_submissions.forEach(appSub => {
                (appSub.corrective_documents || []).forEach(f => {
                    addFile({
                        ...f,
                        isAppealDoc: true,
                        cycleNumber: appSub.cycle_number || 2,
                        appealTitle: appSub.appeal_title || 'Formal Appeal Rebuttal'
                    }, f.category || 'restructured_protocol_clean');
                });
            });
        }

        // Requirements appealDocuments
        if (Array.isArray(parsedFormData?.requirements?.appealDocuments)) {
            parsedFormData.requirements.appealDocuments.forEach(f => {
                addFile({
                    ...f,
                    isAppealDoc: true,
                    cycleNumber: 2
                }, f.category || 'restructured_protocol_clean');
            });
        }

        // 1. Revision submissions
        if (Array.isArray(parsedFormData?.revision_submissions)) {
            parsedFormData.revision_submissions.forEach(sub => {
                (sub.files || []).forEach(f => addFile(f, 'revised_protocol_clean'));
            });
        }

        // 2. Requirements folder
        if (parsedFormData?.requirements) {
            const req = parsedFormData.requirements;
            Object.keys(req).forEach(key => {
                if (key === 'appealDocuments') return;
                const item = req[key];
                if (Array.isArray(item)) {
                    item.forEach(f => addFile(f, key));
                } else if (item && typeof item === 'object') {
                    addFile(item, key);
                }
            });
        }

        // 3. Fallback traversal
        const recurse = (obj) => {
            if (Array.isArray(obj)) {
                obj.forEach(recurse);
            } else if (obj && typeof obj === 'object') {
                if (obj.savedPath && obj.name) {
                    addFile(obj, 'other_supporting');
                } else {
                    Object.values(obj).forEach(recurse);
                }
            }
        };

        recurse(parsedFormData);
        return list;
    }, [parsedFormData]);

    // Helper to prioritize previewable documents (PDF/Image) over non-inline files (Word/DOCX)
    const getPreferredInitialDoc = (docs) => {
        if (!docs || docs.length === 0) return null;
        // Prioritize appeal PDF/Image if present
        const appealPdf = docs.find(d => {
            if (!d.isAppealDoc) return false;
            const path = (d.name || d.savedPath || '').toLowerCase();
            return path.endsWith('.pdf') || /\.(png|jpe?g|gif|webp|svg)$/i.test(path);
        });
        if (appealPdf) return appealPdf;

        const pdfOrImg = docs.find(d => {
            const path = (d.name || d.savedPath || '').toLowerCase();
            return path.endsWith('.pdf') || /\.(png|jpe?g|gif|webp|svg)$/i.test(path);
        });
        return pdfOrImg || docs[0];
    };

    const [selectedDoc, setSelectedDoc] = useState(() => getPreferredInitialDoc(protocolDocuments));
    const [isSynopsisOpen, setIsSynopsisOpen] = useState(false);

    // Keep selected document in sync if list updates
    useEffect(() => {
        if (!selectedDoc && protocolDocuments.length > 0) {
            setSelectedDoc(getPreferredInitialDoc(protocolDocuments));
        }
    }, [protocolDocuments, selectedDoc]);

    // Form State & Storage Handling
    const localStorageKeyForm11 = `rec_eval_${protocol?.application_id}_f11_${isOversightMode ? selectedReviewerId : adminId}`;
    const localStorageKeyForm12 = `rec_eval_${protocol?.application_id}_f12_${isOversightMode ? selectedReviewerId : adminId}`;

    const [form11Data, setForm11Data] = useState(() => {
        const cached = localStorage.getItem(localStorageKeyForm11);
        if (cached) {
            try { return JSON.parse(cached); } catch (e) { /* fallback */ }
        }
        return buildInitialForm11(protocol, adminName, isPrimaryReviewer ? "Yes" : "No");
    });

    const [form12Data, setForm12Data] = useState(() => {
        const cached = localStorage.getItem(localStorageKeyForm12);
        if (cached) {
            try { return JSON.parse(cached); } catch (e) { /* fallback */ }
        }
        return buildInitialForm12(protocol, adminName, isPrimaryReviewer ? "Yes" : "No");
    });

    const [lastSavedTime, setLastSavedTime] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State Synchronization Effect upon selecting reviewers or loading records
    useEffect(() => {
        if (!selectedReviewerId) return;

        const currentReview = assignedReviewers.find(r => String(r.reviewer_id) === String(selectedReviewerId));
        const targetRole = isOversightMode && currentReview ? currentReview.reviewer_role : role;
        const targetCanViewF11 = targetRole === 'Primary Reviewer' || isExemptedChairAutonomous;

        if (!targetCanViewF11 && activeFormTab === 'form11') {
            setActiveFormTab('form12');
        }

        // Hydrate from database submission if present
        let f11 = null;
        let f12 = null;

        if (currentReview?.form_data) {
            try {
                const parsed = typeof currentReview.form_data === 'string' 
                    ? JSON.parse(currentReview.form_data) 
                    : currentReview.form_data;
                if (parsed.form11) f11 = parsed.form11;
                if (parsed.form12) f12 = parsed.form12;
            } catch (e) {
                console.error("Failed to parse form_data:", e);
            }
        }

        // Hydrate from localStorage draft if not in DB
        const cacheKey11 = `rec_eval_${protocol?.application_id}_f11_${selectedReviewerId}`;
        const cacheKey12 = `rec_eval_${protocol?.application_id}_f12_${selectedReviewerId}`;
        if (!f11) {
            const cached11 = localStorage.getItem(cacheKey11);
            if (cached11) { try { f11 = JSON.parse(cached11); } catch (e) {} }
        }
        if (!f12) {
            const cached12 = localStorage.getItem(cacheKey12);
            if (cached12) { try { f12 = JSON.parse(cached12); } catch (e) {} }
        }

        const revName = currentReview?.reviewer_name || adminName;
        setForm11Data(f11 || buildInitialForm11(protocol, revName, targetCanViewF11 ? "Yes" : "No"));
        setForm12Data(f12 || buildInitialForm12(protocol, revName, targetCanViewF11 ? "Yes" : "No"));
    }, [selectedReviewerId, protocol?.application_id, assignedReviewers, isOversightMode, isExemptedChairAutonomous, role, adminName, activeFormTab]);

    // SweetAlert Modal Overlay Helper to guarantee dialog is layered in front of modal
    const fireSwal = (options) => {
        return Swal.fire({
            ...options,
            didOpen: (popup) => {
                const container = Swal.getContainer();
                if (container) container.style.zIndex = '9999';
                if (options.didOpen) options.didOpen(popup);
            }
        });
    };

    // Save Progress Action
    const handleSaveDraft = (silent = false) => {
        if (isReadOnly) return;
        localStorage.setItem(`rec_eval_${protocol?.application_id}_f11_${adminId}`, JSON.stringify(form11Data));
        localStorage.setItem(`rec_eval_${protocol?.application_id}_f12_${adminId}`, JSON.stringify(form12Data));
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(now);

        if (!silent) {
            fireSwal({
                title: 'Progress Saved',
                text: `Your evaluation draft was saved locally at ${now}.`,
                icon: 'success',
                timer: 1600,
                showConfirmButton: false
            });
        }
    };

    // Submit Completed Evaluation Action
    const handleSubmitEvaluation = () => {
        if (isReadOnly) return;

        const errors = [];
        const activeDecision = activeCanViewForm11 ? form11Data.recommendations.decision : form12Data.recommendations.decision;

        if (!activeDecision) {
            errors.push("An overall recommendation decision must be selected.");
        }

        let comments = "";
        if (activeDecision.includes('Minor')) {
            comments = activeCanViewForm11 ? form11Data.recommendations.minorRevisionsComments : form12Data.recommendations.minorRevisionsComments;
            if (!comments || !comments.trim()) {
                errors.push("Comments specifying the required Minor Revisions must be provided.");
            }
        } else if (activeDecision.includes('Major')) {
            comments = activeCanViewForm11 ? form11Data.recommendations.majorRevisionComments : form12Data.recommendations.majorRevisionComments;
            if (!comments || !comments.trim()) {
                errors.push("Comments detailing the Major Revisions must be provided.");
            }
        } else if (activeDecision === 'Disapproved') {
            comments = activeCanViewForm11 ? form11Data.recommendations.disapprovedReasons : form12Data.recommendations.disapprovedReasons;
            if (!comments || !comments.trim()) {
                errors.push("Detailed reasons for Disapproval must be provided.");
            }
        }

        if (errors.length > 0) {
            fireSwal({
                icon: 'warning',
                title: 'Submission Requirements Incomplete',
                html: `
                    <div class="text-start small">
                        <p class="mb-2">Please resolve the following required fields before finalizing your review:</p>
                        <ul class="text-danger ps-3 mb-0">
                            ${errors.map(err => `<li>${err}</li>`).join('')}
                        </ul>
                    </div>
                `,
                confirmButtonColor: '#060297'
            });
            return;
        }

        const mappedRecommendation = activeDecision.includes('Minor') ? 'Minor Revisions'
            : activeDecision.includes('Major') ? 'Major Revisions'
            : activeDecision;

        const submissionPayload = {
            application_id: protocol.application_id,
            reviewer_id: parseInt(adminId, 10),
            reviewer_name: adminName,
            reviewer_role: role,
            recommendation: mappedRecommendation,
            comments: comments,
            form_data: {
                form11: activeCanViewForm11 ? form11Data : null,
                form12: form12Data,
                submitted_at: new Date().toISOString()
            }
        };

        const currentFormName = activeFormTab === 'form11' ? 'Form 11 (Protocol Evaluation)' : 'Form 12 (Informed Consent)';

        fireSwal({
            title: 'Submit Completed Evaluation?',
            html: `
                <div class="text-start small">
                    <p class="mb-2">You are submitting the official evaluation for <strong>${protocol?.id || protocol?.protocol_code}</strong>.</p>
                    <div class="p-3 bg-light rounded-3 border mb-3">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="text-muted">Reviewer:</span>
                            <strong>${adminName} (${role})</strong>
                        </div>
                        <div class="d-flex justify-content-between mb-1">
                            <span class="text-muted">Active Worksheet:</span>
                            <span>${currentFormName}</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span class="text-muted">Recommendation:</span>
                            <span class="badge ${mappedRecommendation === 'Approved' ? 'bg-success' : 'bg-warning text-dark'}">${mappedRecommendation}</span>
                        </div>
                    </div>
                    <div class="alert alert-warning py-2 px-3 small mb-0 border-warning-subtle">
                        <i class="bi bi-shield-lock-fill me-1"></i>
                        Once submitted, your responses will be permanently locked and forwarded to the Ethics Chair for consolidation.
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#060297',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="bi bi-send-check-fill me-1"></i> Confirm & Submit',
            cancelButtonText: 'Review Further',
            showLoaderOnConfirm: true,
            preConfirm: async () => {
                try {
                    const response = await fetch('http://localhost/REC-Review-Application-Management/backend/api/submit_review_evaluation.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(submissionPayload)
                    });
                    const resJson = await response.json();
                    if (!response.ok || resJson.status !== 'success') {
                        throw new Error(resJson.message || 'Submission failed');
                    }
                    return resJson;
                } catch (err) {
                    Swal.showValidationMessage(`Error: ${err.message}`);
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // Clear local drafts upon successful submission
                localStorage.removeItem(`rec_eval_${protocol?.application_id}_f11_${adminId}`);
                localStorage.removeItem(`rec_eval_${protocol?.application_id}_f12_${adminId}`);

                fireSwal({
                    icon: 'success',
                    title: 'Evaluation Submitted!',
                    text: result.value?.all_completed
                        ? 'All assigned committee reviews are now complete! Protocol transitioned to Consolidation of Evaluation.'
                        : 'Your official evaluation worksheet has been recorded successfully.',
                    confirmButtonColor: '#060297'
                }).then(() => {
                    if (onRefresh) onRefresh();
                    onClose();
                });
            }
        });
    };

    // Helper handlers for question state updates
    const handleForm11QuestionChange = (fieldKey, responseValue) => {
        if (isReadOnly) return;
        setForm11Data(prev => ({
            ...prev,
            guideQuestions: {
                ...prev.guideQuestions,
                [fieldKey]: {
                    ...prev.guideQuestions[fieldKey],
                    response: responseValue
                }
            }
        }));
    };

    const handleForm11CommentChange = (fieldKey, commentValue) => {
        if (isReadOnly) return;
        setForm11Data(prev => ({
            ...prev,
            guideQuestions: {
                ...prev.guideQuestions,
                [fieldKey]: {
                    ...prev.guideQuestions[fieldKey],
                    comment: commentValue
                }
            }
        }));
    };

    const handleForm11CompositeChange = (subKey, responseValue) => {
        if (isReadOnly) return;
        setForm11Data(prev => ({
            ...prev,
            guideQuestions: {
                ...prev.guideQuestions,
                researchDesignAppropriate: {
                    ...prev.guideQuestions.researchDesignAppropriate,
                    [subKey]: {
                        ...prev.guideQuestions.researchDesignAppropriate[subKey],
                        response: responseValue
                    }
                }
            }
        }));
    };

    const handleForm12ChecklistChange = (itemKey, val) => {
        if (isReadOnly) return;
        setForm12Data(prev => ({
            ...prev,
            guideQuestions: {
                ...prev.guideQuestions,
                sufficientInformationChecklist: {
                    ...prev.guideQuestions.sufficientInformationChecklist,
                    [itemKey]: val
                }
            }
        }));
    };

    const isSubmitted = activeReviewRecord?.review_status === 'Completed';

    return (
        <>
            {/* Modal Backdrop with Proper Z-Index */}
            <div className="modal-backdrop show" style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1050 }}></div>

            <div 
                className="modal d-block" 
                tabIndex="-1" 
                onClick={onClose} 
                style={{ zIndex: 1055, overflowY: 'hidden' }}
            >
                <div 
                    className="modal-dialog modal-xl modal-dialog-centered" 
                    onClick={(e) => e.stopPropagation()} 
                    style={{ maxWidth: '96vw', height: '94vh', margin: '3vh auto' }}
                >
                    <div className="modal-content border-0 shadow-lg rounded-4 h-100 d-flex flex-column overflow-hidden bg-white">

                        {/* 1. MODAL HEADER: PROTOCOL META & ROLE BADGING */}
                        <div className="modal-header bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center flex-shrink-0">
                            <div className="d-flex align-items-center gap-3">
                                <div className="bg-light p-2 rounded-3 text-theme-primary border">
                                    <i className="bi bi-journal-medical fs-4 lh-1"></i>
                                </div>
                                <div>
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                        <span className="badge bg-theme-primary px-3 py-1 fs-6 font-monospace">
                                            {protocol?.id || protocol?.protocol_code || 'REC-XXXX-XXXX'}
                                        </span>
                                        <span className="badge bg-secondary-subtle text-dark border px-2 py-1 small">
                                            {protocol?.type || protocol?.review_type || 'UNDETERMINED'}
                                        </span>
                                        {isSubmitted ? (
                                            <span className="badge bg-success-subtle text-success border border-success px-2 py-1 small">
                                                <i className="bi bi-check-circle-fill me-1"></i>Evaluation Submitted
                                            </span>
                                        ) : (
                                            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning px-2 py-1 small">
                                                <i className="bi bi-hourglass-split me-1"></i>Evaluation Pending
                                            </span>
                                        )}
                                        {isReadOnly && (
                                            <span className="badge bg-dark text-white px-2 py-1 small d-inline-flex align-items-center gap-1">
                                                <i className="bi bi-lock-fill"></i> Read-Only View
                                            </span>
                                        )}
                                    </div>
                                    <h6 className="fw-bold text-dark text-truncate mt-1 mb-0" style={{ maxWidth: '650px' }} title={protocol?.title || protocol?.research_title}>
                                        {protocol?.title || protocol?.research_title || 'Untitled Research Protocol'}
                                    </h6>
                                    <small className="text-muted">
                                        Lead Proponent: <strong className="text-dark">{protocol?.researchers?.join(', ') || 'N/A'}</strong>
                                    </small>
                                </div>
                            </div>

                            {/* Header Actions & Close Button */}
                            <div className="d-flex align-items-center gap-3">
                                {isOversightMode && (
                                    <div className="text-end d-none d-md-block">
                                        <span className="text-muted small d-block">Committee Oversight</span>
                                        <span className="badge bg-info-subtle text-info-emphasis border border-info px-2 py-1">
                                            <i className="bi bi-eye-fill me-1"></i>Chair & Secretariat View
                                        </span>
                                    </div>
                                )}
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={onClose} 
                                    aria-label="Close"
                                ></button>
                            </div>
                        </div>

                        {/* 1b. HEIGHTENED BOARD SCRUTINY BANNER & APPEAL DRAWER */}
                        {isAppealedProtocol && (
                            <div className="text-white px-4 py-2 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2 shadow-sm flex-shrink-0" style={{ backgroundColor: '#002147' }}>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="badge px-2.5 py-1 text-uppercase fw-bold" style={{ backgroundColor: '#c59b27', color: '#002147', fontSize: '0.75rem' }}>
                                        <i className="bi bi-shield-exclamation me-1"></i>Heightened Board Scrutiny
                                    </span>
                                    <span className="small text-white-50">
                                        Cycle {protocol?.current_cycle || 2} Re-deliberation: Formal Appeal lodged following Cycle 1 Disapproval.
                                    </span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAppealDrawerOpen(prev => !prev)}
                                        className="btn btn-sm btn-outline-light d-inline-flex align-items-center gap-1.5 py-1 px-3 rounded-pill"
                                        style={{ fontSize: '0.78rem', borderColor: 'rgba(255,255,255,0.4)' }}
                                    >
                                        <i className={`bi ${isAppealDrawerOpen ? 'bi-chevron-up' : 'bi-layout-split'}`}></i>
                                        <span>{isAppealDrawerOpen ? 'Hide Appeal Comparison' : '⚖️ Compare Appeal & Prior Disapproval'}</span>
                                        {latestAppeal?.corrective_documents?.length > 0 && (
                                            <span className="badge bg-warning text-dark rounded-pill ms-1">
                                                {latestAppeal.corrective_documents.length} docs
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Collapsible Side-by-Side Appeal Comparison Drawer */}
                        {isAppealedProtocol && isAppealDrawerOpen && (
                            <div className="border-bottom bg-light px-4 py-3 shadow-inner flex-shrink-0" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="small fw-bold text-uppercase text-secondary d-flex align-items-center gap-2">
                                        <i className="bi bi-columns-gap text-theme-primary"></i>
                                        Disapproval Reconsideration Analysis (Cycle 1 vs Cycle 2)
                                    </span>
                                    <button 
                                        type="button" 
                                        className="btn btn-link btn-sm text-muted text-decoration-none p-0"
                                        onClick={() => setIsAppealDrawerOpen(false)}
                                    >
                                        <i className="bi bi-x-lg me-1"></i>Dismiss
                                    </button>
                                </div>

                                <div className="row g-3">
                                    {/* Left Column: Prior Disapproval Directives */}
                                    <div className="col-12 col-md-6">
                                        <div className="card h-100 border-danger-subtle bg-danger-subtle bg-opacity-10 shadow-none">
                                            <div className="card-header py-2 px-3 bg-danger-subtle border-danger-subtle d-flex align-items-center justify-content-between">
                                                <span className="fw-bold small text-danger-emphasis d-flex align-items-center gap-1">
                                                    <i className="bi bi-x-octagon-fill text-danger"></i>
                                                    Cycle 1 Fatal Shortcomings & Directives
                                                </span>
                                                <span className="badge bg-danger text-white small">
                                                    {latestAppeal?.prior_disapproval_snapshot?.meeting_date 
                                                        ? `Deliberated: ${latestAppeal.prior_disapproval_snapshot.meeting_date}` 
                                                        : 'Prior Decision'}
                                                </span>
                                            </div>
                                            <div className="card-body p-3 small text-secondary">
                                                <div className="mb-2">
                                                    <strong className="text-dark d-block">Chair's Actionable Directives:</strong>
                                                    <p className="mb-0 text-dark-emphasis font-monospace bg-white p-2 rounded border border-danger-subtle" style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
                                                        {latestAppeal?.prior_disapproval_snapshot?.directives_for_revisions || 
                                                         protocol?.latest_consolidation?.directives_for_revisions || 
                                                         'Protocol was determined non-compliant with AdZU REC and PHREB ethical standards.'}
                                                    </p>
                                                </div>
                                                {latestAppeal?.prior_disapproval_snapshot?.summary_notes && (
                                                    <div>
                                                        <strong className="text-dark d-block">Summary Notes:</strong>
                                                        <span className="text-muted fst-italic" style={{ fontSize: '0.8rem' }}>
                                                            {latestAppeal.prior_disapproval_snapshot.summary_notes}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Proponent's Appeal Justification & Quick Launchers */}
                                    <div className="col-12 col-md-6">
                                        <div className="card h-100 border-primary-subtle bg-light shadow-none">
                                            <div className="card-header py-2 px-3 bg-primary-subtle border-primary-subtle d-flex align-items-center justify-content-between">
                                                <span className="fw-bold small text-primary-emphasis d-flex align-items-center gap-1">
                                                    <i className="bi bi-file-earmark-check-fill text-primary"></i>
                                                    Cycle 2 Reconsideration Justification
                                                </span>
                                                <span className="badge bg-primary text-white small">
                                                    {latestAppeal?.submitted_at ? `Lodged: ${new Date(latestAppeal.submitted_at).toLocaleDateString()}` : 'Cycle 2 Appeal'}
                                                </span>
                                            </div>
                                            <div className="card-body p-3 small">
                                                <h6 className="fw-bold text-dark mb-1" style={{ fontSize: '0.88rem' }}>
                                                    {latestAppeal?.appeal_title || 'Formal Petition for Reconsideration'}
                                                </h6>
                                                <p className="text-secondary mb-3 bg-white p-2 rounded border" style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', maxHeight: '110px', overflowY: 'auto' }}>
                                                    {latestAppeal?.appeal_justification || 'Proponent submitted formal corrective safeguards and restructured protocol methodology.'}
                                                </p>

                                                {/* Quick-Launch Corrective Documents */}
                                                {Array.isArray(latestAppeal?.corrective_documents) && latestAppeal.corrective_documents.length > 0 && (
                                                    <div>
                                                        <div className="text-muted fw-bold mb-1 d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                                                            <i className="bi bi-folder-check text-theme-primary"></i>
                                                            LAUNCH CORRECTIVE EVIDENCE IN LEFT VIEWER:
                                                        </div>
                                                        <div className="d-flex flex-wrap gap-1">
                                                            {latestAppeal.corrective_documents.map((cd, idx) => {
                                                                const cat = DOCUMENT_CATEGORIES[cd.category] || DOCUMENT_CATEGORIES.other_supporting;
                                                                const isSelected = selectedDoc?.savedPath === cd.savedPath;
                                                                const matchedDoc = protocolDocuments.find(d => d.savedPath === cd.savedPath) || cd;

                                                                return (
                                                                    <button
                                                                        key={idx}
                                                                        type="button"
                                                                        onClick={() => setSelectedDoc(matchedDoc)}
                                                                        className={`btn btn-sm rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1 transition-all ${
                                                                            isSelected
                                                                                ? 'btn-theme-primary text-white shadow-xs fw-bold'
                                                                                : 'btn-outline-secondary bg-white text-dark'
                                                                        }`}
                                                                        style={{ fontSize: '0.75rem', maxWidth: '240px' }}
                                                                        title={`Preview ${cd.name} in document viewer`}
                                                                    >
                                                                        <i className={`bi ${cat.icon}`}></i>
                                                                        <span className="text-truncate">{cd.name}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. MODAL BODY: DUAL SPLIT-PANE WORKSPACE */}
                        <div className="modal-body p-0 flex-grow-1 overflow-hidden">
                            <div className="row g-0 h-100">

                                {/* LEFT PANE (50%): PROTOCOL DOCUMENT WORKSPACE */}
                                <div className="col-12 col-lg-6 h-100 d-flex flex-column border-end bg-body-tertiary overflow-hidden">
                                    
                                    {/* Document Header & File Selector */}
                                    <div className="p-3 bg-white border-bottom flex-shrink-0">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="fw-bold small text-uppercase text-secondary d-flex align-items-center gap-2">
                                                <i className="bi bi-folder2-open text-theme-primary fs-5"></i>
                                                Protocol Submissions ({protocolDocuments.length})
                                                {isAppealedProtocol && (
                                                    <span className="badge bg-warning text-dark px-2 py-0.5 small">
                                                        Cycle 2 Appeal
                                                    </span>
                                                )}
                                            </span>
                                            {selectedDoc && (
                                                <div className="d-flex align-items-center gap-1">
                                                    <a 
                                                        href={resolveFileUrl(selectedDoc.savedPath)} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 px-2 py-1"
                                                        title="Open in new window"
                                                    >
                                                        <i className="bi bi-box-arrow-up-right"></i>
                                                        <span className="d-none d-sm-inline">New Tab</span>
                                                    </a>
                                                    <a 
                                                        href={resolveFileUrl(selectedDoc.savedPath)} 
                                                        download 
                                                        className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 px-2 py-1"
                                                        title="Download file"
                                                    >
                                                        <i className="bi bi-download"></i>
                                                        <span className="d-none d-sm-inline">Download</span>
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        {/* Horizontal Document Selection Carousel / Pills */}
                                        <div className="d-flex gap-2 overflow-x-auto pb-1" style={{ whiteSpace: 'nowrap' }}>
                                            {protocolDocuments.map((doc, idx) => {
                                                const cat = DOCUMENT_CATEGORIES[doc.category] || DOCUMENT_CATEGORIES.other_supporting;
                                                const isSelected = selectedDoc?.savedPath === doc.savedPath;
                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setSelectedDoc(doc)}
                                                        className={`btn btn-sm text-truncate rounded-pill px-3 py-1 d-inline-flex align-items-center gap-2 transition-all ${
                                                            isSelected 
                                                                ? 'btn-theme-primary text-white shadow-sm' 
                                                                : 'btn-outline-secondary bg-white text-dark'
                                                        }`}
                                                        style={{ maxWidth: '240px' }}
                                                        title={doc.name}
                                                    >
                                                        {doc.isAppealDoc && (
                                                            <span className="badge bg-warning text-dark px-1.5 py-0.5 fw-bold" style={{ fontSize: '0.65rem' }}>
                                                                C2
                                                            </span>
                                                        )}
                                                        <i className={`bi ${cat.icon}`}></i>
                                                        <span className="text-truncate">{doc.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Document Viewer Canvas (Independent Scroll / PDF iFrame) */}
                                    <div className="flex-grow-1 bg-secondary bg-opacity-10 position-relative overflow-hidden d-flex flex-column">
                                        {selectedDoc ? (
                                            <div className="w-100 h-100 d-flex flex-column">
                                                <div className="bg-light border-bottom p-2 px-3 d-flex justify-content-between align-items-center flex-shrink-0">
                                                    <div className="text-truncate d-flex align-items-center gap-2">
                                                        <span className={`badge ${DOCUMENT_CATEGORIES[selectedDoc.category]?.badgeClass || 'bg-secondary'}`}>
                                                            {DOCUMENT_CATEGORIES[selectedDoc.category]?.label || 'Document'}
                                                        </span>
                                                        <span className="fw-semibold text-dark text-truncate small">
                                                            {selectedDoc.name}
                                                        </span>
                                                        <span className="text-muted font-monospace small">
                                                            ({formatBytes(selectedDoc.size)})
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1 w-100 h-100 bg-white overflow-hidden position-relative">
                                                    {(() => {
                                                        const docPathLower = (selectedDoc.name || selectedDoc.savedPath || '').toLowerCase();
                                                        const isPdf = docPathLower.endsWith('.pdf');
                                                        const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(docPathLower);
                                                        const isWord = /\.(docx?)$/i.test(docPathLower);

                                                        if (isPdf) {
                                                            return (
                                                                <iframe 
                                                                    src={resolveFileUrl(selectedDoc.savedPath)} 
                                                                    className="w-100 h-100 border-0" 
                                                                    title="Protocol Document Preview"
                                                                />
                                                            );
                                                        }

                                                        if (isImage) {
                                                            return (
                                                                <div className="w-100 h-100 d-flex align-items-center justify-content-center p-3 bg-light overflow-auto">
                                                                    <img 
                                                                        src={resolveFileUrl(selectedDoc.savedPath)} 
                                                                        alt={selectedDoc.name} 
                                                                        className="img-fluid rounded border shadow-sm"
                                                                        style={{ maxHeight: '100%', objectFit: 'contain' }}
                                                                    />
                                                                </div>
                                                            );
                                                        }

                                                        // Non-inline renderable files (DOCX, XLSX, etc.)
                                                        const companionPdf = protocolDocuments.find(d => (d.name || d.savedPath || '').toLowerCase().endsWith('.pdf'));

                                                        return (
                                                            <div className="w-100 h-100 d-flex align-items-center justify-content-center p-4 bg-light overflow-auto">
                                                                <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white" style={{ maxWidth: '480px' }}>
                                                                    <div className="mb-3">
                                                                        <span className="d-inline-flex align-items-center justify-content-center rounded-circle p-3" style={{ backgroundColor: isWord ? '#e8f0fe' : '#f1f3f4', width: '72px', height: '72px' }}>
                                                                            <i className={`bi ${isWord ? 'bi-file-earmark-word-fill text-primary' : 'bi-file-earmark-arrow-down-fill text-secondary'} fs-1`}></i>
                                                                        </span>
                                                                    </div>
                                                                    <h6 className="fw-bold text-dark mb-1 text-truncate" title={selectedDoc.name}>
                                                                        {selectedDoc.name}
                                                                    </h6>
                                                                    <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                                                                        <span className={`badge ${DOCUMENT_CATEGORIES[selectedDoc.category]?.badgeClass || 'bg-secondary'}`}>
                                                                            {DOCUMENT_CATEGORIES[selectedDoc.category]?.label || 'Document'}
                                                                        </span>
                                                                        <span className="text-muted small">({formatBytes(selectedDoc.size)})</span>
                                                                    </div>

                                                                    <div className="alert alert-light border small text-muted text-start mb-4 shadow-xs">
                                                                        <div className="d-flex align-items-start gap-2">
                                                                            <i className="bi bi-info-circle-fill text-primary mt-1"></i>
                                                                            <div>
                                                                                <strong>{isWord ? 'Microsoft Word Document (.docx)' : 'Offline File Attachment'}:</strong> Web browsers do not render Word files inline inside web pages. To prevent unwanted automatic downloads, view the PDF companion below or download this file to open in Office.
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="d-flex flex-column gap-2">
                                                                        <a 
                                                                            href={resolveFileUrl(selectedDoc.savedPath)} 
                                                                            download 
                                                                            className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2 py-2 px-3 fw-semibold shadow-sm"
                                                                        >
                                                                            <i className="bi bi-download"></i>
                                                                            <span>Download {selectedDoc.name}</span>
                                                                        </a>

                                                                        {companionPdf && companionPdf.savedPath !== selectedDoc.savedPath && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setSelectedDoc(companionPdf)}
                                                                                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center gap-2 py-2"
                                                                            >
                                                                                <i className="bi bi-file-earmark-pdf-fill text-danger"></i>
                                                                                <span>Switch to PDF Copy ({companionPdf.name})</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="m-auto text-center p-5 text-muted">
                                                <i className="bi bi-file-earmark-x fs-1 text-secondary opacity-50"></i>
                                                <h6 className="mt-2 fw-semibold">No Documents Available</h6>
                                                <p className="small mb-0">No document attachments were found for this protocol.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Collapsible Synopsis & Objectives Drawer */}
                                    <div className="border-top bg-white flex-shrink-0">
                                        <div 
                                            className="p-2 px-3 d-flex justify-content-between align-items-center cursor-pointer bg-light border-bottom"
                                            onClick={() => setIsSynopsisOpen(!isSynopsisOpen)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <span className="fw-bold small text-dark d-flex align-items-center gap-2">
                                                <i className="bi bi-info-circle-fill text-theme-primary"></i>
                                                Study Synopsis & Ethical Considerations
                                            </span>
                                            <i className={`bi bi-chevron-${isSynopsisOpen ? 'down' : 'up'} text-secondary`}></i>
                                        </div>
                                        {isSynopsisOpen && (
                                            <div className="p-3 bg-white" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                                                <div className="row g-2">
                                                    <div className="col-12 col-md-8">
                                                        <span className="text-secondary fw-semibold small d-block mb-1">Study Objectives:</span>
                                                        <p className="small text-dark mb-0 lh-base">
                                                            {protocol?.form_data?.description_objectives || 'No specific description/objectives provided in application snapshot.'}
                                                        </p>
                                                    </div>
                                                    <div className="col-12 col-md-4 border-start-md ps-md-3">
                                                        <span className="text-secondary fw-semibold small d-block mb-1">Ethical Factors:</span>
                                                        <div className="d-flex flex-column gap-1 small">
                                                            <div><strong>Vulnerable Groups:</strong> {protocol?.form_data?.risk_vulnerable_groups || 'None reported'}</div>
                                                            <div><strong>Technical Review:</strong> {protocol?.form_data?.compliance_technical_reviewed || 'No'}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </div>

                                {/* RIGHT PANE (50%): EVALUATION FORMS & CHAIR OVERSIGHT */}
                                <div className="col-12 col-lg-6 h-100 d-flex flex-column bg-white overflow-hidden">
                                    
                                    {/* Top Control Bar: Chair Oversight Ribbon OR Reviewer Tabs */}
                                    <div className="p-3 bg-white border-bottom flex-shrink-0">

                                        {/* Chair / Secretariat Oversight Banner & Reviewer Selection Ribbon */}
                                        {isOversightMode && (
                                            <div className="mb-3">
                                                {protocol?.reviews_completed === protocol?.reviews_total && protocol?.reviews_total > 0 ? (
                                                    <div className="alert alert-success border-success-subtle py-2 px-3 rounded-3 d-flex align-items-center justify-content-between mb-3 shadow-xs">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span className="fs-4">🎉</span>
                                                            <div>
                                                                <strong className="text-success-emphasis d-block small">
                                                                    All Committee Reviews Completed ({protocol?.reviews_completed}/{protocol?.reviews_total})
                                                                </strong>
                                                                <span className="text-secondary" style={{ fontSize: '0.78rem' }}>
                                                                    Peer evaluations are finalized. Ready for ethical synthesis and Chair consolidation.
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className="badge bg-success font-monospace">Consolidation Phase</span>
                                                    </div>
                                                ) : (
                                                    <div className="alert alert-info py-2 px-3 d-flex align-items-center justify-content-between mb-2 rounded-3 border-info-subtle">
                                                        <div className="d-flex align-items-center gap-2 small">
                                                            <i className="bi bi-shield-lock-fill fs-5 text-info"></i>
                                                            <div>
                                                                <strong>Chair / Secretariat Monitoring Mode:</strong>
                                                                <span className="d-block text-secondary" style={{ fontSize: '0.78rem' }}>
                                                                    Review progress: {protocol?.reviews_completed || 0} of {protocol?.reviews_total || 0} completed. Select any reviewer to inspect their evaluation.
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className="badge bg-secondary font-monospace">🔒 Locked</span>
                                                    </div>
                                                )}

                                                <span className="text-secondary fw-bold small text-uppercase d-block mb-2">
                                                    Assigned Committee Reviewers ({assignedReviewers.length})
                                                </span>

                                                <div className="d-flex gap-2 overflow-x-auto pb-1">
                                                    {assignedReviewers.map((rev) => {
                                                        const isSelected = String(rev.reviewer_id) === String(selectedReviewerId);
                                                        const isDone = rev.review_status === 'Completed';
                                                        return (
                                                            <button
                                                                key={rev.reviewer_id}
                                                                type="button"
                                                                onClick={() => setSelectedReviewerId(rev.reviewer_id)}
                                                                className={`btn btn-sm rounded-3 p-2 text-start flex-shrink-0 border transition-all ${
                                                                    isSelected 
                                                                        ? 'border-primary bg-primary-subtle bg-opacity-25 shadow-xs' 
                                                                        : 'border-secondary-subtle bg-light'
                                                                }`}
                                                                style={{ minWidth: '180px' }}
                                                            >
                                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                                    <span className="badge bg-white text-dark border font-monospace" style={{ fontSize: '0.68rem' }}>
                                                                        {rev.reviewer_role}
                                                                    </span>
                                                                    {isDone ? (
                                                                        <span className={`badge ${
                                                                            rev.recommendation === 'Approved' ? 'bg-success text-white' :
                                                                            rev.recommendation?.includes('Minor') ? 'bg-warning text-dark' :
                                                                            rev.recommendation?.includes('Major') ? 'bg-danger text-white' :
                                                                            rev.recommendation === 'Disapproved' ? 'bg-dark text-white' :
                                                                            'bg-success text-white'
                                                                        } py-0 px-2`} style={{ fontSize: '0.68rem' }}>
                                                                            <i className="bi bi-check-circle-fill me-1"></i>
                                                                            {rev.recommendation || 'Done'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning py-0 px-2" style={{ fontSize: '0.68rem' }}>
                                                                            <i className="bi bi-hourglass-split me-1"></i>In Progress
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="fw-bold text-dark text-truncate small">{rev.reviewer_name}</div>
                                                                <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                                                                    {isDone && rev.completed_date ? `Submitted ${rev.completed_date}` : `Assigned ${rev.assigned_date || 'Recently'}`}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Submission Status Banner */}
                                        {activeReviewRecord?.review_status === 'Completed' ? (
                                            <div className="alert alert-success border-success-subtle py-2 px-3 rounded-3 d-flex justify-content-between align-items-center mb-3 shadow-xs">
                                                <div className="d-flex align-items-center gap-2">
                                                    <i className="bi bi-check-circle-fill text-success fs-5"></i>
                                                    <div>
                                                        <span className="fw-bold text-success-emphasis small d-block">
                                                            Official Evaluation Submitted
                                                        </span>
                                                        <span className="text-secondary" style={{ fontSize: '0.78rem' }}>
                                                            Completed on {activeReviewRecord.completed_date || 'Today'} • Recommendation: 
                                                            <strong className="text-dark ms-1">{activeReviewRecord.recommendation || 'Approved'}</strong>
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="badge bg-success px-2 py-1 small">
                                                    <i className="bi bi-shield-check me-1"></i>Locked
                                                </span>
                                            </div>
                                        ) : isOversightMode ? (
                                            <div className="alert alert-secondary border py-2 px-3 rounded-3 d-flex justify-content-between align-items-center mb-3">
                                                <div className="d-flex align-items-center gap-2 small">
                                                    <i className="bi bi-clock-history text-secondary fs-5"></i>
                                                    <span>This reviewer has not submitted their official evaluation yet. Showing live workspace draft.</span>
                                                </div>
                                                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning">Pending</span>
                                            </div>
                                        ) : null}

                                        {/* Reviewer Notice for Non-Primary Reviewers */}
                                        {isNonPrimaryReviewer && (
                                            <div className="alert alert-secondary py-2 px-3 mb-2 rounded-3 small d-flex align-items-center gap-2">
                                                <i className="bi bi-info-circle-fill text-theme-primary fs-5"></i>
                                                <div>
                                                    <strong>Role Assignment:</strong> Non-Primary Reviewers evaluate <strong>Form 12 (Informed Consent)</strong> exclusively. Form 11 is assigned to Primary Reviewers.
                                                </div>
                                            </div>
                                        )}

                                        {/* Form Navigation Tabs */}
                                        <div className="d-flex justify-content-between align-items-center">
                                            <ul className="nav nav-pills gap-2" role="tablist">
                                                {activeCanViewForm11 && (
                                                    <li className="nav-item">
                                                        <button
                                                            type="button"
                                                            className={`nav-link btn-sm rounded-pill px-3 fw-bold d-inline-flex align-items-center gap-2 ${
                                                                activeFormTab === 'form11' 
                                                                    ? 'active bg-theme-primary text-white shadow-sm' 
                                                                    : 'text-secondary bg-light'
                                                            }`}
                                                            onClick={() => setActiveFormTab('form11')}
                                                        >
                                                            <i className="bi bi-file-earmark-ruled"></i>
                                                            Form 11 (Protocol Evaluation)
                                                        </button>
                                                    </li>
                                                )}

                                                <li className="nav-item">
                                                    <button
                                                        type="button"
                                                        className={`nav-link btn-sm rounded-pill px-3 fw-bold d-inline-flex align-items-center gap-2 ${
                                                            activeFormTab === 'form12' 
                                                                ? 'active bg-theme-primary text-white shadow-sm' 
                                                                : 'text-secondary bg-light'
                                                        }`}
                                                        onClick={() => setActiveFormTab('form12')}
                                                    >
                                                        <i className="bi bi-card-checklist"></i>
                                                        Form 12 (Informed Consent)
                                                    </button>
                                                </li>
                                            </ul>

                                            {lastSavedTime && (
                                                <small className="text-muted fst-italic d-none d-sm-inline">
                                                    Draft saved {lastSavedTime}
                                                </small>
                                            )}
                                        </div>
                                    </div>

                                    {/* Independent Scroll Container for Form Questions */}
                                    <div className="flex-grow-1 overflow-y-auto p-4 bg-body-tertiary">

                                        {/* TAB CONTENT: FORM 11 (PROTOCOL EVALUATION WORKSHEET) */}
                                        {activeFormTab === 'form11' && activeCanViewForm11 && (
                                            <div className="d-flex flex-column gap-4">

                                                {/* Block 1 & 2: Metadata & Protocol Information */}
                                                <div className="card border-0 shadow-sm rounded-3">
                                                    <div className="card-header bg-white border-bottom py-2 px-3 fw-bold text-theme-primary small text-uppercase">
                                                        <i className="bi bi-info-square me-2"></i>Block 1 & 2: Evaluation Metadata
                                                    </div>
                                                    <div className="card-body p-3 small">
                                                        <div className="row g-2">
                                                            <div className="col-6 col-md-4">
                                                                <span className="text-muted d-block">REC Form No:</span>
                                                                <strong>Form 11 (Rev 16)</strong>
                                                            </div>
                                                            <div className="col-6 col-md-4">
                                                                <span className="text-muted d-block">Date of Effectivity:</span>
                                                                <strong>July 9, 2026</strong>
                                                            </div>
                                                            <div className="col-12 col-md-4">
                                                                <span className="text-muted d-block">Assigned Evaluator:</span>
                                                                <strong>{form11Data.protocolInformation.reviewer || adminName}</strong>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Block 3: Guide Questions */}
                                                <div>
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <h6 className="fw-bold text-dark text-uppercase mb-0">
                                                            <i className="bi bi-question-circle-fill text-theme-primary me-2"></i>
                                                            Block 3. Guide Questions
                                                        </h6>
                                                        <span className="badge bg-light text-secondary border">14 Core Assessment Items</span>
                                                    </div>

                                                    <div className="d-flex flex-column gap-3">

                                                        {/* Question 1: Social Value */}
                                                        <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                                                            <label className="fw-bold text-dark small mb-1">
                                                                1. Does the study have social value?
                                                            </label>
                                                            <small className="text-muted mb-2 d-block">
                                                                (e.g. scientific value, relevance to national / community needs)
                                                            </small>
                                                            <div className="d-flex gap-2 mb-2 flex-wrap">
                                                                {["Unable To Assess", "Yes", "No"].map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        disabled={isReadOnly}
                                                                        onClick={() => handleForm11QuestionChange('socialValue', opt)}
                                                                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                            form11Data.guideQuestions.socialValue.response === opt
                                                                                ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                : 'btn-outline-secondary'
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <textarea
                                                                rows="2"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="Add reviewer comments or observations for social value..."
                                                                value={form11Data.guideQuestions.socialValue.comment}
                                                                onChange={(e) => handleForm11CommentChange('socialValue', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* Question 2: Study Background */}
                                                        <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                                                            <label className="fw-bold text-dark small mb-1">
                                                                2. Is the study background adequate?
                                                            </label>
                                                            <div className="d-flex gap-2 mb-2 flex-wrap">
                                                                {["Unable To Assess", "Yes", "No"].map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        disabled={isReadOnly}
                                                                        onClick={() => handleForm11QuestionChange('studyBackgroundAdequate', opt)}
                                                                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                            form11Data.guideQuestions.studyBackgroundAdequate.response === opt
                                                                                ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                : 'btn-outline-secondary'
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <textarea
                                                                rows="2"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="Reviewer comments on background and theoretical rationale..."
                                                                value={form11Data.guideQuestions.studyBackgroundAdequate.comment}
                                                                onChange={(e) => handleForm11CommentChange('studyBackgroundAdequate', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* Question 3: Research Questions Supported by Lit */}
                                                        <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                                                            <label className="fw-bold text-dark small mb-1">
                                                                3. Are the research questions supported by the Review of Literature?
                                                            </label>
                                                            <div className="d-flex gap-2 mb-2 flex-wrap">
                                                                {["Unable To Assess", "Yes", "No"].map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        disabled={isReadOnly}
                                                                        onClick={() => handleForm11QuestionChange('researchQuestionsSupportedByLiterature', opt)}
                                                                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                            form11Data.guideQuestions.researchQuestionsSupportedByLiterature.response === opt
                                                                                ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                : 'btn-outline-secondary'
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <textarea
                                                                rows="2"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="Reviewer comments..."
                                                                value={form11Data.guideQuestions.researchQuestionsSupportedByLiterature.comment}
                                                                onChange={(e) => handleForm11CommentChange('researchQuestionsSupportedByLiterature', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* Question 4: SMART Objectives */}
                                                        <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                                                            <label className="fw-bold text-dark small mb-1">
                                                                4. Are the study objectives Specific, Measurable, Attainable, Realistic, and Time-bound?
                                                            </label>
                                                            <div className="d-flex gap-2 mb-2 flex-wrap">
                                                                {["Unable To Assess", "Yes", "No"].map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        disabled={isReadOnly}
                                                                        onClick={() => handleForm11QuestionChange('studyObjectivesSmart', opt)}
                                                                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                            form11Data.guideQuestions.studyObjectivesSmart.response === opt
                                                                                ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                : 'btn-outline-secondary'
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <textarea
                                                                rows="2"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="Reviewer comments on SMART objectives..."
                                                                value={form11Data.guideQuestions.studyObjectivesSmart.comment}
                                                                onChange={(e) => handleForm11CommentChange('studyObjectivesSmart', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* Question 5: Research Design Appropriate (Composite 4-part sub-items) */}
                                                        <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-start border-4 border-primary">
                                                            <label className="fw-bold text-dark small mb-2 d-block">
                                                                5. Is the research design appropriate?
                                                            </label>

                                                            <div className="d-flex flex-column gap-2 bg-light p-3 rounded mb-2">
                                                                {[
                                                                    { key: 'populationIdentifiedAndDefined', label: 'a. Is the population identified and defined?' },
                                                                    { key: 'selectionOfParticipantsDescribed', label: 'b. Is the selection of study participants described?' },
                                                                    { key: 'sampleSizeJustified', label: 'c. Is the sample size justified?' },
                                                                    { key: 'dataAnalysisPlanAndDummyTables', label: 'd. Is the plan for data analysis described and are there dummy tables?' }
                                                                ].map(sub => (
                                                                    <div key={sub.key} className="d-flex justify-content-between align-items-center flex-wrap gap-2 py-1 border-bottom border-light-subtle">
                                                                        <span className="small text-dark fw-medium">{sub.label}</span>
                                                                        <div className="btn-group btn-group-sm">
                                                                            {["Unable To Assess", "Yes", "No"].map(opt => (
                                                                                <button
                                                                                    key={opt}
                                                                                    type="button"
                                                                                    disabled={isReadOnly}
                                                                                    onClick={() => handleForm11CompositeChange(sub.key, opt)}
                                                                                    className={`btn btn-sm ${
                                                                                        form11Data.guideQuestions.researchDesignAppropriate[sub.key]?.response === opt
                                                                                            ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                            : 'btn-outline-secondary'
                                                                                    }`}
                                                                                >
                                                                                    {opt}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <textarea
                                                                rows="2"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="Overall research methodology comments..."
                                                                value={form11Data.guideQuestions.researchDesignAppropriate.comment}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setForm11Data(prev => ({
                                                                        ...prev,
                                                                        guideQuestions: {
                                                                            ...prev.guideQuestions,
                                                                            researchDesignAppropriate: {
                                                                                ...prev.guideQuestions.researchDesignAppropriate,
                                                                                comment: val
                                                                            }
                                                                        }
                                                                    }));
                                                                }}
                                                            />
                                                        </div>

                                                        {/* Question 6: Human Participants Required */}
                                                        <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                                                            <label className="fw-bold text-dark small mb-1">
                                                                6. Does the research need to be carried out with human participants?
                                                            </label>
                                                            <div className="d-flex gap-2 mb-2 flex-wrap">
                                                                {["Unable To Assess", "Yes", "No"].map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        disabled={isReadOnly}
                                                                        onClick={() => handleForm11QuestionChange('humanParticipantsRequired', opt)}
                                                                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                            form11Data.guideQuestions.humanParticipantsRequired.response === opt
                                                                                ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                : 'btn-outline-secondary'
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <textarea
                                                                rows="2"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="Reviewer comments..."
                                                                value={form11Data.guideQuestions.humanParticipantsRequired.comment}
                                                                onChange={(e) => handleForm11CommentChange('humanParticipantsRequired', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* Question 7: Vulnerability Issue */}
                                                        <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                                                            <label className="fw-bold text-dark small mb-1">
                                                                7. Does the study involve vulnerable groups?
                                                            </label>
                                                            <div className="d-flex gap-2 mb-2 flex-wrap">
                                                                {["Unable To Assess", "Yes", "No"].map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        disabled={isReadOnly}
                                                                        onClick={() => handleForm11QuestionChange('vulnerabilityIssue', opt)}
                                                                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                            form11Data.guideQuestions.vulnerabilityIssue.response === opt
                                                                                ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                : 'btn-outline-secondary'
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <textarea
                                                                rows="2"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="Reviewer comments on vulnerable groups..."
                                                                value={form11Data.guideQuestions.vulnerabilityIssue.comment}
                                                                onChange={(e) => handleForm11CommentChange('vulnerabilityIssue', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* Question 8: Vulnerability Mechanisms in Place */}
                                                        <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                                                            <label className="fw-bold text-dark small mb-1">
                                                                8. Are appropriate mechanisms/interventions in place to address vulnerability?
                                                            </label>
                                                            <div className="d-flex gap-2 mb-2 flex-wrap">
                                                                {["Unable To Assess", "Yes", "No"].map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        disabled={isReadOnly}
                                                                        onClick={() => handleForm11QuestionChange('vulnerabilityMechanismsInPlace', opt)}
                                                                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                            form11Data.guideQuestions.vulnerabilityMechanismsInPlace.response === opt
                                                                                ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                : 'btn-outline-secondary'
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <textarea
                                                                rows="2"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="Reviewer comments on vulnerability protections..."
                                                                value={form11Data.guideQuestions.vulnerabilityMechanismsInPlace.comment}
                                                                onChange={(e) => handleForm11CommentChange('vulnerabilityMechanismsInPlace', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* Question 9 & 10: Risks & Risk Mitigation */}
                                                        <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                                                            <label className="fw-bold text-dark small mb-1">
                                                                9. Are there risks / probable harms to human participants?
                                                            </label>
                                                            <div className="d-flex gap-2 mb-2 flex-wrap">
                                                                {["Unable To Assess", "Yes", "No"].map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        disabled={isReadOnly}
                                                                        onClick={() => handleForm11QuestionChange('risksToParticipants', opt)}
                                                                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                            form11Data.guideQuestions.risksToParticipants.response === opt
                                                                                ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                : 'btn-outline-secondary'
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <textarea
                                                                rows="2"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm mb-3"
                                                                placeholder="Comments on risks and probable harms..."
                                                                value={form11Data.guideQuestions.risksToParticipants.comment}
                                                                onChange={(e) => handleForm11CommentChange('risksToParticipants', e.target.value)}
                                                            />

                                                            <label className="fw-bold text-dark small mb-1">
                                                                10. Are there measures to mitigate the risks?
                                                            </label>
                                                            <div className="d-flex gap-2 mb-2 flex-wrap">
                                                                {["Unable To Assess", "Yes", "No"].map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        disabled={isReadOnly}
                                                                        onClick={() => handleForm11QuestionChange('riskMitigationMeasures', opt)}
                                                                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                            form11Data.guideQuestions.riskMitigationMeasures.response === opt
                                                                                ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                : 'btn-outline-secondary'
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <textarea
                                                                rows="2"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="Comments on risk mitigation and management..."
                                                                value={form11Data.guideQuestions.riskMitigationMeasures.comment}
                                                                onChange={(e) => handleForm11CommentChange('riskMitigationMeasures', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* Question 11: Informed Consent Adequate */}
                                                        <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                                                            <label className="fw-bold text-dark small mb-1">
                                                                11. Is the informed consent procedure / form adequate and culturally appropriate?
                                                            </label>
                                                            <div className="d-flex gap-2 mb-2 flex-wrap">
                                                                {["Unable To Assess", "Yes", "No"].map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        disabled={isReadOnly}
                                                                        onClick={() => handleForm11QuestionChange('informedConsentAdequate', opt)}
                                                                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                            form11Data.guideQuestions.informedConsentAdequate.response === opt
                                                                                ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                : 'btn-outline-secondary'
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <textarea
                                                                rows="2"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="Reviewer comments..."
                                                                value={form11Data.guideQuestions.informedConsentAdequate.comment}
                                                                onChange={(e) => handleForm11CommentChange('informedConsentAdequate', e.target.value)}
                                                            />
                                                        </div>

                                                        {/* Question 12, 13, 14: Qualifications, COI, Facilities */}
                                                        <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                                                            <label className="fw-bold text-dark small mb-1">
                                                                12. Are the investigators adequately trained and experienced?
                                                            </label>
                                                            <div className="d-flex gap-2 mb-3 flex-wrap">
                                                                {["Unable To Assess", "Yes", "No"].map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        disabled={isReadOnly}
                                                                        onClick={() => handleForm11QuestionChange('investigatorsAdequatelyTrained', opt)}
                                                                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                            form11Data.guideQuestions.investigatorsAdequatelyTrained.response === opt
                                                                                ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                : 'btn-outline-secondary'
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>

                                                            <label className="fw-bold text-dark small mb-1">
                                                                13. Is there a disclosure of conflict of interest?
                                                            </label>
                                                            <div className="d-flex gap-2 mb-3 flex-wrap">
                                                                {["Unable To Assess", "Yes", "No"].map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        disabled={isReadOnly}
                                                                        onClick={() => handleForm11QuestionChange('conflictOfInterestDisclosure', opt)}
                                                                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                            form11Data.guideQuestions.conflictOfInterestDisclosure.response === opt
                                                                                ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                : 'btn-outline-secondary'
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>

                                                            <label className="fw-bold text-dark small mb-1">
                                                                14. Are the research facilities adequate?
                                                            </label>
                                                            <div className="d-flex gap-2 mb-2 flex-wrap">
                                                                {["Unable To Assess", "Yes", "No"].map(opt => (
                                                                    <button
                                                                        key={opt}
                                                                        type="button"
                                                                        disabled={isReadOnly}
                                                                        onClick={() => handleForm11QuestionChange('researchFacilitiesAdequate', opt)}
                                                                        className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                            form11Data.guideQuestions.researchFacilitiesAdequate.response === opt
                                                                                ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                : 'btn-outline-secondary'
                                                                        }`}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Other Concerns */}
                                                        <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                                                            <label className="fw-bold text-dark small mb-1">
                                                                15. Are there any other ethical or procedural concerns in the study?
                                                            </label>
                                                            <textarea
                                                                rows="3"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="Enter any additional concerns or remarks..."
                                                                value={form11Data.guideQuestions.otherConcernsComment}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setForm11Data(prev => ({
                                                                        ...prev,
                                                                        guideQuestions: {
                                                                            ...prev.guideQuestions,
                                                                            otherConcernsComment: val
                                                                        }
                                                                    }));
                                                                }}
                                                            />
                                                        </div>

                                                    </div>
                                                </div>

                                                {/* Block 4: Recommendations */}
                                                <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-top border-4 border-theme-primary">
                                                    <h6 className="fw-bold text-dark text-uppercase mb-3">
                                                        <i className="bi bi-award-fill text-theme-primary me-2"></i>
                                                        Block 4. Evaluator Recommendation
                                                    </h6>
                                                    
                                                    <div className="mb-3">
                                                        <label className="fw-bold text-dark small mb-1">Official Decision:</label>
                                                        <select
                                                            className="form-select"
                                                            disabled={isReadOnly}
                                                            value={form11Data.recommendations.decision}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setForm11Data(prev => ({
                                                                    ...prev,
                                                                    recommendations: { ...prev.recommendations, decision: val }
                                                                }));
                                                            }}
                                                        >
                                                            <option value="Approved">Approved (No ethical changes required)</option>
                                                            <option value="Minor Revisions Required">Minor Revisions Required</option>
                                                            <option value="Major Revision Required">Major Revision Required</option>
                                                            <option value="Disapproved">Disapproved</option>
                                                        </select>
                                                    </div>

                                                    {form11Data.recommendations.decision === 'Minor Revisions Required' && (
                                                        <div className="mb-2">
                                                            <label className="small fw-semibold text-warning-emphasis">Minor Revisions Directives:</label>
                                                            <textarea
                                                                rows="3"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="List specific minor revisions for applicant compliance..."
                                                                value={form11Data.recommendations.minorRevisionsComments}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setForm11Data(prev => ({
                                                                        ...prev,
                                                                        recommendations: { ...prev.recommendations, minorRevisionsComments: val }
                                                                    }));
                                                                }}
                                                            />
                                                        </div>
                                                    )}

                                                    {form11Data.recommendations.decision === 'Major Revision Required' && (
                                                        <div className="mb-2">
                                                            <label className="small fw-semibold text-warning-emphasis">Major Revision Directives:</label>
                                                            <textarea
                                                                rows="3"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="List comprehensive major revisions requiring protocol resubmission..."
                                                                value={form11Data.recommendations.majorRevisionComments}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setForm11Data(prev => ({
                                                                        ...prev,
                                                                        recommendations: { ...prev.recommendations, majorRevisionComments: val }
                                                                    }));
                                                                }}
                                                            />
                                                        </div>
                                                    )}

                                                    {form11Data.recommendations.decision === 'Disapproved' && (
                                                        <div className="mb-2">
                                                            <label className="small fw-semibold text-danger">Reasons for Disapproval:</label>
                                                            <textarea
                                                                rows="3"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="State fundamental ethical/safety grounds for disapproval..."
                                                                value={form11Data.recommendations.disapprovedReasons}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setForm11Data(prev => ({
                                                                        ...prev,
                                                                        recommendations: { ...prev.recommendations, disapprovedReasons: val }
                                                                    }));
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                            </div>
                                        )}

                                        {/* TAB CONTENT: FORM 12 (INFORMED CONSENT EVALUATION)   */}
                                        {activeFormTab === 'form12' && (
                                            <div className="d-flex flex-column gap-4">

                                                {/* Block 1 & 2: Metadata */}
                                                <div className="card border-0 shadow-sm rounded-3">
                                                    <div className="card-header bg-white border-bottom py-2 px-3 fw-bold text-theme-primary small text-uppercase">
                                                        <i className="bi bi-info-square me-2"></i>Block 1 & 2: Form 12 Metadata
                                                    </div>
                                                    <div className="card-body p-3 small">
                                                        <div className="row g-2">
                                                            <div className="col-6 col-md-4">
                                                                <span className="text-muted d-block">REC Form No:</span>
                                                                <strong>Form 12 (Rev 16)</strong>
                                                            </div>
                                                            <div className="col-6 col-md-4">
                                                                <span className="text-muted d-block">Scope:</span>
                                                                <strong>Informed Consent / Assent</strong>
                                                            </div>
                                                            <div className="col-12 col-md-4">
                                                                <span className="text-muted d-block">Assigned Evaluator:</span>
                                                                <strong>{form12Data.protocolInformation.reviewer || adminName}</strong>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Block 3.1: Informed Consent Necessity */}
                                                <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                                                    <label className="fw-bold text-dark small mb-1">
                                                        1. Is it necessary to seek the informed consent of the participants?
                                                    </label>
                                                    <div className="d-flex gap-2 mb-2 flex-wrap">
                                                        {["Unable To Assess", "Yes", "No"].map(opt => (
                                                            <button
                                                                key={opt}
                                                                type="button"
                                                                disabled={isReadOnly}
                                                                onClick={() => {
                                                                    setForm12Data(prev => ({
                                                                        ...prev,
                                                                        guideQuestions: {
                                                                            ...prev.guideQuestions,
                                                                            informedConsentNecessity: {
                                                                                ...prev.guideQuestions.informedConsentNecessity,
                                                                                necessaryToSeekConsent: opt
                                                                            }
                                                                        }
                                                                    }));
                                                                }}
                                                                className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                    form12Data.guideQuestions.informedConsentNecessity.necessaryToSeekConsent === opt
                                                                        ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                        : 'btn-outline-secondary'
                                                                }`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {form12Data.guideQuestions.informedConsentNecessity.necessaryToSeekConsent === 'No' && (
                                                        <div className="mt-2">
                                                            <label className="small text-danger fw-semibold">If NO, please explain grounds for waiver of consent:</label>
                                                            <textarea
                                                                rows="2"
                                                                disabled={isReadOnly}
                                                                className="form-control form-control-sm"
                                                                placeholder="Explain why waiver or alteration of consent is justified..."
                                                                value={form12Data.guideQuestions.informedConsentNecessity.ifNoExplanation}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setForm12Data(prev => ({
                                                                        ...prev,
                                                                        guideQuestions: {
                                                                            ...prev.guideQuestions,
                                                                            informedConsentNecessity: {
                                                                                ...prev.guideQuestions.informedConsentNecessity,
                                                                                ifNoExplanation: val
                                                                            }
                                                                        }
                                                                    }));
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Block 3.2: Sufficient Information Checklist */}
                                                <div className="card border-0 shadow-sm rounded-3 p-3 bg-white">
                                                    <h6 className="fw-bold text-dark small text-uppercase mb-1">
                                                        2. Are the participants provided with sufficient information regarding:
                                                    </h6>
                                                    <small className="text-muted d-block mb-3">
                                                        Evaluate each statutory consent disclosure element in the uploaded consent forms.
                                                    </small>

                                                    <div className="d-flex flex-column gap-2">
                                                        {[
                                                            { key: 'purposeOfStudy', title: 'Purpose of the study?', type: 'yesNo' },
                                                            { key: 'expectedDurationOfParticipation', title: 'Expected duration of participation?', type: 'yesNo' },
                                                            { key: 'proceduresToBeCarriedOut', title: 'Procedures to be carried out?', type: 'yesNo' },
                                                            { key: 'discomfortsAndInconveniences', title: 'Discomforts and inconveniences?', type: 'yesNo' },
                                                            { key: 'risksIncludingDiscrimination', title: 'Risks (including possible discrimination)?', type: 'yesNo' },
                                                            { key: 'randomAssignmentToTrialTreatments', title: 'Random assignment to trial treatments?', type: 'yesNoNa' },
                                                            { key: 'benefitsToParticipants', title: 'Benefits to the participants?', type: 'yesNo' },
                                                            { key: 'alternativeTreatmentsOrProcedures', title: 'Alternative treatments / procedures?', type: 'yesNoNa' },
                                                            { key: 'compensationOrMedicalTreatmentsForInjury', title: 'Compensation and/or medical treatments in case of injury?', type: 'yesNo' },
                                                            { key: 'contactPersonForQuestionsAndInjuryAssistance', title: 'Who to contact for questions or research-related injury?', type: 'yesNo' },
                                                            { key: 'refusalOrDiscontinuanceWithoutPenalty', title: 'Refusal to participate or discontinuance without penalty?', type: 'yesNo' },
                                                            { key: 'extentOfConfidentiality', title: 'Extent of confidentiality and privacy?', type: 'yesNo' },
                                                            { key: 'writtenInSimpleUnderstandableLanguage', title: 'Written or presented in simple, understandable language?', type: 'yesNo' },
                                                            { key: 'adequateProcessForVoluntaryConsent', title: 'Adequate process for ensuring consent is truly voluntary?', type: 'yesNo' }
                                                        ].map((item, idx) => {
                                                            const currentVal = form12Data.guideQuestions.sufficientInformationChecklist[item.key];
                                                            const options = item.type === 'yesNoNa' ? ['Not Applicable', 'Yes', 'No'] : ['Yes', 'No'];
                                                            return (
                                                                <div key={item.key} className="d-flex justify-content-between align-items-center flex-wrap gap-2 p-2 bg-light rounded-2 border">
                                                                    <span className="small text-dark fw-medium" style={{ maxWidth: '70%' }}>
                                                                        {idx + 1}. {item.title}
                                                                    </span>
                                                                    <div className="btn-group btn-group-sm">
                                                                        {options.map(opt => (
                                                                            <button
                                                                                key={opt}
                                                                                type="button"
                                                                                disabled={isReadOnly}
                                                                                onClick={() => handleForm12ChecklistChange(item.key, opt)}
                                                                                className={`btn btn-sm ${
                                                                                    currentVal === opt
                                                                                        ? (opt === 'Yes' ? 'btn-success' : opt === 'No' ? 'btn-danger' : 'btn-secondary')
                                                                                        : 'btn-outline-secondary'
                                                                                }`}
                                                                            >
                                                                                {opt}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="mt-3">
                                                        <label className="fw-bold text-dark small mb-1">
                                                            Other Concerns or Language / Comprehension Notes:
                                                        </label>
                                                        <textarea
                                                            rows="2"
                                                            disabled={isReadOnly}
                                                            className="form-control form-control-sm"
                                                            placeholder="Note any translation errors, complex jargon, or missing assent forms..."
                                                            value={form12Data.guideQuestions.sufficientInformationChecklist.otherConcernsComments}
                                                            onChange={(e) => handleForm12ChecklistChange('otherConcernsComments', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Block 4: Form 12 Recommendation */}
                                                <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-top border-4 border-theme-primary">
                                                    <h6 className="fw-bold text-dark text-uppercase mb-3">
                                                        <i className="bi bi-award-fill text-theme-primary me-2"></i>
                                                        Informed Consent Recommendation
                                                    </h6>
                                                    
                                                    <div className="mb-3">
                                                        <label className="fw-bold text-dark small mb-1">Consent Form Decision:</label>
                                                        <select
                                                            className="form-select"
                                                            disabled={isReadOnly}
                                                            value={form12Data.recommendations.decision}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setForm12Data(prev => ({
                                                                    ...prev,
                                                                    recommendations: { ...prev.recommendations, decision: val }
                                                                }));
                                                            }}
                                                        >
                                                            <option value="Approved">Approved (Informed consent is adequate)</option>
                                                            <option value="Minor Revisions Required">Minor Revisions Required</option>
                                                            <option value="Major Revision Required">Major Revision Required</option>
                                                            <option value="Disapproved">Disapproved</option>
                                                        </select>
                                                    </div>

                                                    {form12Data.recommendations.decision === 'Minor Revisions Required' && (
                                                        <textarea
                                                            rows="2"
                                                            disabled={isReadOnly}
                                                            className="form-control form-control-sm"
                                                            placeholder="State minor wording, contact person, or translation adjustments..."
                                                            value={form12Data.recommendations.minorRevisionsComments}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setForm12Data(prev => ({
                                                                    ...prev,
                                                                    recommendations: { ...prev.recommendations, minorRevisionsComments: val }
                                                                }));
                                                            }}
                                                        />
                                                    )}

                                                    {form12Data.recommendations.decision === 'Major Revision Required' && (
                                                        <textarea
                                                            rows="2"
                                                            disabled={isReadOnly}
                                                            className="form-control form-control-sm"
                                                            placeholder="State major consent flaws requiring revised participant documentation..."
                                                            value={form12Data.recommendations.majorRevisionComments}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setForm12Data(prev => ({
                                                                    ...prev,
                                                                    recommendations: { ...prev.recommendations, majorRevisionComments: val }
                                                                }));
                                                            }}
                                                        />
                                                    )}

                                                    {form12Data.recommendations.decision === 'Disapproved' && (
                                                        <textarea
                                                            rows="2"
                                                            disabled={isReadOnly}
                                                            className="form-control form-control-sm"
                                                            placeholder="State fatal consent shortcomings..."
                                                            value={form12Data.recommendations.disapprovedReasons}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setForm12Data(prev => ({
                                                                    ...prev,
                                                                    recommendations: { ...prev.recommendations, disapprovedReasons: val }
                                                                }));
                                                            }}
                                                        />
                                                    )}
                                                </div>

                                            </div>
                                        )}

                                    </div>

                                    {/* Evaluation Form Fixed Footer Actions */}
                                    <div className="p-3 bg-white border-top d-flex justify-content-between align-items-center flex-shrink-0">
                                        <div>
                                            {isReadOnly ? (
                                                <span className="text-muted small d-inline-flex align-items-center gap-1">
                                                    <i className="bi bi-shield-check text-success"></i>
                                                    View-only mode active. Modifications are locked.
                                                </span>
                                            ) : (
                                                <span className="text-secondary small">
                                                    Ensure all items are addressed before final submission.
                                                </span>
                                            )}
                                        </div>

                                        <div className="d-flex align-items-center gap-2">
                                            {!isReadOnly && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-secondary px-3 py-2 fw-semibold d-inline-flex align-items-center gap-2"
                                                        onClick={() => handleSaveDraft(false)}
                                                    >
                                                        <i className="bi bi-save"></i>
                                                        Save Progress
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-theme-primary px-4 py-2 fw-bold d-inline-flex align-items-center gap-2 shadow-sm"
                                                        disabled={isSubmitting}
                                                        onClick={handleSubmitEvaluation}
                                                    >
                                                        {isSubmitting ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm"></span>
                                                                Submitting...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-send-check-fill"></i>
                                                                Submit Completed Review
                                                            </>
                                                        )}
                                                    </button>
                                                </>
                                            )}

                                            {isReadOnly && (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-secondary px-4 py-2 fw-semibold"
                                                    onClick={onClose}
                                                >
                                                    Close Workspace
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}

export default OngoingReviewModal;
