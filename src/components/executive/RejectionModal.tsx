import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { RejectionReasons, RejectionReasonKey } from "@/types/decisions";
import { X } from "lucide-react";

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: RejectionReasonKey, notes?: string) => void;
  recommendationTitle: string;
}

export const RejectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  recommendationTitle,
}: RejectionModalProps) => {
  const [selectedReason, setSelectedReason] = useState<RejectionReasonKey | undefined>();
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    onConfirm(selectedReason, notes.trim() || undefined);
    // Reset state
    setSelectedReason(undefined);
    setNotes("");
  };

  const handleRejectWithoutReason = () => {
    onConfirm(undefined, undefined);
    // Reset state
    setSelectedReason(undefined);
    setNotes("");
  };

  const handleClose = () => {
    setSelectedReason(undefined);
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-5 w-5 text-red-500" />
            Rejeitar Recomendação
          </DialogTitle>
          <DialogDescription className="text-left">
            <span className="font-medium text-foreground">{recommendationTitle}</span>
            <br />
            <span className="text-muted-foreground text-sm mt-2 block">
              Você pode informar um motivo (opcional) para ajudar o sistema a entender suas decisões.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Motivos (opcional) */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Motivo (opcional)</Label>
            <RadioGroup
              value={selectedReason}
              onValueChange={(value) => setSelectedReason(value as RejectionReasonKey)}
              className="space-y-2"
            >
              {Object.entries(RejectionReasons).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <RadioGroupItem value={key} id={key} />
                  <Label htmlFor={key} className="text-sm font-normal cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Notas adicionais (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Alguma observação adicional..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={handleRejectWithoutReason}
            className="text-muted-foreground"
          >
            Rejeitar sem motivo
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirm}
              disabled={!selectedReason && !notes.trim()}
            >
              Confirmar Rejeição
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
