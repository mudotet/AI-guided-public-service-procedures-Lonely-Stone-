import type { RegistrationForm, SessionStatus } from "./types.ts";

export const RARE_CASE_CODES = ["abandoned", "surrogacy", "reregistration", "correction"];

export function emptyRegistrationForm(): RegistrationForm {
  return {
    child_full_name: "",
    child_birth_date: "",
    registration_date: "",
    child_birth_country: "VN",
    parents_married: null,
    wants_father_on_certificate: null,
    father_full_name: "",
    mother_full_name: "",
    father_nationality: "",
    mother_nationality: "Việt Nam",
    parentage_evidence: null,
    has_foreign_documents: null,
    foreign_documents_translated: null,
    foreign_documents_legalized: null,
    rare_case: null,
  };
}

export function normaliseForm(form: RegistrationForm, caseCodes: string[]): Record<string, string | boolean | null> {
  const outOfWedlock = caseCodes.includes("out_of_wedlock");
  const foreignElement = caseCodes.includes("foreign_element");
  const wantsFather = outOfWedlock ? (form.wants_father_on_certificate ?? false) : true;

  return {
    ...form,
    parents_married: form.parents_married ?? false,
    wants_father_on_certificate: wantsFather,
    father_full_name: wantsFather ? form.father_full_name : "",
    father_nationality: wantsFather ? form.father_nationality : "",
    parentage_evidence:
      outOfWedlock && wantsFather ? (form.parentage_evidence ?? false) : false,
    has_foreign_documents: foreignElement ? (form.has_foreign_documents ?? false) : false,
    foreign_documents_translated:
      foreignElement && form.has_foreign_documents ? (form.foreign_documents_translated ?? false) : false,
    foreign_documents_legalized:
      foreignElement && form.has_foreign_documents ? (form.foreign_documents_legalized ?? false) : false,
  };
}

export function mergeConversationFacts(
  form: RegistrationForm,
  facts: Record<string, unknown>,
  editedFields: ReadonlySet<keyof RegistrationForm> = new Set(),
): RegistrationForm {
  const next = { ...form } as Record<string, unknown>;
  for (const key of Object.keys(form) as (keyof RegistrationForm)[]) {
    const value = facts[key];
    if (!editedFields.has(key) && value !== undefined && value !== null && value !== "") next[key] = value;
  }
  return next as RegistrationForm;
}

export function flowStep(status: SessionStatus, view: "chat" | "form", hasCases: boolean): number {
  if (status === "ready") return 3;
  if (status === "precheck" || view === "form") return 2;
  if (hasCases) return 1;
  return 0;
}
