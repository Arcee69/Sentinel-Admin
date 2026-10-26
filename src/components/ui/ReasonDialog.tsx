import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Label, Textarea } from "./Field";

/**
 * Confirms a review or state change that the API records with a reason.
 * Mount it with a `key` per request so each opening starts with a blank reason.
 */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  placeholder = "Why? This is recorded on the record's history.",
  busy = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  placeholder?: string;
  busy?: boolean;
  /** A server-side message for the reason field (e.g. from a 422). */
  error?: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState("");
  const message = localError || error;

  function confirm() {
    if (!reason.trim()) {
      setLocalError("Give a short reason — it's recorded on the history.");
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      description={description}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={confirm} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="reason-dialog-input">Reason</Label>
        <Textarea
          id="reason-dialog-input"
          rows={3}
          value={reason}
          placeholder={placeholder}
          onChange={(e) => {
            setReason(e.target.value);
            setLocalError("");
          }}
          aria-invalid={!!message}
        />
        {message && <p className="text-[11px] text-destructive">{message}</p>}
      </div>
    </Modal>
  );
}
