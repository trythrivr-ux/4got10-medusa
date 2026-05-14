import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Container, Heading } from "@medusajs/ui";
import { useEffect, useState } from "react";

const FeatureListPage = () => {
  const [features, setFeatures] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/admin/features", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setFeatures(json.features || []);
      }
    };
    load();
  }, []);

  return (
    <Container className="p-6">
      <Heading level="h1">Features</Heading>
      <div className="mt-6 space-y-3">
        {features.map((f) => (
          <div key={f.id} className="border rounded-md p-3">
            <div className="font-medium">{f.name}</div>
            <div className="text-sm text-gray-600">Product: {f.product_id}</div>
            <div className="text-sm text-gray-600">
              Industry: {f.industry_category}
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Features",
});

export default FeatureListPage;
