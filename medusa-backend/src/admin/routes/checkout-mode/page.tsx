import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Badge, Container, Heading, Switch, Label, toast } from "@medusajs/ui";
import { useState, useEffect } from "react";

const CheckoutModePage = () => {
  const [checkoutMode, setCheckoutMode] = useState<"standard" | "embedded">(
    "standard",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stripeMode, setStripeMode] = useState<"test" | "live">("test");

  useEffect(() => {
    fetchCheckoutMode();
  }, []);

  const fetchCheckoutMode = async () => {
    setLoading(true);
    try {
      const response = await fetch("/admin/checkout-mode", {
        credentials: "include",
      });
      if (response.ok) {
        const json = await response.json();
        setCheckoutMode(json.mode || "standard");
        setStripeMode(json.stripe_mode === "live" ? "live" : "test");
      }
    } catch (error) {
      console.error("Failed to fetch checkout mode:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    const newMode = checked ? "embedded" : "standard";
    try {
      const response = await fetch("/admin/checkout-mode", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: newMode }),
      });

      if (response.ok) {
        setCheckoutMode(newMode);
        toast.success(
          `Checkout mode changed to ${newMode === "embedded" ? "embedded Stripe" : "standard"} successfully`,
        );
      } else {
        toast.error("Failed to update checkout mode");
        fetchCheckoutMode();
      }
    } catch (error) {
      console.error("Failed to update checkout mode:", error);
      toast.error("Failed to update checkout mode");
      fetchCheckoutMode();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="p-4">
        <Heading level="h3">Loading...</Heading>
      </Container>
    );
  }

  return (
    <Container className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Heading level="h2">Checkout Mode</Heading>
      </div>

      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
        <Switch
          checked={checkoutMode === "embedded"}
          onCheckedChange={handleToggle}
          disabled={saving}
        />
        <div className="flex flex-col gap-1">
          <Label>Embedded Stripe Checkout</Label>
          <p className="text-sm text-gray-500">
            When enabled, uses embedded Stripe checkout instead of the standard
            checkout page.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border mt-4">
        <Badge color={stripeMode === "live" ? "green" : "orange"}>
          {stripeMode.toUpperCase()}
        </Badge>
        <div className="flex flex-col gap-1">
          <Label>Stripe Mode (read-only)</Label>
          <p className="text-sm text-gray-500">
            Deploy-time only. To change, set <code>STRIPE_MODE=live</code> (or
            <code> test</code>) on Railway and redeploy. The provider's API key
            and webhook secret are loaded once at boot — switching at runtime
            would break webhook signature verification.
          </p>
        </div>
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Checkout Mode",
});

export default CheckoutModePage;
