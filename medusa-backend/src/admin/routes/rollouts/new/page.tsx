import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  Container,
  Heading,
  Input,
  Label,
  Button,
  Textarea,
  Checkbox,
} from "@medusajs/ui";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const CreateRolloutPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [announcementDate, setAnnouncementDate] = useState("");
  const [dropDate, setDropDate] = useState("");
  const [soldOutDate, setSoldOutDate] = useState("");
  const [headliner, setHeadliner] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(),
  );
  const [products, setProducts] = useState<any[]>([]);
  const [media, setMedia] = useState<string[]>([]);
  const [headlinerMedia, setHeadlinerMedia] = useState<string[]>([]);
  const [features, setFeatures] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const response = await fetch("/admin/products", {
        credentials: "include",
      });
      if (response.ok) {
        const json = await response.json();
        setProducts(json.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setProductsLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", files[0]);

      const response = await fetch("/admin/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        const json = await response.json();
        setMedia([...media, json.file.id]);
      }
    } catch (error) {
      console.error("Failed to upload media:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleHeadlinerMediaUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", files[0]);

      const response = await fetch("/admin/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        const json = await response.json();
        setHeadlinerMedia([...headlinerMedia, json.file.id]);
      }
    } catch (error) {
      console.error("Failed to upload headliner media:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      const reader = new FileReader();

      reader.onload = async (event) => {
        const data = event.target?.result;
        if (data) {
          // Parse Excel file - for now, we'll store it as base64
          // In production, you'd use a library like xlsx to parse the Excel
          const base64 = btoa(
            String.fromCharCode(...new Uint8Array(data as ArrayBuffer)),
          );
          setFeatures({
            filename: file.name,
            data: base64,
          });
        }
        setUploading(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Failed to upload Excel:", error);
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name,
        announcement_date: announcementDate
          ? new Date(announcementDate).toISOString()
          : null,
        drop_date: dropDate ? new Date(dropDate).toISOString() : null,
        sold_out_date: soldOutDate ? new Date(soldOutDate).toISOString() : null,
        headliner,
        description,
        media: media,
        features: features,
        headliner_media: headlinerMedia,
        product_ids: Array.from(selectedProducts),
      };

      const response = await fetch("/admin/rollouts", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        navigate("/admin/rollouts");
      }
    } catch (error) {
      console.error("Failed to create rollout:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="p-4 max-w-4xl">
      <Heading level="h2" className="mb-6">
        Create Rollout
      </Heading>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" size="small">
            Name of Rollout
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label size="small">Linked Products</Label>
          {productsLoading ? (
            <div>Loading products...</div>
          ) : (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto border rounded-md p-2">
              {products.map((product) => (
                <div key={product.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedProducts.has(product.id)}
                    onCheckedChange={() => toggleProduct(product.id)}
                  />
                  <span>{product.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="announcement-date" size="small">
            Announcement Date (Reveal)
          </Label>
          <Input
            id="announcement-date"
            type="datetime-local"
            value={announcementDate}
            onChange={(e) => setAnnouncementDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="drop-date" size="small">
            Drop Date
          </Label>
          <Input
            id="drop-date"
            type="datetime-local"
            value={dropDate}
            onChange={(e) => setDropDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="sold-out-date" size="small">
            Sold-out Date (Optional)
          </Label>
          <Input
            id="sold-out-date"
            type="datetime-local"
            value={soldOutDate}
            onChange={(e) => setSoldOutDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="headliner" size="small">
            Headliner
          </Label>
          <Input
            id="headliner"
            value={headliner}
            onChange={(e) => setHeadliner(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="headliner-media" size="small">
            Headliner Media
          </Label>
          <Input
            id="headliner-media"
            type="file"
            onChange={handleHeadlinerMediaUpload}
            disabled={uploading}
          />
          {headlinerMedia.length > 0 && (
            <div className="text-sm text-ui-fg-subtle">
              {headlinerMedia.length} file(s) uploaded
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="media" size="small">
            Media
          </Label>
          <Input
            id="media"
            type="file"
            onChange={handleMediaUpload}
            disabled={uploading}
          />
          {media.length > 0 && (
            <div className="text-sm text-ui-fg-subtle">
              {media.length} file(s) uploaded
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="features" size="small">
            Features (Excel Sheet Import - Optional)
          </Label>
          <div className="flex gap-2">
            <Input
              id="features"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => {
                // Download template - create a simple CSV template
                const template =
                  "Feature Name,Description,Value\nFeature 1,Description 1,Value 1\nFeature 2,Description 2,Value 2";
                const blob = new Blob([template], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "rollout_features_template.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download Template
            </Button>
          </div>
          {features && (
            <div className="text-sm text-ui-fg-subtle">
              Uploaded: {features.filename}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description" size="small">
            Rollout Description
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/admin/rollouts")}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Create Rollout
          </Button>
        </div>
      </form>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "New Rollout",
});

export default CreateRolloutPage;
