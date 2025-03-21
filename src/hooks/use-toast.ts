// A simple wrapper around the sonner toast library for compatibility with existing code
import { toast as sonnerToast } from "sonner";

type ToastProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

export function useToast() {
  const toast = ({ title, description, variant, action }: ToastProps) => {
    if (variant === "destructive") {
      return sonnerToast.error(title, {
        description,
        action,
      });
    }
    
    return sonnerToast(title || "", {
      description,
      action,
    });
  };

  return {
    toast,
  };
} 