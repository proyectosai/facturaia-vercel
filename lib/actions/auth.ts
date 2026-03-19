"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError, z } from "zod";

import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo";
import { getLogoStoragePath } from "@/lib/invoices";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/utils";

export async function requestMagicLinkAction(formData: FormData) {
  if (isDemoMode()) {
    redirect("/dashboard");
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

export async function signOutAction() {
  if (isDemoMode()) {
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
    const supabase = await createServerSupabaseClient();
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

    if (logoFile instanceof File && logoFile.size > 0) {
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

    revalidatePath("/dashboard");
    revalidatePath("/new-invoice");
    revalidatePath("/profile");
    redirect("/profile?updated=1");
  } catch (error) {
    redirect(`/profile?error=${encodeURIComponent(getActionError(error))}`);
  }
}
