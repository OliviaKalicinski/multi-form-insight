import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  suggestions?: string[];
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  suggestions,
  className,
}: EmptyStateProps) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (action?.onClick) {
      action.onClick();
    } else if (action?.href) {
      navigate(action.href);
    }
  };

  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          {icon}
        </div>
        
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm max-w-md mb-6">
          {description}
        </p>

        {action && (
          <Button onClick={handleAction} className="mb-6">
            {action.label}
          </Button>
        )}

        {suggestions && suggestions.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 w-full max-w-md">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              💡 Dicas:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
