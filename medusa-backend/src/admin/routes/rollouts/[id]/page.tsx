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
import { useNavigate, useParams } from "react-router-dom";

const EditRolloutPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
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
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [headlinerMediaUrls, setHeadlinerMediaUrls] = useState<
    Record<string, string>
  >({});
  const [features, setFeatures] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetchProducts();
    if (id) {
      fetchRollout();
    }
  }, [id]);

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

  const fetchRollout = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/admin/rollouts/${id}`, {
        credentials: "include",
      });
      if (response.ok) {
        const json = await response.json();
        const rollout = json.rollout;
        setName(rollout.name || "");
        setAnnouncementDate(
          rollout.announcement_date
            ? new Date(rollout.announcement_date).toISOString().slice(0, 16)
            : "",
        );
        setDropDate(
          rollout.drop_date
            ? new Date(rollout.drop_date).toISOString().slice(0, 16)
            : "",
        );
        setSoldOutDate(
          rollout.sold_out_date
            ? new Date(rollout.sold_out_date).toISOString().slice(0, 16)
            : "",
        );
        setHeadliner(rollout.headliner || "");
        setDescription(rollout.description || "");
        setSelectedProducts(new Set(rollout.product_ids || []));
        setMedia(rollout.media || []);
        setHeadlinerMedia(rollout.headliner_media || []);
        setFeatures(rollout.features || null);

        // Fetch URLs for media
        const mediaIds = rollout.media || [];
        const headlinerMediaIds = rollout.headliner_media || [];

        const newMediaUrls: Record<string, string> = {};
        const newHeadlinerMediaUrls: Record<string, string> = {};

        for (const mediaId of mediaIds) {
          // Construct URL from file ID - Medusa file URLs follow this pattern
          newMediaUrls[mediaId] = `/files/${mediaId}`;
        }

        for (const headlinerMediaId of headlinerMediaIds) {
          newHeadlinerMediaUrls[headlinerMediaId] =
            `/files/${headlinerMediaId}`;
        }

        setMediaUrls(newMediaUrls);
        setHeadlinerMediaUrls(newHeadlinerMediaUrls);
      }
    } catch (error) {
      console.error("Failed to fetch rollout:", error);
    } finally {
      setLoading(false);
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

  const handleFileUpload = async (file: File, type: "media" | "headliner") => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", file);

      const response = await fetch("/admin/uploads", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      console.log("Upload response status:", response.status);

      if (response.ok) {
        const json = await response.json();
        console.log("Upload response json:", json);

        const upload = json.files?.[0];
        const fileId = upload?.id || upload?.file_id;
        const fileUrl = upload?.url || upload?.file_url || upload?.host;

        console.log("Extracted - fileId:", fileId, "fileUrl:", fileUrl);

        if (fileId) {
          if (type === "media") {
            setMedia([...media, fileId]);
            if (fileUrl) {
              setMediaUrls({ ...mediaUrls, [fileId]: fileUrl });
            }
          } else {
            setHeadlinerMedia([...headlinerMedia, fileId]);
            if (fileUrl) {
              setHeadlinerMediaUrls({
                ...headlinerMediaUrls,
                [fileId]: fileUrl,
              });
            }
          }
        } else {
          console.error("No file ID found in response");
        }
      } else {
        const errorText = await response.text();
        console.error("Upload failed:", response.status, errorText);
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await handleFileUpload(files[0], "media");
  };

  const handleHeadlinerMediaUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await handleFileUpload(files[0], "headliner");
  };

  const handleDrop = async (
    e: React.DragEvent,
    type: "media" | "headliner",
  ) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0], type);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
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

  const removeMedia = (index: number, type: "media" | "headliner") => {
    if (type === "media") {
      const removedId = media[index];
      setMedia(media.filter((_, i) => i !== index));
      setMediaUrls((prev) => {
        const newUrls = { ...prev };
        delete newUrls[removedId];
        return newUrls;
      });
    } else {
      const removedId = headlinerMedia[index];
      setHeadlinerMedia(headlinerMedia.filter((_, i) => i !== index));
      setHeadlinerMediaUrls((prev) => {
        const newUrls = { ...prev };
        delete newUrls[removedId];
        return newUrls;
      });
    }
  };

  const moveMedia = (
    fromIndex: number,
    toIndex: number,
    type: "media" | "headliner",
  ) => {
    const list = type === "media" ? [...media] : [...headlinerMedia];
    const urlList =
      type === "media" ? { ...mediaUrls } : { ...headlinerMediaUrls };
    const [movedItem] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, movedItem);

    if (type === "media") {
      setMedia(list);
      setMediaUrls(urlList);
    } else {
      setHeadlinerMedia(list);
      setHeadlinerMediaUrls(urlList);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

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

      const response = await fetch(`/admin/rollouts/${id}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        navigate("/rollouts");
      }
    } catch (error) {
      console.error("Failed to update rollout:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="p-4">
        <Heading level="h3">Loading rollout...</Heading>
      </Container>
    );
  }

  return (
    <Container className="p-4 max-w-4xl">
      <Heading level="h2" className="mb-6">
        Edit Rollout
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
          <Label size="small">Headliner Media</Label>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, "headliner")}
          >
            <Input
              id="headliner-media"
              type="file"
              onChange={handleHeadlinerMediaUpload}
              disabled={uploading}
              className="hidden"
            />
            <label
              htmlFor="headliner-media"
              className="cursor-pointer text-sm text-ui-fg-subtle hover:text-ui-fg-base"
            >
              {uploading ? "Uploading..." : "Click to upload or drag and drop"}
            </label>
          </div>
          {headlinerMedia.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {headlinerMedia.map((id, index) => (
                <div
                  key={id}
                  className="relative group"
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", index.toString())
                  }
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIndex = parseInt(
                      e.dataTransfer.getData("text/plain"),
                    );
                    moveMedia(fromIndex, index, "headliner");
                  }}
                >
                  {headlinerMediaUrls[id] && (
                    <img
                      src={headlinerMediaUrls[id]}
                      alt={`Headliner ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(index, "headliner")}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label size="small">Media</Label>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, "media")}
          >
            <Input
              id="media"
              type="file"
              onChange={handleMediaUpload}
              disabled={uploading}
              className="hidden"
            />
            <label
              htmlFor="media"
              className="cursor-pointer text-sm text-ui-fg-subtle hover:text-ui-fg-base"
            >
              {uploading ? "Uploading..." : "Click to upload or drag and drop"}
            </label>
          </div>
          {media.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {media.map((id, index) => (
                <div
                  key={id}
                  className="relative group"
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/plain", index.toString())
                  }
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIndex = parseInt(
                      e.dataTransfer.getData("text/plain"),
                    );
                    moveMedia(fromIndex, index, "media");
                  }}
                >
                  {mediaUrls[id] && (
                    <img
                      src={mediaUrls[id]}
                      alt={`Media ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(index, "media")}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
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
            onClick={() => navigate("/rollouts")}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Edit Rollout",
});

export default EditRolloutPage;
