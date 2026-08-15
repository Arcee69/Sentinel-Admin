import { useNavigate } from "react-router-dom";
import { Radio } from "lucide-react";
import { Button } from "../components/ui/Button";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="text-center">
        <p className="font-mono text-6xl font-bold text-gradient-primary">404</p>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button
          variant="primary"
          className="mt-6"
          onClick={() => navigate("/dashboard")}
        >
          <Radio className="h-4 w-4" />
          Return to Command
        </Button>
      </div>
    </div>
  );
}
