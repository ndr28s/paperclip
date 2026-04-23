import { AlertCircle, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  icon: Icon = AlertCircle,
  title,
  message,
  onRetry,
  retryLabel = "Retry",
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-destructive/10 p-4 mb-4">
        <Icon className="h-10 w-10 text-destructive/60" />
      </div>
      {title && <p className="text-sm font-medium text-foreground mb-1">{title}</p>}
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RotateCcw className="h-4 w-4 mr-1.5" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
