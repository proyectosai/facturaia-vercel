"use server";

import { redirect } from "next/navigation";

import { getCurrentAppUser, getCurrentProfile, requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPriceIdForPlan } from "@/lib/stripe-prices";
import { getStripeClient } from "@/lib/stripe";
import type { BillingInterval, PlanKey } from "@/lib/types";
import { getBaseUrl } from "@/lib/utils";

function isPlanKey(value: string): value is Exclude<PlanKey, "free"> {
  return value === "basic" || value === "pro" || value === "premium";
}

function isBillingInterval(value: string): value is BillingInterval {
  return value === "monthly" || value === "yearly";
}

async function ensureStripeCustomer() {
  const user = await requireUser();
  const appUser = await getCurrentAppUser();
  const profile = await getCurrentProfile();
  const supabase = await createServerSupabaseClient();
  const stripe = getStripeClient();

  if (appUser.stripe_customer_id) {
    return appUser.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: user.email ?? appUser.email,
    name: profile.full_name ?? undefined,
    metadata: {
      userId: user.id,
    },
  });

  await supabase
    .from("users")
    .update({ stripe_customer_id: customer.id })
    .eq("id", user.id);

  return customer.id;
}

export async function createCheckoutSessionAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/pricing?error=Modo%20demo:%20Stripe%20Checkout%20est%C3%A1%20desactivado.",
      );
    }

    const user = await requireUser();
    const stripe = getStripeClient();
    const planKey = String(formData.get("planKey") ?? "").trim();
    const billingInterval = String(formData.get("billingInterval") ?? "").trim();

    if (!isPlanKey(planKey) || !isBillingInterval(billingInterval)) {
      throw new Error("Plan o ciclo de facturación no válido.");
    }

    const customerId = await ensureStripeCustomer();
    const priceId = getPriceIdForPlan(planKey, billingInterval);
    const successUrl = `${getBaseUrl()}/pricing?checkout=success&plan=${planKey}`;
    const cancelUrl = `${getBaseUrl()}/pricing?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        planKey,
        billingInterval,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planKey,
          billingInterval,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      throw new Error("Stripe no ha devuelto la URL de Checkout.");
    }

    redirect(session.url);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se ha podido abrir Stripe Checkout.";

    redirect(`/pricing?error=${encodeURIComponent(message)}`);
  }
}

export async function createCustomerPortalAction() {
  try {
    if (isDemoMode()) {
      redirect(
        "/profile?error=Modo%20demo:%20el%20portal%20de%20cliente%20est%C3%A1%20desactivado.",
      );
    }

    const customerId = await ensureStripeCustomer();
    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getBaseUrl()}/profile?portal=return`,
    });

    redirect(session.url);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se ha podido abrir el portal de cliente.";

    redirect(`/profile?error=${encodeURIComponent(message)}`);
  }
}
