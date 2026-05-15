import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Input, Label, Button } from "@medusajs/ui";
import { useEffect, useState } from "react";

const SUGGESTED_INDUSTRIES = [
  "Music",
  "Fashion",
  "Art",
  "Sports",
  "Film",
  "Gaming",
];

const emptyNewFeature = {
  name: "",
  industry_category: SUGGESTED_INDUSTRIES[0],
  industry_category_custom: "",
  photo_file_id: null as string | null,
  action_photo_file_id: null as string | null,
};

const FeatureListPage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [features, setFeatures] = useState<any[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featurePhotoUrls, setFeaturePhotoUrls] = useState<
    Record<string, string>
  >({});
  const [featureActionPhotoUrls, setFeatureActionPhotoUrls] = useState<
    Record<string, string>
  >({});

  const [newFeature, setNewFeature] = useState(emptyNewFeature);
  const [newFeaturePhotoUrl, setNewFeaturePhotoUrl] = useState<string | null>(
    null,
  );
  const [newFeatureActionPhotoUrl, setNewFeatureActionPhotoUrl] = useState<
    string | null
  >(null);

  const [uploading, setUploading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  console.log("Environment vars:", {
    BACKEND_URL: process.env.BACKEND_URL,
    MEDUSA_BACKEND_URL: process.env.MEDUSA_BACKEND_URL,
  });

  const backendUrl =
    (process.env.BACKEND_URL && process.env.BACKEND_URL !== "/"
      ? process.env.BACKEND_URL
      : null) ||
    (process.env.MEDUSA_BACKEND_URL && process.env.MEDUSA_BACKEND_URL !== "/"
      ? process.env.MEDUSA_BACKEND_URL
      : null) ||
    "http://localhost:9000";

  const normalizedBackendUrl = backendUrl.replace(/\/$/, "");

  console.log("Backend URL:", backendUrl);
  console.log("Normalized Backend URL:", normalizedBackendUrl);

  useEffect(() => {
    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        const res = await fetch("/admin/products", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          setProducts(json.products || []);
        }
      } catch (e) {
        console.error("Failed to fetch products", e);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadFeatures(selectedProductId);
    } else {
      setFeatures([]);
    }
  }, [selectedProductId]);

  const loadFeatures = async (productId: string) => {
    setFeaturesLoading(true);
    try {
      const res = await fetch(`/admin/features?product_id=${productId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setFeatures(json.features || []);
      }
    } catch (e) {
      console.error("Failed to fetch features", e);
    } finally {
      setFeaturesLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.append("files", file);

    const res = await fetch("/admin/uploads", {
      method: "POST",
      credentials: "include",
      body: fd,
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg);
    }

    const json = await res.json();
    const upload = json.files?.[0];
    const fileId = upload?.id || upload?.file_id;
    let fileUrl = upload?.url || upload?.file_url;

    console.log("Upload response:", upload);
    console.log("Extracted - fileId:", fileId, "fileUrl:", fileUrl);

    // Handle protocol-relative URLs (//files/...)
    if (fileUrl && fileUrl.startsWith("//")) {
      const protocol = window.location.protocol;
      fileUrl = `${protocol}${fileUrl}`;
      console.log("Fixed protocol-relative URL:", fileUrl);
    }

    if (!fileId) throw new Error("No file id returned from upload");

    return { fileId, fileUrl };
  };

  const handleFeatureChange = (
    featureId: string,
    field: string,
    value: string | null,
  ) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, [field]: value } : f)),
    );
  };

  const handleExistingFeatureUpload = async (
    featureId: string,
    field: "photo_file_id" | "action_photo_file_id",
    file: File,
  ) => {
    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const { fileId, fileUrl } = await uploadFile(file);
      setFeatures((prev) =>
        prev.map((f) => (f.id === featureId ? { ...f, [field]: fileId } : f)),
      );
      if (field === "photo_file_id" && fileUrl) {
        setFeaturePhotoUrls((prev) => ({ ...prev, [fileId]: fileUrl }));
      } else if (field === "action_photo_file_id" && fileUrl) {
        setFeatureActionPhotoUrls((prev) => ({ ...prev, [fileId]: fileUrl }));
      }
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleNewFeatureUpload = async (
    field: "photo_file_id" | "action_photo_file_id",
    file: File,
  ) => {
    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const { fileId, fileUrl } = await uploadFile(file);
      setNewFeature((prev) => ({ ...prev, [field]: fileId }));
      if (field === "photo_file_id" && fileUrl) {
        setNewFeaturePhotoUrl(fileUrl);
      } else if (field === "action_photo_file_id" && fileUrl) {
        setNewFeatureActionPhotoUrl(fileUrl);
      }
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (featureId: string) => {
    try {
      const res = await fetch(`/admin/features/${featureId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        loadFeatures(selectedProductId);
      }
    } catch (e) {
      console.error("Failed to delete feature", e);
    }
  };

  const handleSaveAll = async () => {
    setError(null);
    setSuccess(null);
    setSavingAll(true);

    try {
      const res = await fetch("/admin/features", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Feature: features.map((f) => ({
            id: f.id,
            name: f.name,
            industry_category: f.industry_category,
            photo_file_id: f.photo_file_id,
            action_photo_file_id: f.action_photo_file_id,
          })),
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }

      setSuccess("Features saved");
    } catch (e: any) {
      setError(e?.message || "Failed to save features");
    } finally {
      setSavingAll(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedProductId) return;

    setError(null);
    setSuccess(null);
    setCreating(true);

    try {
      if (!newFeature.name.trim()) {
        throw new Error("Please enter a name");
      }

      const industryFinal =
        newFeature.industry_category === "Custom"
          ? newFeature.industry_category_custom
          : newFeature.industry_category;

      if (!industryFinal?.trim()) {
        throw new Error("Please set industry");
      }

      const res = await fetch("/admin/features", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Feature: [
            {
              product_id: selectedProductId,
              name: newFeature.name,
              industry_category: industryFinal,
              photo_file_id: newFeature.photo_file_id,
              action_photo_file_id: newFeature.action_photo_file_id,
            },
          ],
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }

      setNewFeature(emptyNewFeature);
      setNewFeaturePhotoUrl(null);
      setNewFeatureActionPhotoUrl(null);
      setSuccess("Feature created");
      loadFeatures(selectedProductId);
    } catch (e: any) {
      setError(e?.message || "Failed to create feature");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Container className="min-h-screen bg-[#09090b] p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <Heading level="h1" className="text-white text-xl font-medium">
            Features
          </Heading>

          {selectedProductId && features.length > 0 && (
            <Button
              onClick={handleSaveAll}
              disabled={savingAll || uploading}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {savingAll ? "Saving..." : "Save all"}
            </Button>
          )}
        </div>

        <div className="mb-6 max-w-md">
          <Label className="mb-2 block text-sm text-gray-400">Product</Label>
          <select
            className="w-full rounded-lg border border-gray-700 bg-[#18181b] px-3 py-2 text-base outline-none text-white"
            disabled={productsLoading}
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="" className="text-gray-400">
              {productsLoading ? "Loading..." : "Select a product"}
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id} className="text-white">
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-900 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-green-900 bg-green-900/20 px-4 py-3 text-sm text-green-400">
            {success}
          </div>
        )}

        {selectedProductId && (
          <div className="overflow-hidden rounded-2xl border border-gray-700 bg-[#18181b] shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#27272a]">
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left font-medium text-gray-300">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-300">
                    Industry
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-300">
                    Photo
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-300">
                    Action photo
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {featuresLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      Loading features...
                    </td>
                  </tr>
                ) : (
                  <>
                    {features.map((f, index) => (
                      <tr
                        key={f.id}
                        className={`border-b border-gray-700 ${
                          index % 2 === 0 ? "bg-[#18181b]" : "bg-[#202022]"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <Input
                            value={f.name}
                            onChange={(e) =>
                              handleFeatureChange(f.id, "name", e.target.value)
                            }
                            className="border-0 bg-transparent shadow-none focus:bg-[#27272a] text-white"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <Input
                            value={f.industry_category || ""}
                            onChange={(e) =>
                              handleFeatureChange(
                                f.id,
                                "industry_category",
                                e.target.value,
                              )
                            }
                            className="border-0 bg-transparent shadow-none focus:bg-[#27272a] text-white"
                          />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {f.photo_file_id ? (
                              <>
                                <img
                                  src={
                                    featurePhotoUrls[f.photo_file_id] ||
                                    `${normalizedBackendUrl}/files/${f.photo_file_id}`
                                  }
                                  alt="Feature"
                                  className="h-10 w-10 rounded-md object-cover border border-gray-600"
                                  onError={(e) => {
                                    console.error("Image load error:", {
                                      photoFileId: f.photo_file_id,
                                      storedUrl:
                                        featurePhotoUrls[f.photo_file_id],
                                      fallbackUrl: `${normalizedBackendUrl}/files/${f.photo_file_id}`,
                                      backendUrl,
                                      normalizedBackendUrl,
                                    });
                                  }}
                                />
                                <label className="cursor-pointer text-xs text-gray-400 hover:text-white">
                                  Replace
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleExistingFeatureUpload(
                                          f.id,
                                          "photo_file_id",
                                          file,
                                        );
                                      }
                                    }}
                                  />
                                </label>
                                <button
                                  onClick={() =>
                                    handleFeatureChange(
                                      f.id,
                                      "photo_file_id",
                                      null,
                                    )
                                  }
                                  className="text-xs text-red-400 hover:text-red-300"
                                >
                                  Remove
                                </button>
                              </>
                            ) : (
                              <label className="cursor-pointer text-xs text-gray-400 hover:text-white">
                                Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleExistingFeatureUpload(
                                        f.id,
                                        "photo_file_id",
                                        file,
                                      );
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {f.action_photo_file_id ? (
                              <>
                                <img
                                  src={
                                    featureActionPhotoUrls[
                                      f.action_photo_file_id
                                    ] ||
                                    `${normalizedBackendUrl}/files/${f.action_photo_file_id}`
                                  }
                                  alt="Action"
                                  className="h-10 w-10 rounded-md object-cover border border-gray-600"
                                />
                                <label className="cursor-pointer text-xs text-gray-400 hover:text-white">
                                  Replace
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleExistingFeatureUpload(
                                          f.id,
                                          "action_photo_file_id",
                                          file,
                                        );
                                      }
                                    }}
                                  />
                                </label>
                                <button
                                  onClick={() =>
                                    handleFeatureChange(
                                      f.id,
                                      "action_photo_file_id",
                                      null,
                                    )
                                  }
                                  className="text-xs text-red-400 hover:text-red-300"
                                >
                                  Remove
                                </button>
                              </>
                            ) : (
                              <label className="cursor-pointer text-xs text-gray-400 hover:text-white">
                                Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleExistingFeatureUpload(
                                        f.id,
                                        "action_photo_file_id",
                                        file,
                                      );
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(f.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-[#202022]">
                      <td className="px-4 py-3">
                        <Input
                          value={newFeature.name}
                          onChange={(e) =>
                            setNewFeature((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="New feature..."
                          className="border-0 bg-transparent shadow-none focus:bg-[#27272a] text-white placeholder:text-gray-500"
                        />
                      </td>

                      <td className="px-4 py-3">
                        {newFeature.industry_category === "Custom" ? (
                          <Input
                            value={newFeature.industry_category_custom}
                            onChange={(e) =>
                              setNewFeature((prev) => ({
                                ...prev,
                                industry_category_custom: e.target.value,
                              }))
                            }
                            placeholder="Custom industry..."
                            className="border-0 bg-transparent shadow-none focus:bg-[#27272a] text-white placeholder:text-gray-500"
                          />
                        ) : (
                          <select
                            value={newFeature.industry_category}
                            onChange={(e) =>
                              setNewFeature((prev) => ({
                                ...prev,
                                industry_category: e.target.value,
                              }))
                            }
                            className="w-full border-0 bg-transparent text-sm outline-none text-white"
                          >
                            {[...SUGGESTED_INDUSTRIES, "Custom"].map((opt) => (
                              <option
                                key={opt}
                                value={opt}
                                className="text-white"
                              >
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {newFeature.photo_file_id ? (
                            <>
                              <img
                                src={
                                  newFeaturePhotoUrl ||
                                  `${normalizedBackendUrl}/files/${newFeature.photo_file_id}`
                                }
                                alt="New feature"
                                className="h-10 w-10 rounded-md object-cover border border-gray-600"
                              />
                              <label className="cursor-pointer text-xs text-gray-400 hover:text-white">
                                Replace
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleNewFeatureUpload(
                                        "photo_file_id",
                                        file,
                                      );
                                    }
                                  }}
                                />
                              </label>
                            </>
                          ) : (
                            <label className="cursor-pointer text-xs text-gray-400 hover:text-white">
                              Upload
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleNewFeatureUpload(
                                      "photo_file_id",
                                      file,
                                    );
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {newFeature.action_photo_file_id ? (
                            <>
                              <img
                                src={
                                  newFeatureActionPhotoUrl ||
                                  `${backendUrl}/files/${newFeature.action_photo_file_id}`
                                }
                                alt="New action"
                                className="h-10 w-10 rounded-md object-cover border border-gray-600"
                              />
                              <label className="cursor-pointer text-xs text-gray-400 hover:text-white">
                                Replace
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleNewFeatureUpload(
                                        "action_photo_file_id",
                                        file,
                                      );
                                    }
                                  }}
                                />
                              </label>
                            </>
                          ) : (
                            <label className="cursor-pointer text-xs text-gray-400 hover:text-white">
                              Upload
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleNewFeatureUpload(
                                      "action_photo_file_id",
                                      file,
                                    );
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <Button
                          onClick={handleCreate}
                          disabled={
                            creating || uploading || !newFeature.name.trim()
                          }
                          className="h-8 bg-blue-600 px-3 text-white hover:bg-blue-700"
                        >
                          {creating ? "Adding..." : "Add"}
                        </Button>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Features",
});

export default FeatureListPage;
