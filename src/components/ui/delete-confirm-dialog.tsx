import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "Delete",
}: DeleteConfirmDialogProps) {
  const isMobile = useIsMobile();

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const content = (
    <div className="flex flex-col">
      {/* Header with subtle bg */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4 bg-muted/40 rounded-t-lg">
        <h2 className="text-lg font-bold text-foreground leading-tight">{title}</h2>
        <button
          onClick={() => onOpenChange(false)}
          className="p-0.5 rounded-sm hover:bg-muted transition-colors -mt-0.5 ml-4 shrink-0"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
      {/* Body */}
      <div className="px-6 pt-5 pb-6">
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 pb-6">
        <Button
          variant="outline"
          className="px-7 h-10 text-sm font-medium"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          className="px-7 h-10 text-sm font-medium"
          onClick={handleConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="pb-2">
          <div className="pt-2">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "overflow-hidden"
          )}
        >
          {content}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}