import { NextResponse } from "next/server";
import Stripe from "stripe";

import { isSubscriptionActive } from "@/lib/plans";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getIntervalByPriceId, getPlanByPriceId } from "@/lib/stripe-prices";
import { getStripeClient } from "@/lib/stripe";
import type { PlanKey } from "@/lib/types";

export const runtime = "nodejs";

function toIsoDate(timestamp?: number | null) {
  if (!timestamp) {
    return null;
  }

  return new Date(timestamp * 1000).toISOString();
}

async function syncSubscriptionRecord(
  subscription: Stripe.Subscription,
  userIdFallback?: string | null,
) {
  const supabase = createAdminSupabaseClient();
  const item = subscription.items.data[0];

  if (!item) {
    throw new Error("La suscripción de Stripe no contiene ningún precio.");
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const priceId = item.price.id;
  const planKey = getPlanByPriceId(priceId);
  const billingInterval = getIntervalByPriceId(priceId);

  if (!planKey || !billingInterval) {
    throw new Error(`No existe un plan configurado para el price ${priceId}.`);
  }

  let userId = userIdFallback ?? subscription.metadata.userId ?? null;

  if (!userId) {
    const { data: matchedUser } = await supabase
      .from("users")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    userId = matchedUser?.id ?? null;
  }

  if (!userId) {
    throw new Error("No se ha podido resolver el usuario de Supabase.");
  }

  const subscriptionPayload = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    stripe_product_id:
      typeof item.price.product === "string" ? item.price.product : null,
    plan_key: planKey,
    billing_interval: billingInterval,
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_start: toIsoDate(item.current_period_start),
    current_period_end: toIsoDate(item.current_period_end),
    canceled_at: toIsoDate(subscription.canceled_at),
  };

  const { data: savedSubscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .upsert(subscriptionPayload, { onConflict: "stripe_subscription_id" })
    .select("id")
    .single();

  if (subscriptionError || !savedSubscription) {
    throw new Error("No se ha podido sincronizar la suscripción en Supabase.");
  }

  const active = isSubscriptionActive(subscription.status);

  const { error: userError } = await supabase
    .from("users")
    .update({
      stripe_customer_id: customerId,
      current_plan: active ? (planKey as Exclude<PlanKey, "free">) : "free",
      billing_interval: active ? billingInterval : null,
      plan_status: active ? subscription.status : "inactive",
      current_period_end: active ? toIsoDate(item.current_period_end) : null,
      active_subscription_id: active ? savedSubscription.id : null,
    })
    .eq("id", userId);

  if (userError) {
    throw new Error("No se ha podido actualizar el usuario en Supabase.");
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripe = getStripeClient();
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscriptionRecord(
    subscription,
    session.metadata?.userId ?? session.client_reference_id,
  );
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  if (!signature) {
    return NextResponse.json(
      { error: "Falta la cabecera stripe-signature." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se ha podido verificar la firma del webhook.",
      },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscriptionRecord(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se ha podido sincronizar el evento de Stripe.",
      },
      { status: 500 },
    );
  }
}
