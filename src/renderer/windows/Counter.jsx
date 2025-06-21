import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";

export default function Counter() {
  const count = useStore((state) => state.count);
  const increment = useStore((state) => state.increment);
  const decrement = useStore((state) => state.decrement);
  const reset = useStore((state) => state.reset);

  return (
    <div className="w-full flex items-center justify-center py-24">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Counter App</CardTitle>
          <CardDescription>
            A beautifully designed counter with shadcn/ui
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-6xl font-bold tabular-nums text-primary">
              {count}
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={decrement}
              variant="outline"
              size="lg"
              className="w-20"
            >
              <Minus className="h-5 w-5" />
            </Button>

            <Button
              onClick={reset}
              variant="secondary"
              size="lg"
              className="w-20"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>

            <Button onClick={increment} size="lg" className="w-20">
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Use the buttons to control the counter
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
