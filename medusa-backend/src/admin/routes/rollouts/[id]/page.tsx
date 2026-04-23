import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Input, Label, Button, Textarea } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"

const EditRolloutPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [name, setName] = useState("")
  const [announcementDate, setAnnouncementDate] = useState("")
  const [dropDate, setDropDate] = useState("")
  const [soldOutDate, setSoldOutDate] = useState("")
  const [headliner, setHeadliner] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) {
      fetchRollout()
    }
  }, [id])

  const fetchRollout = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/admin/rollouts/${id}`, {
        credentials: "include",
      })
      if (response.ok) {
        const json = await response.json()
        const rollout = json.rollout
        setName(rollout.name || "")
        setAnnouncementDate(rollout.announcement_date ? new Date(rollout.announcement_date).toISOString().slice(0, 16) : "")
        setDropDate(rollout.drop_date ? new Date(rollout.drop_date).toISOString().slice(0, 16) : "")
        setSoldOutDate(rollout.sold_out_date ? new Date(rollout.sold_out_date).toISOString().slice(0, 16) : "")
        setHeadliner(rollout.headliner || "")
        setDescription(rollout.description || "")
      }
    } catch (error) {
      console.error("Failed to fetch rollout:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        name,
        announcement_date: announcementDate ? new Date(announcementDate).toISOString() : null,
        drop_date: dropDate ? new Date(dropDate).toISOString() : null,
        sold_out_date: soldOutDate ? new Date(soldOutDate).toISOString() : null,
        headliner,
        description,
      }

      const response = await fetch(`/admin/rollouts/${id}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        navigate("/admin/rollouts")
      }
    } catch (error) {
      console.error("Failed to update rollout:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-4">
        <Heading level="h3">Loading rollout...</Heading>
      </Container>
    )
  }

  return (
    <Container className="p-4 max-w-4xl">
      <Heading level="h2" className="mb-6">Edit Rollout</Heading>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" size="small">Name of Rollout</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="announcement-date" size="small">Announcement Date (Reveal)</Label>
          <Input
            id="announcement-date"
            type="datetime-local"
            value={announcementDate}
            onChange={(e) => setAnnouncementDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="drop-date" size="small">Drop Date</Label>
          <Input
            id="drop-date"
            type="datetime-local"
            value={dropDate}
            onChange={(e) => setDropDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="sold-out-date" size="small">Sold-out Date (Optional)</Label>
          <Input
            id="sold-out-date"
            type="datetime-local"
            value={soldOutDate}
            onChange={(e) => setSoldOutDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="headliner" size="small">Headliner</Label>
          <Input
            id="headliner"
            value={headliner}
            onChange={(e) => setHeadliner(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description" size="small">Rollout Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div className="flex gap-2 mt-4">
          <Button type="button" variant="secondary" onClick={() => navigate("/admin/rollouts")}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Edit Rollout",
})

export default EditRolloutPage
