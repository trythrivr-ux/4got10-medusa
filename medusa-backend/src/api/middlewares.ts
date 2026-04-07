import { defineMiddlewares } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

export default defineMiddlewares({
  routes: [
    {
      method: "POST",
      matcher: "/admin/products",
      additionalDataValidator: {
        reveal_date: z.string().datetime().nullable().optional(),
        is_purchasable: z.boolean().optional(),
        is_sold_out: z.boolean().optional(),
      },
    },
    {
      method: "POST",
      matcher: "/admin/products/:id",
      additionalDataValidator: {
        reveal_date: z.string().datetime().nullable().optional(),
        is_purchasable: z.boolean().optional(),
        is_sold_out: z.boolean().optional(),
      },
    },
  ],
})
