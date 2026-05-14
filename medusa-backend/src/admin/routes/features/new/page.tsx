import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Input, Label, Button, Select } from "@medusajs/ui"
import { useEffect, useState } from "react"

const SUGGESTED_INDUSTRIES = [
  "Music",
  "Fashion",
  "Art",
  "Sports",
  "Film",
  "Gaming",
]

const CreateFeaturePage = () => {
  const [products, setProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productId, setProductId] = useState("")
  const [name, setName] = useState("")
  const [industry, setIndustry] = useState<string>(SUGGESTED_INDUSTRIES[0])
  const [industryCustom, setIndustryCustom] = useState("")
  const [photoFileId, setPhotoFileId] = useState<string | null>(null)
  const [actionPhotoFileId, setActionPhotoFileId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const fetchProducts = async () => {
      setProductsLoading(true)
      try {
        const res = await fetch("/admin/products", { credentials: "include" })
        if (res.ok) {
          const json = await res.json()
          setProducts(json.products || [])
        }
      } catch (e) {
        console.error("Failed to fetch products", e)
      } finally {
        setProductsLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const handleUpload = async (
    file: File,
    setter: (id: string) => void
  ) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("files", file)
      const res = await fetch("/admin/uploads", {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg)
      }
      const json = await res.json()
      const upload = json.files?.[0]
      const fileId = upload?.id || upload?.file_id
      if (fileId) setter(fileId)
      else throw new Error("No file id returned from upload")
    } catch (e: any) {
      setError(e?.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async () => {
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      if (!productId) throw new Error("Please select a product")
      if (!name.trim()) throw new Error("Please enter a name")
      const industryFinal = industry === "Custom" ? industryCustom : industry
      if (!industryFinal?.trim()) throw new Error("Please set industry")

      const res = await fetch("/admin/features", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Feature: [{
            product_id: productId,
            name,
            industry_category: industryFinal,
            photo_file_id: photoFileId,
            action_photo_file_id: actionPhotoFileId,
          }],
        }),
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg)
      }
      setSuccess("Feature created")
      setName("")
      setIndustry(SUGGESTED_INDUSTRIES[0])
      setIndustryCustom("")
      setProductId("")
      setPhotoFileId(null)
      setActionPhotoFileId(null)
    } catch (e: any) {
      setError(e?.message || "Failed to create feature")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="p-6">
      <Heading level="h1">Create Feature</Heading>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <Label>Attached Product</Label>
          <select
            className="w-full border rounded-md p-2"
            disabled={productsLoading}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">{productsLoading ? "Loading..." : "Select a product"}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Feature Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Young Thug"
          />
        </div>

        <div>
          <Label>Industry Category</Label>
          <select
            className="w-full border rounded-md p-2"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            {[...SUGGESTED_INDUSTRIES, "Custom"].map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {industry === "Custom" && (
            <div className="mt-2">
              <Input
                value={industryCustom}
                onChange={(e) => setIndustryCustom(e.target.value)}
                placeholder="Type custom category"
              />
            </div>
          )}
        </div>

        <div>
          <Label>Feature Photo</Label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleUpload(f, (id) => setPhotoFileId(id))
            }}
          />
          {photoFileId && (
            <div className="text-xs text-gray-600 mt-1">Uploaded: {photoFileId}</div>
          )}
        </div>

        <div>
          <Label>In-Action Photo</Label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleUpload(f, (id) => setActionPhotoFileId(id))
            }}
          />
          {actionPhotoFileId && (
            <div className="text-xs text-gray-600 mt-1">Uploaded: {actionPhotoFileId}</div>
          )}
        </div>
      </div>

      {error && <div className="text-red-600 mt-4">{error}</div>}
      {success && <div className="text-green-600 mt-4">{success}</div>}

      <div className="mt-6">
        <Button disabled={saving || uploading} onClick={onSubmit}>
          {saving ? "Saving..." : "Create Feature"}
        </Button>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Create Feature",
  parent: "/features",
})

export default CreateFeaturePage
