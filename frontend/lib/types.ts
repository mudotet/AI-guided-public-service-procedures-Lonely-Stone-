export type SessionStatus = "intake" | "checklist" | "precheck" | "ready";

export type CaseSummary = {
  code: string;
  name: string;
  description: string | null;
  is_primary: boolean;
  requires_officer_confirmation: boolean;
};

export type SessionResponse = {
  id: string;
  procedure_id: number;
  status: SessionStatus;
  primary_case: CaseSummary | null;
  cases: CaseSummary[];
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
};

export type PrecheckIssue = {
  id?: number | null;
  field_name: string | null;
  rule_id: number | null;
  message: string;
  suggested_fix: string;
  legal_basis: string | null;
  source: "rule_engine" | "llm";
  severity: "error" | "warning";
};

export type SessionDetail = SessionResponse & {
  messages: ChatMessage[];
  form_data: Record<string, unknown>;
  precheck_results: PrecheckIssue[];
};

export type ChecklistDocument = {
  code: string;
  name: string;
  description: string | null;
  required: boolean;
  legal_basis: string[];
};

export type ChecklistStep = {
  order: number;
  title: string;
  description: string;
  legal_basis: string | null;
  case_code: string | null;
};

export type ChecklistResponse = {
  session_id: string;
  primary_case: CaseSummary | null;
  cases: CaseSummary[];
  documents: ChecklistDocument[];
  steps: ChecklistStep[];
  needs_officer_confirmation: boolean;
};

export type IntakeResponse = {
  session: SessionResponse;
  reply: string;
  form_data: Record<string, unknown>;
  missing_fields: string[];
  confidence: number;
  needs_officer_confirmation: boolean;
};

export type AudioTranscriptionResponse = {
  transcript: string;
};

export type PrecheckResponse = {
  session_id: string;
  status: SessionStatus;
  issues: PrecheckIssue[];
  needs_officer_confirmation: boolean;
};

export type RegistrationForm = {
  child_full_name: string;
  child_birth_date: string;
  registration_date: string;
  child_birth_country: string;
  parents_married: boolean | null;
  wants_father_on_certificate: boolean | null;
  father_full_name: string;
  mother_full_name: string;
  father_nationality: string;
  mother_nationality: string;
  parentage_evidence: boolean | null;
  has_foreign_documents: boolean | null;
  foreign_documents_translated: boolean | null;
  foreign_documents_legalized: boolean | null;
  rare_case: string | null;
};

export type AdminStats = {
  total: number;
  intake: number;
  checklist: number;
  precheck: number;
  ready: number;
  needs_officer_confirmation: number;
};

export type AdminCaseStat = {
  code: string;
  name: string;
  description: string | null;
  requires_officer_confirmation: boolean;
  total: number;
};

export type AdminSessionSummary = {
  id: string;
  status: SessionStatus;
  primary_case: CaseSummary | null;
  cases: CaseSummary[];
  needs_officer_confirmation: boolean;
  last_user_message: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminDashboardResponse = {
  stats: AdminStats;
  case_stats: AdminCaseStat[];
  sessions: AdminSessionSummary[];
  result_count: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export type OfficialSource = {
  code: string;
  title: string;
  publisher: string;
  domain: string;
  url: string;
};

export type TrustResponse = {
  procedure_code: string;
  last_reviewed_on: string;
  training_disclosure: string;
  ai_role: string;
  deterministic_role: string;
  human_role: string;
  sources: OfficialSource[];
};
