import { AppSidebar } from "@/components/app-sidebar";
import { isDemoMode } from "@/lib/demo";
import { getCurrentAppUser, getCurrentProfile } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getCurrentAppUser();
  const profile = await getCurrentProfile();
  const demoMode = isDemoMode();

  return (
    <AppSidebar profile={profile} demoMode={demoMode}>
      {children}
    </AppSidebar>
  );
}
