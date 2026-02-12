import { useState, useEffect } from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
} from "@fluentui/react-components";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  danger,
}: ConfirmDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  // Reset confirmed state when dialog opens
  useEffect(() => {
    if (open) setConfirmed(false);
  }, [open]);

  const handleConfirm = () => {
    if (confirmed) return;
    setConfirmed(true);
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => { if (!data.open) onCancel(); }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            <p style={{ margin: 0, fontSize: "14px", color: "#323130" }}>{message}</p>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              appearance="primary"
              onClick={handleConfirm}
              disabled={confirmed}
              style={danger ? { backgroundColor: "#d13438", borderColor: "#d13438" } : undefined}
            >
              {confirmLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
