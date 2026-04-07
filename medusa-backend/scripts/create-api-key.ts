import { MedusaApp } from "@medusajs/framework"

async function createPublishableKey() {
  const { container } = await MedusaApp()
  
  const apiKeyModule = container.resolve("apiKey")
  
  const apiKey = await apiKeyModule.createApiKeys({
    title: "Storefront Publishable Key",
    type: "publishable",
    created_by: "setup-script",
  })
  
  console.log("Created publishable key:", apiKey)
  console.log("Token:", apiKey.token)
}

createPublishableKey()
  .then(() => {
    console.log("Done!")
    process.exit(0)
  })
  .catch((err) => {
    console.error("Error:", err)
    process.exit(1)
  })
