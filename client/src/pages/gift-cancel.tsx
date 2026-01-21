import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function GiftCancel() {
  const [, setLocation] = useLocation();
  const [itemId, setItemId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("item_id");
    setItemId(id);

    if (id) {
      apiRequest("POST", "/api/gifts/checkout/cancel", { itemId: id })
        .catch(console.error);
    }
  }, []);

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
          <CardDescription>
            Your gift purchase was not completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            No charges were made. The item has been released back to the wishlist.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => setLocation("/matches")} data-testid="button-back-to-matches">
              Back to Matches
            </Button>
            <Button variant="outline" onClick={() => setLocation("/discover")} data-testid="button-back-to-discover">
              Discover More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
