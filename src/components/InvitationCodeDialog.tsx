import type { ReactNode } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, TriangleAlert } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { formatDate } from "../lib/format";

export interface CreatedInvitation {
  id: string;
  name: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
}

/**
 * Shows a staff invitation's one-time code. The API returns the token only
 * in the create response, so this is the only time it can be displayed.
 */
export function InvitationCodeDialog({
  invitation,
  onClose,
  children,
}: {
  invitation: CreatedInvitation | null;
  onClose: () => void;
  /** Extra guidance under the code, e.g. what to do after they accept. */
  children?: ReactNode;
}) {
  return (
    <Modal
      open={!!invitation}
      onClose={onClose}
      title="Invitation created"
      description={invitation ? `${invitation.name} · ${invitation.email}` : undefined}
      icon={<KeyRound className="h-4.5 w-4.5" />}
      footer={
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      {invitation && (
        <div className="space-y-3 text-[12px]">
          <p className="text-muted-foreground">
            Share this one-time invitation code with {invitation.name.split(" ")[0]}. They use it
            to set a password and join. It expires {formatDate(invitation.expires_at)}.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-2.5">
            <code className="min-w-0 flex-1 break-all font-mono text-[11px]">{invitation.token}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                navigator.clipboard
                  .writeText(invitation.token)
                  .then(() => toast.success("Invitation code copied"))
                  .catch(() => toast.error("Couldn't copy — select the code and copy it."))
              }
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-warning">
            <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
            This code is shown only once and can't be retrieved later.
          </p>
          {children}
        </div>
      )}
    </Modal>
  );
}
