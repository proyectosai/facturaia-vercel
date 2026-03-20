import { describe, expect, test } from "vitest";

import {
  getInvoiceReminderQueues,
  matchesInvoiceReminderBatch,
} from "@/lib/collections";
import { demoInvoices } from "@/lib/demo";

describe("collections reminder queues", () => {
  test("detects overdue_due candidates from demo data", () => {
    const invoice = demoInvoices.find((item) => item.invoice_number === 1026);

    expect(invoice).toBeTruthy();
    expect(matchesInvoiceReminderBatch(invoice!, "overdue_due")).toBe(true);
  });

  test("builds the three queue groups with amounts", () => {
    const queues = getInvoiceReminderQueues(demoInvoices);

    expect(queues).toHaveLength(3);
    expect(queues.map((queue) => queue.key)).toEqual([
      "overdue_due",
      "partial_due",
      "due_soon",
    ]);
    expect(queues[0]?.count).toBeGreaterThanOrEqual(1);
    expect(queues[0]?.amountPending).toBeGreaterThan(0);
  });
});
