import { useState, useEffect } from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Input,
  Label,
} from "@fluentui/react-components";
import { PersonRegular } from "@fluentui/react-icons";

interface AssignDialogProps {
  open: boolean;
  currentOwner?: string;
  onAssign: (newOwner: string) => void;
  onCancel: () => void;
}

export function AssignDialog({ open, currentOwner, onAssign, onCancel }: AssignDialogProps) {
  const [owner, setOwner] = useState("");

  // Reset owner input when dialog opens
  useEffect(() => {
    if (open) setOwner("");
  }, [open]);

  const handleAssign = () => {
    if (owner.trim()) {
      onAssign(owner.trim());
      setOwner("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => { if (!data.open) onCancel(); }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Assign Record</DialogTitle>
          <DialogContent>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {currentOwner && (
                <div style={{ fontSize: "14px", color: "#605e5c" }}>
                  Current owner: <strong>{currentOwner}</strong>
                </div>
              )}
              <div>
                <Label htmlFor="assign-owner" style={{ marginBottom: "4px", display: "block" }}>
                  New Owner
                </Label>
                <Input
                  id="assign-owner"
                  value={owner}
                  onChange={(_, d) => setOwner(d.value)}
                  contentBefore={<PersonRegular />}
                  placeholder="Enter user name"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
            <Button appearance="primary" onClick={handleAssign} disabled={!owner.trim()}>
              Assign
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
