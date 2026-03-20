import "server-only";

import { demoInvoices, getDemoInvoiceById, isDemoMode } from "@/lib/demo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InvoiceLineItemStored, InvoiceRecord, InvoiceVatBreakdown } from "@/lib/types";
import {
  createSlug,
  formatInvoiceNumber,
  roundCurrency,
  toNumber,
} from "@/lib/utils";

type NormalizedInvoiceRecord = Omit<
  InvoiceRecord,
  "subtotal" | "vat_total" | "irpf_rate" | "irpf_amount" | "grand_total"
> & {
  subtotal: number;
  vat_total: number;
  irpf_rate: number;
  irpf_amount: number;
  grand_total: number;
  line_items: InvoiceLineItemStored[];
  vat_breakdown: InvoiceVatBreakdown[];
};

export type FacturaeReadinessIssue = {
  level: "warning" | "info";
  message: string;
};

export type FacturaePreparedInvoice = {
  invoice: NormalizedInvoiceRecord;
  issues: FacturaeReadinessIssue[];
  isReady: boolean;
  fileName: string;
};

type ParsedAddress = {
  address: string;
  postCode: string;
  town: string;
  province: string;
  countryCode: "ESP";
};

type PartyXmlDraft = {
  displayName: string;
  taxIdentificationNumber: string;
  personTypeCode: "F" | "J";
  residenceTypeCode: "R";
  address: ParsedAddress;
  legalEntity: boolean;
  firstName?: string;
  firstSurname?: string;
  secondSurname?: string;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function decimal(value: number) {
  return roundCurrency(value).toFixed(2);
}

function normalizeInvoice(invoice: InvoiceRecord): NormalizedInvoiceRecord {
  return {
    ...invoice,
    invoice_number: Number(invoice.invoice_number),
    subtotal: toNumber(invoice.subtotal),
    vat_total: toNumber(invoice.vat_total),
    irpf_rate: toNumber(invoice.irpf_rate),
    irpf_amount: toNumber(invoice.irpf_amount),
    grand_total: toNumber(invoice.grand_total),
    line_items: (invoice.line_items ?? []).map((line) => ({
      ...line,
      quantity: toNumber(line.quantity),
      unitPrice: toNumber(line.unitPrice),
      lineBase: toNumber(line.lineBase),
      vatAmount: toNumber(line.vatAmount),
      lineTotal: toNumber(line.lineTotal),
    })),
    vat_breakdown: (invoice.vat_breakdown ?? []).map((entry) => ({
      ...entry,
      taxableBase: toNumber(entry.taxableBase),
      vatAmount: toNumber(entry.vatAmount),
    })),
  };
}

function splitAddress(address: string): ParsedAddress | null {
  const trimmed = address.trim();

  if (!trimmed) {
    return null;
  }

  const postCodeMatch = trimmed.match(/\b(\d{5})\b/);
  const postCode = postCodeMatch?.[1] ?? "";
  const segments = trimmed
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const street = segments[0] ?? trimmed;
  let town = "";
  let province = "";

  if (segments.length > 1) {
    const rest = segments.slice(1).join(", ");
    const withoutPostCode = postCode ? rest.replace(postCode, "").trim() : rest;
    const normalizedRest = withoutPostCode.replace(/^[-–, ]+/, "").trim();
    const townParts = normalizedRest
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean);

    town = townParts[0] ?? "";
    province = townParts[1] ?? town;
  }

  if (!town && postCode) {
    const afterPostCode = trimmed.split(postCode)[1]?.trim() ?? "";
    town = afterPostCode.replace(/^[-–, ]+/, "").trim();
    province = town;
  }

  if (!town) {
    town = "Pendiente";
  }

  if (!province) {
    province = town;
  }

  return {
    address: street,
    postCode: postCode || "00000",
    town,
    province,
    countryCode: "ESP",
  };
}

function inferPartyType(name: string, taxId: string) {
  const upperTaxId = taxId.trim().toUpperCase();
  const normalizedName = name.trim().toUpperCase();
  const companyMarkers = [
    "S.L",
    "SL",
    "S.A",
    "SA",
    "SOCIEDAD",
    "CONSULTORIA",
    "CONSULTORÍA",
    "ESTUDIO",
    "SOLUTIONS",
    "SERVICIOS",
  ];

  const looksLikeCompany =
    /^[ABCDEFGHJNPQRSUVW]/.test(upperTaxId) ||
    companyMarkers.some((marker) => normalizedName.includes(marker));

  return looksLikeCompany ? ("J" as const) : ("F" as const);
}

function buildPartyDraft({
  name,
  taxId,
  address,
}: {
  name: string;
  taxId: string;
  address: string;
}): PartyXmlDraft {
  const personTypeCode = inferPartyType(name, taxId);
  const parsedAddress = splitAddress(address) ?? {
    address: address.trim() || "Pendiente",
    postCode: "00000",
    town: "Pendiente",
    province: "Pendiente",
    countryCode: "ESP" as const,
  };

  if (personTypeCode === "J") {
    return {
      displayName: name.trim(),
      taxIdentificationNumber: taxId.trim().toUpperCase(),
      personTypeCode,
      residenceTypeCode: "R",
      address: parsedAddress,
      legalEntity: true,
    };
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);
  const [firstName = name.trim(), firstSurname = "Pendiente", secondSurname = ""] = parts;

  return {
    displayName: name.trim(),
    taxIdentificationNumber: taxId.trim().toUpperCase(),
    personTypeCode,
    residenceTypeCode: "R",
    address: parsedAddress,
    legalEntity: false,
    firstName,
    firstSurname,
    secondSurname,
  };
}

function buildAddressXml(address: ParsedAddress) {
  return `
      <AddressInSpain>
        <Address>${escapeXml(address.address)}</Address>
        <PostCode>${escapeXml(address.postCode)}</PostCode>
        <Town>${escapeXml(address.town)}</Town>
        <Province>${escapeXml(address.province)}</Province>
        <CountryCode>${address.countryCode}</CountryCode>
      </AddressInSpain>`;
}

function buildPartyXml(party: PartyXmlDraft) {
  const taxIdentificationXml = `
      <TaxIdentification>
        <PersonTypeCode>${party.personTypeCode}</PersonTypeCode>
        <ResidenceTypeCode>${party.residenceTypeCode}</ResidenceTypeCode>
        <TaxIdentificationNumber>${escapeXml(party.taxIdentificationNumber)}</TaxIdentificationNumber>
      </TaxIdentification>`;

  if (party.legalEntity) {
    return `
    ${taxIdentificationXml}
      <LegalEntity>
        <CorporateName>${escapeXml(party.displayName)}</CorporateName>${buildAddressXml(party.address)}
      </LegalEntity>`;
  }

  return `
    ${taxIdentificationXml}
      <Individual>
        <Name>${escapeXml(party.firstName ?? party.displayName)}</Name>
        <FirstSurname>${escapeXml(party.firstSurname ?? "Pendiente")}</FirstSurname>${
          party.secondSurname
            ? `\n        <SecondSurname>${escapeXml(party.secondSurname)}</SecondSurname>`
            : ""
        }${buildAddressXml(party.address)}
      </Individual>`;
}

function buildLineTaxXml(rate: number, baseAmount: number, vatAmount: number) {
  return `
            <Tax>
              <TaxTypeCode>01</TaxTypeCode>
              <TaxRate>${decimal(rate)}</TaxRate>
              <TaxableBase>
                <TotalAmount>${decimal(baseAmount)}</TotalAmount>
              </TaxableBase>
              <TaxAmount>
                <TotalAmount>${decimal(vatAmount)}</TotalAmount>
              </TaxAmount>
            </Tax>`;
}

function buildInvoiceTaxXml(invoice: NormalizedInvoiceRecord) {
  const taxesOutputs = invoice.vat_breakdown
    .map((entry) => buildLineTaxXml(entry.rate, entry.taxableBase, entry.vatAmount))
    .join("\n");

  const taxesWithheld =
    invoice.irpf_rate > 0
      ? `
        <TaxesWithheld>
          <Tax>
            <TaxTypeCode>04</TaxTypeCode>
            <TaxRate>${decimal(invoice.irpf_rate)}</TaxRate>
            <TaxableBase>
              <TotalAmount>${decimal(invoice.subtotal)}</TotalAmount>
            </TaxableBase>
            <TaxAmount>
              <TotalAmount>${decimal(invoice.irpf_amount)}</TotalAmount>
            </TaxAmount>
          </Tax>
        </TaxesWithheld>`
      : "";

  return { taxesOutputs, taxesWithheld };
}

export function getFacturaeReadiness(invoiceRecord: InvoiceRecord): FacturaePreparedInvoice {
  const invoice = normalizeInvoice(invoiceRecord);
  const issues: FacturaeReadinessIssue[] = [];
  let hasBlockingIssue = false;

  if (!invoice.issuer_name?.trim() || !invoice.client_name?.trim()) {
    issues.push({
      level: "warning",
      message: "Falta nombre en emisor o cliente y conviene revisarlo antes de exportar.",
    });
    hasBlockingIssue = true;
  }

  if (!invoice.issuer_nif?.trim() || !invoice.client_nif?.trim()) {
    issues.push({
      level: "warning",
      message: "Falta NIF en emisor o cliente y conviene revisarlo antes de exportar.",
    });
    hasBlockingIssue = true;
  }

  if (!invoice.issue_date?.trim()) {
    issues.push({
      level: "warning",
      message: "Falta fecha de emisión y el XML no debería usarse así fuera de la app.",
    });
    hasBlockingIssue = true;
  }

  if (!splitAddress(invoice.issuer_address)?.postCode || !splitAddress(invoice.client_address)?.postCode) {
    issues.push({
      level: "info",
      message:
        "Alguna dirección no incluye código postal claro. El XML se genera igualmente, pero conviene revisar domicilio, población y provincia.",
    });
  }

  if (invoice.irpf_rate > 0) {
    issues.push({
      level: "info",
      message:
        "La retención IRPF se exporta como impuesto retenido en el borrador XML. Revísala antes de usar el fichero fuera de la app.",
    });
  }

  if (invoice.line_items.length === 0) {
    issues.push({
      level: "warning",
      message: "La factura no tiene líneas de detalle. El exportador necesita al menos un concepto.",
    });
    hasBlockingIssue = true;
  }

  if (invoice.vat_breakdown.length === 0) {
    issues.push({
      level: "warning",
      message: "La factura no tiene desglose de IVA calculado. Revisa la factura antes de exportarla.",
    });
    hasBlockingIssue = true;
  }

  issues.push({
    level: "info",
    message:
      "Esta primera entrega genera un XML Facturae 3.2.2 sin firma XAdES ni envío automático a FACe o VeriFactu.",
  });

  const isReady = !hasBlockingIssue;

  return {
    invoice,
    issues,
    isReady,
    fileName: getInvoiceFacturaeFileName(invoice.invoice_number),
  };
}

export function getInvoiceFacturaeFileName(invoiceNumber: number | string) {
  return `${formatInvoiceNumber(invoiceNumber)}-${createSlug("Facturae-3.2.2")}.xml`;
}

export function renderFacturaeXml(invoiceRecord: InvoiceRecord) {
  const prepared = getFacturaeReadiness(invoiceRecord);
  const { invoice } = prepared;
  const seller = buildPartyDraft({
    name: invoice.issuer_name,
    taxId: invoice.issuer_nif,
    address: invoice.issuer_address,
  });
  const buyer = buildPartyDraft({
    name: invoice.client_name,
    taxId: invoice.client_nif,
    address: invoice.client_address,
  });
  const { taxesOutputs, taxesWithheld } = buildInvoiceTaxXml(invoice);
  const batchIdentifier = formatInvoiceNumber(invoice.invoice_number);
  const lineXml = invoice.line_items
    .map((line, index) => {
      const perLineTaxXml = buildLineTaxXml(line.vatRate, line.lineBase, line.vatAmount);

      return `
          <InvoiceLine>
            <ItemDescription>${escapeXml(line.description)}</ItemDescription>
            <Quantity>${decimal(line.quantity)}</Quantity>
            <UnitOfMeasure>01</UnitOfMeasure>
            <UnitPriceWithoutTax>${decimal(line.unitPrice)}</UnitPriceWithoutTax>
            <TotalCost>${decimal(line.lineBase)}</TotalCost>
            <GrossAmount>${decimal(line.lineBase)}</GrossAmount>
            <TaxesOutputs>
${perLineTaxXml}
            </TaxesOutputs>
            <SequenceNumber>${index + 1}</SequenceNumber>
          </InvoiceLine>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<fe:Facturae xmlns:fe="http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <FileHeader>
    <SchemaVersion>3.2.2</SchemaVersion>
    <Modality>I</Modality>
    <InvoiceIssuerType>EM</InvoiceIssuerType>
      <Batch>
      <BatchIdentifier>${escapeXml(batchIdentifier)}</BatchIdentifier>
      <InvoicesCount>1</InvoicesCount>
      <TotalInvoicesAmount>
        <TotalAmount>${decimal(invoice.grand_total)}</TotalAmount>
      </TotalInvoicesAmount>
      <TotalOutstandingAmount>
        <TotalAmount>${decimal(invoice.grand_total)}</TotalAmount>
      </TotalOutstandingAmount>
      <TotalExecutableAmount>
        <TotalAmount>${decimal(invoice.grand_total)}</TotalAmount>
      </TotalExecutableAmount>
      <InvoiceCurrencyCode>EUR</InvoiceCurrencyCode>
    </Batch>
  </FileHeader>
  <Parties>
    <SellerParty>${buildPartyXml(seller)}
    </SellerParty>
    <BuyerParty>${buildPartyXml(buyer)}
    </BuyerParty>
  </Parties>
  <Invoices>
    <Invoice>
      <InvoiceHeader>
        <InvoiceNumber>${escapeXml(batchIdentifier)}</InvoiceNumber>
        <InvoiceDocumentType>FC</InvoiceDocumentType>
        <InvoiceClass>OO</InvoiceClass>
      </InvoiceHeader>
      <InvoiceIssueData>
        <IssueDate>${escapeXml(invoice.issue_date)}</IssueDate>
        <OperationDate>${escapeXml(invoice.issue_date)}</OperationDate>
        <InvoiceCurrencyCode>EUR</InvoiceCurrencyCode>
        <TaxCurrencyCode>EUR</TaxCurrencyCode>
        <LanguageName>es</LanguageName>
      </InvoiceIssueData>
      <TaxesOutputs>
${taxesOutputs}
      </TaxesOutputs>${taxesWithheld}
      <InvoiceTotals>
        <TotalGrossAmount>${decimal(invoice.subtotal)}</TotalGrossAmount>
        <TotalGrossAmountBeforeTaxes>${decimal(invoice.subtotal)}</TotalGrossAmountBeforeTaxes>
        <TotalTaxOutputs>${decimal(invoice.vat_total)}</TotalTaxOutputs>
        <TotalTaxesWithheld>${decimal(invoice.irpf_amount)}</TotalTaxesWithheld>
        <InvoiceTotal>${decimal(invoice.grand_total)}</InvoiceTotal>
        <TotalOutstandingAmount>${decimal(invoice.grand_total)}</TotalOutstandingAmount>
        <TotalExecutableAmount>${decimal(invoice.grand_total)}</TotalExecutableAmount>
      </InvoiceTotals>
      <Items>
${lineXml}
      </Items>
      <AdditionalData>
        <InvoiceAdditionalInformation>XML generado por FacturaIA como borrador Facturae 3.2.2 sin firma XAdES ni remisión automática a FACe o VeriFactu.</InvoiceAdditionalInformation>
      </AdditionalData>
    </Invoice>
  </Invoices>
</fe:Facturae>
`;
}

export async function getFacturaeInvoicesForUser(userId: string) {
  if (isDemoMode()) {
    return [...demoInvoices].sort((left, right) => right.issue_date.localeCompare(left.issue_date));
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", userId)
    .order("issue_date", { ascending: false });

  if (error) {
    throw new Error("No se han podido cargar las facturas para Facturae.");
  }

  return (data as InvoiceRecord[] | null) ?? [];
}

export async function getFacturaeInvoiceByIdForUser(userId: string, invoiceId: string) {
  if (isDemoMode()) {
    return getDemoInvoiceById(invoiceId);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", userId)
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    throw new Error("No se ha podido cargar la factura para exportarla a Facturae.");
  }

  return (data as InvoiceRecord | null) ?? null;
}
