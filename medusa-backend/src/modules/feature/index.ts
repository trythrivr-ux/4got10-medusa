import FeatureModuleService from "./service"
import { Feature } from "./models/feature"
import { Module } from "@medusajs/framework/utils"

export const FEATURE_MODULE = "feature"

export default Module(FEATURE_MODULE, {
  service: FeatureModuleService,
})
