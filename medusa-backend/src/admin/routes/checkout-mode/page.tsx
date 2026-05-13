import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Switch, Label, toast } from "@medusajs/ui";
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

  const handleStripeToggle = async (checked: boolean) => {
    setSaving(true);
    const newStripeMode: "test" | "live" = checked ? "live" : "test";
    try {
      const response = await fetch("/admin/checkout-mode", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stripe_mode: newStripeMode }),
      });

      if (response.ok) {
        setStripeMode(newStripeMode);
        toast.success(
          `Stripe mode set to ${newStripeMode.toUpperCase()} successfully`,
        );
      } else {
        toast.error("Failed to update Stripe mode");
        fetchCheckoutMode();
      }
    } catch (error) {
      console.error("Failed to update Stripe mode:", error);
      toast.error("Failed to update Stripe mode");
      fetchCheckoutMode();
    } finally {
      setSaving(false);
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
        <Switch
          checked={stripeMode === "live"}
          onCheckedChange={handleStripeToggle}
          disabled={saving}
        />
        <div className="flex flex-col gap-1">
          <Label>Stripe Mode: {stripeMode.toUpperCase()}</Label>
          <p className="text-sm text-gray-500">
            Toggle between Test and Live Stripe keys. Test mode uses
            STRIPE_SECRET_KEY_TEST.
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
