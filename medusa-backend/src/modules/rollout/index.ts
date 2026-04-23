import RolloutModuleService from "./service"
import { Rollout } from "./models/rollout"
import { Module } from "@medusajs/framework/utils"

export const ROLLOUT_MODULE = "rollout"

export default Module(ROLLOUT_MODULE, {
  service: RolloutModuleService,
})
