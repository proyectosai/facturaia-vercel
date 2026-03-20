export type NumericLike = number | string;

export type VatRate = 21 | 10 | 4;

export type MessageChannel = "whatsapp" | "telegram";

export type MessageConnectionStatus = "draft" | "active" | "paused";

export type MessageUrgency = "low" | "medium" | "high";

export type MessageSortKey = "recent" | "urgency" | "name" | "surname";

export type MailSource = "imap";

export type MailSortKey = "recent" | "urgency" | "name" | "email";

export type CommercialDocumentType = "quote" | "delivery_note";

export type CommercialDocumentStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "delivered"
  | "signed"
  | "converted";

export type ExpenseKind = "ticket" | "supplier_invoice";

export type ExpenseReviewStatus = "draft" | "reviewed";

export type ExpenseExtractionMethod =
  | "manual"
  | "pdf_text"
  | "plain_text"
  | "unavailable";

export type ClientRelationKind = "client" | "supplier" | "mixed";

export type ClientStatus = "lead" | "active" | "paused" | "archived";

export type ClientPriority = "low" | "medium" | "high";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  nif: string | null;
  address: string | null;
  logo_path: string | null;
  logo_url: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AppUserRecord = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export type InvoiceLineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: VatRate;
};

export type InvoiceLineItemStored = InvoiceLineItemInput & {
  lineBase: number;
  vatAmount: number;
  lineTotal: number;
};

export type InvoiceVatBreakdown = {
  rate: VatRate;
  taxableBase: number;
  vatAmount: number;
};

export type InvoiceTotals = {
  subtotal: number;
  vatTotal: number;
  irpfRate: number;
  irpfAmount: number;
  grandTotal: number;
  vatBreakdown: InvoiceVatBreakdown[];
};

export type InvoiceRecord = {
  id: string;
  user_id: string;
  public_id: string;
  invoice_number: number;
  issue_date: string;
  issuer_name: string;
  issuer_nif: string;
  issuer_address: string;
  issuer_logo_url: string | null;
  client_name: string;
  client_nif: string;
  client_address: string;
  client_email: string;
  line_items: InvoiceLineItemStored[];
  subtotal: NumericLike;
  vat_total: NumericLike;
  irpf_rate: NumericLike;
  irpf_amount: NumericLike;
  grand_total: NumericLike;
  vat_breakdown: InvoiceVatBreakdown[];
  created_at: string;
  updated_at: string;
};

export type InvoiceListItem = {
  id: string;
  publicUrl: string;
  invoiceNumber: number;
  issueDate: string;
  clientName: string;
  clientNif: string;
  clientAddress: string;
  clientEmail: string;
  grandTotal: number;
  conceptsCount: number;
  isRecent: boolean;
};

export type InvoiceMonthGroup = {
  key: string;
  label: string;
  total: number;
  items: InvoiceListItem[];
};

export type CommercialDocumentRecord = {
  id: string;
  user_id: string;
  document_type: CommercialDocumentType;
  status: CommercialDocumentStatus;
  public_id: string;
  document_number: number;
  issue_date: string;
  valid_until: string | null;
  issuer_name: string;
  issuer_nif: string;
  issuer_address: string;
  issuer_logo_url: string | null;
  client_name: string;
  client_nif: string;
  client_address: string;
  client_email: string;
  line_items: InvoiceLineItemStored[];
  subtotal: NumericLike;
  vat_total: NumericLike;
  irpf_rate: NumericLike;
  irpf_amount: NumericLike;
  grand_total: NumericLike;
  vat_breakdown: InvoiceVatBreakdown[];
  notes: string | null;
  converted_invoice_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseRecord = {
  id: string;
  user_id: string;
  expense_kind: ExpenseKind;
  review_status: ExpenseReviewStatus;
  vendor_name: string | null;
  vendor_nif: string | null;
  expense_date: string | null;
  currency: string;
  base_amount: NumericLike | null;
  vat_amount: NumericLike | null;
  total_amount: NumericLike | null;
  notes: string | null;
  source_file_name: string | null;
  source_file_path: string | null;
  source_file_mime_type: string | null;
  text_extraction_method: ExpenseExtractionMethod;
  raw_text: string | null;
  extracted_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ClientRecord = {
  id: string;
  user_id: string;
  relation_kind: ClientRelationKind;
  status: ClientStatus;
  priority: ClientPriority;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  nif: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type MessageConnection = {
  id: string;
  user_id: string;
  channel: MessageChannel;
  label: string;
  status: MessageConnectionStatus;
  inbound_key: string;
  verify_token: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MessageThread = {
  id: string;
  user_id: string;
  connection_id: string | null;
  channel: MessageChannel;
  external_chat_id: string;
  external_contact_id: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  phone: string | null;
  telegram_username: string | null;
  urgency: MessageUrgency;
  urgency_score: number;
  urgency_locked: boolean;
  unread_count: number;
  last_message_preview: string | null;
  last_message_direction: "inbound" | "outbound";
  last_message_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MessageRecord = {
  id: string;
  user_id: string;
  thread_id: string;
  channel: MessageChannel;
  external_message_id: string | null;
  direction: "inbound" | "outbound";
  sender_name: string | null;
  body: string;
  message_type: string;
  received_at: string;
  raw_payload: Record<string, unknown>;
  created_at: string;
};

export type RemoteBackupRun = {
  id: string;
  user_id: string;
  provider: "webdav";
  status: "success" | "error";
  file_name: string;
  remote_path: string;
  error_message: string | null;
  created_at: string;
};

export type MailThread = {
  id: string;
  user_id: string;
  source: MailSource;
  external_thread_key: string;
  from_name: string | null;
  from_email: string;
  subject: string | null;
  urgency: MessageUrgency;
  urgency_score: number;
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MailMessage = {
  id: string;
  user_id: string;
  thread_id: string;
  source: MailSource;
  external_message_id: string;
  from_name: string | null;
  from_email: string;
  to_emails: string[];
  subject: string | null;
  body_text: string;
  body_html: string | null;
  received_at: string;
  raw_headers: Record<string, unknown>;
  created_at: string;
};

export type MailSyncRun = {
  id: string;
  user_id: string;
  source: MailSource;
  status: "success" | "error";
  imported_count: number;
  detail: string | null;
  created_at: string;
};
