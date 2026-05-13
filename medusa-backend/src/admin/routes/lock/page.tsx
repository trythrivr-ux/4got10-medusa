import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Switch, Label, toast } from "@medusajs/ui";
import { useState, useEffect } from "react";

const LockPage = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLockState();
  }, []);

  const fetchLockState = async () => {
    setLoading(true);
    try {
      const response = await fetch("/admin/lock", {
        credentials: "include",
      });
      if (response.ok) {
        const json = await response.json();
        setIsLocked(json.locked || false);
      }
    } catch (error) {
      console.error("Failed to fetch lock state:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    try {
      const response = await fetch("/admin/lock", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locked: checked }),
      });

      if (response.ok) {
        setIsLocked(checked);
        toast.success(
          `Website ${checked ? "locked" : "unlocked"} successfully`,
        );
      } else {
        toast.error("Failed to update lock state");
        // Revert the toggle if the update failed
        fetchLockState();
      }
    } catch (error) {
      console.error("Failed to update lock state:", error);
      toast.error("Failed to update lock state");
      // Revert the toggle if the update failed
      fetchLockState();
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
        <Heading level="h2">Website Lock</Heading>
      </div>

      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
        <Switch
          checked={isLocked}
          onCheckedChange={handleToggle}
          disabled={saving}
        />
        <div className="flex flex-col gap-1">
          <Label>Lock Website</Label>
          <p className="text-sm text-gray-500">
            When locked, visitors will only be able to access the home page.
          </p>
        </div>
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Website Lock",
});

export default LockPage;
