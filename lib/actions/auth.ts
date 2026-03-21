"use server";

import { revalidateAppPath } from "@/lib/actions/revalidate-path";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError, z } from "zod";

import { requireUser } from "@/lib/auth";
import { isDemoMode, isLocalBootstrapEnabled, isLocalFileMode, isLocalMode } from "@/lib/demo";
import { rethrowIfRedirectError } from "@/lib/actions/redirect-error";
import { getLogoStoragePath } from "@/lib/invoices";
import {
  getLocalAppUserById,
  getLocalSecurityReadiness,
  ensureInitialLocalUser,
  fileToDataUrl,
  getLocalSessionCookieName,
  getLocalSessionMaxAgeSeconds,
  recordLocalAuditEvent,
  saveLocalProfile,
  signLocalSessionToken,
  verifyLocalSessionToken,
} from "@/lib/local-core";
import { assertAllowedUpload, uploadRules } from "@/lib/security";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/utils";

function getRequestIpAddress(headerStore: Headers) {
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");

  if (forwardedFor?.trim()) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return realIp?.trim() || null;
}

function getLocalLockoutErrorMessage(lockedUntil: string) {
  const remainingMs = new Date(lockedUntil).getTime() - Date.now();
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));

  return `Demasiados intentos fallidos. El acceso local queda bloqueado durante ${remainingMinutes} minuto(s).`;
}

export async function requestMagicLinkAction(formData: FormData) {
  if (isDemoMode()) {
    redirect("/dashboard");
  }

  if (isLocalMode()) {
    redirect(
      "/login?error=El%20modo%20local%20usa%20email%20y%20contrase%C3%B1a%2C%20no%20enlace%20m%C3%A1gico.",
    );
  }

  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/login?error=Indica un email válido.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getBaseUrl()}/auth/callback?next=/dashboard`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?sent=1");
}

export async function signInLocalPasswordAction(formData: FormData) {
  if (!isLocalMode()) {
    redirect("/login?error=El%20acceso%20local%20no%20est%C3%A1%20habilitado.");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    redirect("/login?error=Indica%20un%20email%20v%C3%A1lido.");
  }

  if (password.length < 8) {
    redirect("/login?error=La%20contrase%C3%B1a%20debe%20tener%20al%20menos%208%20caracteres.");
  }

  if (isLocalFileMode()) {
    const headerStore = await headers();
    const ipAddress = getRequestIpAddress(headerStore);
    const userAgent = headerStore.get("user-agent");
    const securityReadiness = getLocalSecurityReadiness();

    if (process.env.NODE_ENV === "production" && !securityReadiness.ready) {
      redirect(
        `/login?error=${encodeURIComponent(
          securityReadiness.issues[0] ??
            "La instalación local no cumple los requisitos mínimos de seguridad.",
        )}`,
      );
    }

    if (isLocalBootstrapEnabled()) {
      await ensureInitialLocalUser(email, password);
    }

    const { authenticateLocalUser } = await import("@/lib/local-core");
    const result = await authenticateLocalUser(email, password, {
      ipAddress,
      userAgent,
    });

    if (result.status === "locked") {
      redirect(
        `/login?error=${encodeURIComponent(getLocalLockoutErrorMessage(result.lockedUntil))}`,
      );
    }

    if (result.status === "invalid") {
      redirect(
        `/login?error=${encodeURIComponent(
          `Credenciales incorrectas. Quedan ${result.remainingAttempts} intento(s) antes del bloqueo temporal.`,
        )}`,
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(getLocalSessionCookieName(), signLocalSessionToken(result.user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getLocalSessionMaxAgeSeconds(),
    });

    redirect("/dashboard");
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    redirect(
      "/login?error=Faltan%20variables%20de%20backend%20local%20para%20usar%20este%20modo.",
    );
  }

  if (isLocalBootstrapEnabled()) {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (error) {
      redirect(
        `/login?error=${encodeURIComponent("No se ha podido revisar el usuario local inicial.")}`,
      );
    }

    if ((data?.users?.length ?? 0) === 0) {
      const { error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        redirect(
          `/login?error=${encodeURIComponent(
            createError.message || "No se ha podido crear el usuario local inicial.",
          )}`,
        );
      }
    }
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        "No se ha podido iniciar sesión. Revisa las credenciales o confirma que el usuario local ya fue creado.",
      )}`,
    );
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  if (isDemoMode()) {
    redirect("/");
  }

  if (isLocalFileMode()) {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const token = cookieStore.get(getLocalSessionCookieName())?.value;
    const userId = verifyLocalSessionToken(token);

    if (userId) {
      const user = await getLocalAppUserById(userId);

      if (user) {
        await recordLocalAuditEvent({
          userId: user.id,
          actorType: "user",
          actorId: user.id,
          source: "auth",
          action: "local_logout",
          entityType: "session",
          entityId: user.id,
          afterJson: {
            email: user.email,
          },
          contextJson: {
            ipAddress: getRequestIpAddress(headerStore),
            userAgent: headerStore.get("user-agent"),
          },
        });
      }
    }

    cookieStore.delete(getLocalSessionCookieName());
    redirect("/");
  }

  const supabase = await createServerSupabaseClient();

  await supabase.auth.signOut();
  redirect("/");
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Indica tu nombre o razón social."),
  nif: z.string().trim().min(5, "Indica un NIF válido."),
  address: z.string().trim().min(8, "Indica una dirección válida."),
});

function getActionError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Revisa los datos del formulario.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No se ha podido guardar el perfil.";
}

export async function updateProfileAction(formData: FormData) {
  try {
    if (isDemoMode()) {
      redirect(
        "/profile?error=Modo%20demo:%20los%20cambios%20de%20perfil%20no%20se%20guardan.",
      );
    }

    const user = await requireUser();
    const payload = profileSchema.parse({
      fullName: String(formData.get("fullName") ?? ""),
      nif: String(formData.get("nif") ?? ""),
      address: String(formData.get("address") ?? ""),
    });
    const existingLogoPath =
      String(formData.get("existingLogoPath") ?? "").trim() || null;
    const existingLogoUrl =
      String(formData.get("existingLogoUrl") ?? "").trim() || null;
    const logoFile = formData.get("logo");

    let logoPath = existingLogoPath;
    let logoUrl = existingLogoUrl;

    if (isLocalFileMode()) {
      if (logoFile instanceof File && logoFile.size > 0) {
        assertAllowedUpload(logoFile, uploadRules.logo);
        logoUrl = await fileToDataUrl(logoFile);
        logoPath = null;
      }

      await saveLocalProfile({
        userId: user.id,
        email: user.email ?? "",
        fullName: payload.fullName,
        nif: payload.nif,
        address: payload.address,
        logoUrl,
      });

      revalidateAppPath("/dashboard");
      revalidateAppPath("/new-invoice");
      revalidateAppPath("/profile");
      redirect("/profile?updated=1");
    }

    const supabase = await createServerSupabaseClient();

    if (logoFile instanceof File && logoFile.size > 0) {
      assertAllowedUpload(logoFile, uploadRules.logo);
      const storagePath = getLogoStoragePath(
        user.id,
        logoFile.name || "facturaia-logo.png",
      );
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(storagePath, logoFile, {
          contentType: logoFile.type,
          upsert: true,
        });

      if (uploadError) {
        throw new Error("No se ha podido subir el logo del perfil.");
      }

      const { data: publicLogo } = supabase.storage
        .from("logos")
        .getPublicUrl(storagePath);

      logoPath = storagePath;
      logoUrl = publicLogo.publicUrl;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? "",
      full_name: payload.fullName,
      nif: payload.nif,
      address: payload.address,
      logo_path: logoPath,
      logo_url: logoUrl,
    });

    if (error) {
      throw new Error("No se ha podido guardar el perfil.");
    }

    revalidateAppPath("/dashboard");
    revalidateAppPath("/new-invoice");
    revalidateAppPath("/profile");
    redirect("/profile?updated=1");
  } catch (error) {
    rethrowIfRedirectError(error);
    redirect(`/profile?error=${encodeURIComponent(getActionError(error))}`);
  }
}
