import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Input, Label, Button, Text } from "@medusajs/ui"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { useState, useEffect } from "react"

const ProductMetaWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [dropDate, setDropDate] = useState<string>("")
  const [soldOutDate, setSoldOutDate] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  useEffect(() => {
    if (data?.id) {
      fetchProductMeta()
    }
  }, [data?.id])

  const fetchProductMeta = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/admin/products/${data.id}/meta`, {
        credentials: "include",
      })
      if (response.ok) {
        const json = await response.json()
        const { product_meta } = json
        if (product_meta) {
          setDropDate(product_meta.drop_date ? new Date(product_meta.drop_date).toISOString().slice(0, 16) : "")
          setSoldOutDate(product_meta.sold_out_date ? new Date(product_meta.sold_out_date).toISOString().slice(0, 16) : "")
        }
      }
    } catch (error) {
      console.error("Failed to fetch product meta:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveProductMeta = async () => {
    setSaving(true)
    try {
      const payload = {
        drop_date: dropDate ? new Date(dropDate).toISOString() : null,
        sold_out_date: soldOutDate ? new Date(soldOutDate).toISOString() : null,
      }
      const response = await fetch(`/admin/products/${data.id}/meta`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      if (response.ok) {
        setLastSaved(new Date().toLocaleTimeString())
        setTimeout(fetchProductMeta, 500)
      }
    } catch (error) {
      console.error("Failed to save product meta:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-4">
        <Heading level="h3">Loading product settings...</Heading>
      </Container>
    )
  }

  return (
    <Container className="p-4 divide-y divide-ui-border-base">
      <Heading level="h3" className="mb-4">Product Drop Settings</Heading>
      
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="drop-date" size="small">
            Drop Date (shows countdown until this time)
          </Label>
          <Input
            id="drop-date"
            type="datetime-local"
            value={dropDate}
            onChange={(e) => setDropDate(e.target.value)}
          />
          {dropDate && (
            <Text size="small" className="text-ui-fg-subtle">
              Countdown until: {new Date(dropDate).toLocaleString()}
            </Text>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="sold-out-date" size="small">
            Sold Out Date (shows "Sold Out" from this time onwards)
          </Label>
          <Input
            id="sold-out-date"
            type="datetime-local"
            value={soldOutDate}
            onChange={(e) => setSoldOutDate(e.target.value)}
          />
          {soldOutDate && (
            <Text size="small" className="text-ui-fg-subtle">
              Sold out from: {new Date(soldOutDate).toLocaleString()}
            </Text>
          )}
        </div>

        <div className="flex justify-between items-center mt-4">
          {lastSaved && (
            <Text size="small" className="text-ui-fg-subtle">
              Last saved: {lastSaved}
            </Text>
          )}
          <Button onClick={saveProductMeta} isLoading={saving}>
            Save Settings
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductMetaWidget
