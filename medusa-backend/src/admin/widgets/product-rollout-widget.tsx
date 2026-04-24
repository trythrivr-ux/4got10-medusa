import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Select, Label, Button, Text } from "@medusajs/ui";
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types";
import { useState, useEffect } from "react";

const ProductRolloutWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [rollouts, setRollouts] = useState<any[]>([]);
  const [selectedRolloutId, setSelectedRolloutId] = useState<string>("");
  const [currentRolloutId, setCurrentRolloutId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    if (data?.id) {
      fetchRollouts();
      fetchCurrentRollout();
    }
  }, [data?.id]);

  const fetchRollouts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/admin/rollouts", {
        credentials: "include",
      });
      if (response.ok) {
        const json = await response.json();
        setRollouts(json.rollouts || []);
      }
    } catch (error) {
      console.error("Failed to fetch rollouts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentRollout = async () => {
    try {
      const response = await fetch("/admin/rollouts", {
        credentials: "include",
      });
      if (response.ok) {
        const json = await response.json();
        const rollouts = json.rollouts || [];
        // Find which rollout this product is linked to
        const linkedRollout = rollouts.find(
          (rollout: any) =>
            rollout.product_ids && rollout.product_ids.includes(data.id),
        );
        setCurrentRolloutId(linkedRollout?.id || null);
        setSelectedRolloutId(linkedRollout?.id || "");
      }
    } catch (error) {
      console.error("Failed to fetch current rollout:", error);
    }
  };

  const addToRollout = async () => {
    if (!selectedRolloutId) return;

    setSaving(true);
    try {
      // Get the current rollout data
      const response = await fetch(`/admin/rollouts/${selectedRolloutId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const json = await response.json();
        const rollout = json.rollout;
        const currentProductIds = rollout.product_ids || [];

        // Add the product if not already in the list
        if (!currentProductIds.includes(data.id)) {
          const updatedProductIds = [...currentProductIds, data.id];

          const updateResponse = await fetch(
            `/admin/rollouts/${selectedRolloutId}`,
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...rollout,
                product_ids: updatedProductIds,
              }),
            },
          );

          if (updateResponse.ok) {
            setLastSaved(new Date().toLocaleTimeString());
            setCurrentRolloutId(selectedRolloutId);
            fetchCurrentRollout();
          }
        } else {
          // Product already in rollout
          setLastSaved("Already linked");
          setCurrentRolloutId(selectedRolloutId);
        }
      }
    } catch (error) {
      console.error("Failed to add product to rollout:", error);
    } finally {
      setSaving(false);
    }
  };

  const removeFromRollout = async () => {
    if (!currentRolloutId) return;

    setSaving(true);
    try {
      const response = await fetch(`/admin/rollouts/${currentRolloutId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const json = await response.json();
        const rollout = json.rollout;
        const currentProductIds = rollout.product_ids || [];

        // Remove the product from the list
        const updatedProductIds = currentProductIds.filter(
          (id: string) => id !== data.id,
        );

        const updateResponse = await fetch(
          `/admin/rollouts/${currentRolloutId}`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...rollout,
              product_ids: updatedProductIds,
            }),
          },
        );

        if (updateResponse.ok) {
          setLastSaved(new Date().toLocaleTimeString());
          setCurrentRolloutId(null);
          setSelectedRolloutId("");
        }
      }
    } catch (error) {
      console.error("Failed to remove product from rollout:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="p-4">
        <Heading level="h3">Loading rollouts...</Heading>
      </Container>
    );
  }

  const currentRollout = rollouts.find((r) => r.id === currentRolloutId);

  return (
    <Container className="p-4 divide-y divide-ui-border-base">
      <Heading level="h3" className="mb-4">
        Product Rollout
      </Heading>

      <div className="flex flex-col gap-4 py-4">
        {currentRollout ? (
          <div className="flex flex-col gap-2">
            <Label size="small">Current Rollout</Label>
            <Text size="small" className="text-ui-fg-subtle">
              {currentRollout.name}
            </Text>
            <div className="flex gap-2 mt-2">
              <Button
                variant="danger"
                size="small"
                onClick={removeFromRollout}
                isLoading={saving}
              >
                Remove from Rollout
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label size="small">Link to Rollout</Label>
            <Select
              value={selectedRolloutId}
              onValueChange={setSelectedRolloutId}
            >
              <Select.Trigger>
                <Select.Value placeholder="Select a rollout" />
              </Select.Trigger>
              <Select.Content>
                {rollouts.map((rollout) => (
                  <Select.Item key={rollout.id} value={rollout.id}>
                    {rollout.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <Button
              onClick={addToRollout}
              disabled={!selectedRolloutId}
              isLoading={saving}
              className="mt-2"
            >
              Add to Rollout
            </Button>
          </div>
        )}

        <div className="flex justify-between items-center mt-4">
          {lastSaved && (
            <Text size="small" className="text-ui-fg-subtle">
              {lastSaved}
            </Text>
          )}
        </div>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.details.after",
});

export default ProductRolloutWidget;
