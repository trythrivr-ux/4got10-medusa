import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function getApiKey({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "token", "type"],
    filters: {
      type: "publishable",
    },
  })

  if (data && data.length > 0) {
    console.log("Publishable API Keys found:")
    data.forEach((key: any) => {
      console.log(`Title: ${key.title}`)
      console.log(`Token: ${key.token}`)
      console.log(`Type: ${key.type}`)
      console.log("---")
    })
    return data[0].token
  } else {
    console.log("No publishable API keys found")
    return null
  }
}
