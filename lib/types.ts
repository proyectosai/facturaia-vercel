export type NumericLike = number | string;

export type VatRate = 21 | 10 | 4;

export type PlanKey = "free" | "basic" | "pro" | "premium";

export type BillingInterval = "monthly" | "yearly";

export type MessageChannel = "whatsapp" | "telegram";

export type MessageConnectionStatus = "draft" | "active" | "paused";

export type MessageUrgency = "low" | "medium" | "high";

export type MessageSortKey = "recent" | "urgency" | "name" | "surname";

export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired";

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
  current_plan: PlanKey;
  billing_interval: BillingInterval | null;
  plan_status: SubscriptionStatus;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  active_subscription_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionRecord = {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  stripe_product_id: string | null;
  plan_key: PlanKey;
  billing_interval: BillingInterval;
  status: SubscriptionStatus;
  cancel_at_period_end: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
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
