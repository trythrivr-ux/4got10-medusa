import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Button, Table } from "@medusajs/ui";
import { useState, useEffect } from "react";

const RolloutsPage = () => {
  const [rollouts, setRollouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRollouts();
  }, []);

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

  if (loading) {
    return (
      <Container className="p-4">
        <Heading level="h3">Loading rollouts...</Heading>
      </Container>
    );
  }

  return (
    <Container className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Heading level="h2">Rollouts</Heading>
        <Button onClick={() => (window.location.href = "/app/rollouts/new")}>
          Create Rollout
        </Button>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Announcement Date</Table.HeaderCell>
            <Table.HeaderCell>Drop Date</Table.HeaderCell>
            <Table.HeaderCell>Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rollouts.map((rollout) => (
            <Table.Row key={rollout.id}>
              <Table.Cell>{rollout.name}</Table.Cell>
              <Table.Cell>
                {rollout.announcement_date
                  ? new Date(rollout.announcement_date).toLocaleDateString()
                  : "Not set"}
              </Table.Cell>
              <Table.Cell>
                {rollout.drop_date
                  ? new Date(rollout.drop_date).toLocaleDateString()
                  : "Not set"}
              </Table.Cell>
              <Table.Cell>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() =>
                    (window.location.href = `/app/rollouts/${rollout.id}`)
                  }
                >
                  Edit
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Rollouts",
});

export default RolloutsPage;
