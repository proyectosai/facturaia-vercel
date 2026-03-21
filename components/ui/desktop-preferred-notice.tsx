import { MonitorSmartphone } from "lucide-react";

type DesktopPreferredNoticeProps = {
  title?: string;
  description: string;
};

export function DesktopPreferredNotice({
  title = "Mejor en escritorio",
  description,
}: DesktopPreferredNoticeProps) {
  return (
    <div className="rounded-[24px] border border-[color:rgba(19,45,52,0.12)] bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(244,239,230,0.84))] p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white p-2.5 text-[color:var(--color-brand)] shadow-sm">
          <MonitorSmartphone className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
