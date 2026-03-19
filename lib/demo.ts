import type {
  AppUserRecord,
  InvoiceRecord,
  Profile,
  SubscriptionRecord,
} from "@/lib/types";

export function isDemoMode() {
  return (
    process.env.FACTURAIA_DEMO_MODE === "1" ||
    (process.env.NODE_ENV === "development" &&
      (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))
  );
}

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";

export const demoAppUser: AppUserRecord = {
  id: DEMO_USER_ID,
  email: "demo@facturaia.app",
  current_plan: "pro",
  billing_interval: "monthly",
  plan_status: "active",
  current_period_end: "2026-04-19T00:00:00.000Z",
  stripe_customer_id: "cus_demo_facturaia",
  active_subscription_id: "10000000-0000-4000-8000-000000000001",
  created_at: "2026-01-10T09:00:00.000Z",
  updated_at: "2026-03-19T08:00:00.000Z",
};

export const demoProfile: Profile = {
  id: DEMO_USER_ID,
  email: "demo@facturaia.app",
  full_name: "Estudio Rivera Consultoría",
  nif: "B12345678",
  address: "Calle Velázquez 52, 28001 Madrid",
  logo_path: null,
  logo_url: "/demo-logo.png",
  created_at: "2026-01-10T09:00:00.000Z",
  updated_at: "2026-03-18T16:00:00.000Z",
};

export const demoSubscription: SubscriptionRecord = {
  id: "10000000-0000-4000-8000-000000000001",
  user_id: DEMO_USER_ID,
  stripe_customer_id: "cus_demo_facturaia",
  stripe_subscription_id: "sub_demo_facturaia",
  stripe_price_id: "price_demo_pro_monthly",
  stripe_product_id: "prod_demo_pro",
  plan_key: "pro",
  billing_interval: "monthly",
  status: "active",
  cancel_at_period_end: false,
  current_period_start: "2026-03-19T00:00:00.000Z",
  current_period_end: "2026-04-19T00:00:00.000Z",
  canceled_at: null,
  created_at: "2026-01-10T09:00:00.000Z",
  updated_at: "2026-03-19T08:00:00.000Z",
};

export const demoAiUsage = {
  date: "2026-03-19",
  used: 12,
  limit: 50,
};

export const demoInvoices: InvoiceRecord[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    user_id: DEMO_USER_ID,
    public_id: "30000000-0000-4000-8000-000000000001",
    invoice_number: 1027,
    issue_date: "2026-03-16",
    issuer_name: "Estudio Rivera Consultoría",
    issuer_nif: "B12345678",
    issuer_address: "Calle Velázquez 52, 28001 Madrid",
    issuer_logo_url: null,
    client_name: "Brisa Legal S.L.",
    client_nif: "B87654321",
    client_address: "Paseo de Gràcia 11, 08007 Barcelona",
    client_email: "administracion@brisalegal.es",
    line_items: [
      {
        description: "Servicio mensual de consultoría operativa y revisión de procesos.",
        quantity: 1,
        unitPrice: 980,
        vatRate: 21,
        lineBase: 980,
        vatAmount: 205.8,
        lineTotal: 1185.8,
      },
    ],
    subtotal: 980,
    vat_total: 205.8,
    irpf_rate: 0,
    irpf_amount: 0,
    grand_total: 1185.8,
    vat_breakdown: [{ rate: 21, taxableBase: 980, vatAmount: 205.8 }],
    created_at: "2026-03-16T09:00:00.000Z",
    updated_at: "2026-03-16T09:00:00.000Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    user_id: DEMO_USER_ID,
    public_id: "30000000-0000-4000-8000-000000000002",
    invoice_number: 1026,
    issue_date: "2026-03-11",
    issuer_name: "Estudio Rivera Consultoría",
    issuer_nif: "B12345678",
    issuer_address: "Calle Velázquez 52, 28001 Madrid",
    issuer_logo_url: null,
    client_name: "Atalaya Studio",
    client_nif: "12345678Z",
    client_address: "Carrer de Mallorca 210, 08008 Barcelona",
    client_email: "hola@atalaya.studio",
    line_items: [
      {
        description: "Diseño de propuesta comercial y estructura de servicios para campaña trimestral.",
        quantity: 1,
        unitPrice: 640,
        vatRate: 21,
        lineBase: 640,
        vatAmount: 134.4,
        lineTotal: 774.4,
      },
    ],
    subtotal: 640,
    vat_total: 134.4,
    irpf_rate: 0,
    irpf_amount: 0,
    grand_total: 774.4,
    vat_breakdown: [{ rate: 21, taxableBase: 640, vatAmount: 134.4 }],
    created_at: "2026-03-11T12:00:00.000Z",
    updated_at: "2026-03-11T12:00:00.000Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    user_id: DEMO_USER_ID,
    public_id: "30000000-0000-4000-8000-000000000003",
    invoice_number: 1025,
    issue_date: "2026-03-03",
    issuer_name: "Estudio Rivera Consultoría",
    issuer_nif: "B12345678",
    issuer_address: "Calle Velázquez 52, 28001 Madrid",
    issuer_logo_url: null,
    client_name: "Nexo Digital S.L.",
    client_nif: "B76543210",
    client_address: "Avenida de América 27, 28002 Madrid",
    client_email: "finanzas@nexodigital.es",
    line_items: [
      {
        description: "Mantenimiento mensual, soporte y ajustes sobre automatizaciones internas.",
        quantity: 1,
        unitPrice: 420,
        vatRate: 21,
        lineBase: 420,
        vatAmount: 88.2,
        lineTotal: 508.2,
      },
    ],
    subtotal: 420,
    vat_total: 88.2,
    irpf_rate: 0,
    irpf_amount: 0,
    grand_total: 508.2,
    vat_breakdown: [{ rate: 21, taxableBase: 420, vatAmount: 88.2 }],
    created_at: "2026-03-03T08:30:00.000Z",
    updated_at: "2026-03-03T08:30:00.000Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    user_id: DEMO_USER_ID,
    public_id: "30000000-0000-4000-8000-000000000004",
    invoice_number: 1024,
    issue_date: "2026-02-18",
    issuer_name: "Estudio Rivera Consultoría",
    issuer_nif: "B12345678",
    issuer_address: "Calle Velázquez 52, 28001 Madrid",
    issuer_logo_url: null,
    client_name: "Luna Norte Coop.",
    client_nif: "F33445566",
    client_address: "Calle Orense 14, 28020 Madrid",
    client_email: "equipo@lunanorte.coop",
    line_items: [
      {
        description: "Sesión intensiva de definición operativa y roadmap de implantación.",
        quantity: 1,
        unitPrice: 850,
        vatRate: 21,
        lineBase: 850,
        vatAmount: 178.5,
        lineTotal: 1028.5,
      },
    ],
    subtotal: 850,
    vat_total: 178.5,
    irpf_rate: 0,
    irpf_amount: 0,
    grand_total: 1028.5,
    vat_breakdown: [{ rate: 21, taxableBase: 850, vatAmount: 178.5 }],
    created_at: "2026-02-18T15:45:00.000Z",
    updated_at: "2026-02-18T15:45:00.000Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    user_id: DEMO_USER_ID,
    public_id: "30000000-0000-4000-8000-000000000005",
    invoice_number: 1023,
    issue_date: "2026-01-29",
    issuer_name: "Estudio Rivera Consultoría",
    issuer_nif: "B12345678",
    issuer_address: "Calle Velázquez 52, 28001 Madrid",
    issuer_logo_url: null,
    client_name: "Costa Verde Retail",
    client_nif: "A55443322",
    client_address: "Plaza de España 8, 46007 Valencia",
    client_email: "facturas@costaverde.es",
    line_items: [
      {
        description: "Auditoría de procesos y propuesta de mejora para equipo comercial.",
        quantity: 1,
        unitPrice: 1200,
        vatRate: 21,
        lineBase: 1200,
        vatAmount: 252,
        lineTotal: 1452,
      },
    ],
    subtotal: 1200,
    vat_total: 252,
    irpf_rate: 0,
    irpf_amount: 0,
    grand_total: 1452,
    vat_breakdown: [{ rate: 21, taxableBase: 1200, vatAmount: 252 }],
    created_at: "2026-01-29T11:20:00.000Z",
    updated_at: "2026-01-29T11:20:00.000Z",
  },
];

export function getDemoInvoiceById(invoiceId: string) {
  return demoInvoices.find((invoice) => invoice.id === invoiceId) ?? null;
}

export function getDemoInvoiceByPublicId(publicId: string) {
  return demoInvoices.find((invoice) => invoice.public_id === publicId) ?? null;
}
