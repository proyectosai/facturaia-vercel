import { revalidatePath } from "next/cache";

import { isLocalFileMode } from "@/lib/demo";

export function revalidateAppPath(path: string) {
  if (isLocalFileMode()) {
    return;
  }

  revalidatePath(path);
}
