import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  contentClassName?: string;
  bodyClassName?: string;
  scrollBody?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  contentClassName,
  bodyClassName,
  scrollBody = true
}: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={contentClassName ? `p-0 ${contentClassName}` : "p-0"}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div
          className={
            scrollBody
              ? bodyClassName
                ? `max-h-[calc(100vh-9rem)] overflow-y-auto p-5 sm:p-6 ${bodyClassName}`
                : "max-h-[calc(100vh-9rem)] overflow-y-auto p-5 sm:p-6"
              : bodyClassName
                ? `p-5 sm:p-6 ${bodyClassName}`
                : "p-5 sm:p-6"
          }
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
