import EmailModuleService from "./service";
import { Module } from "@medusajs/framework/utils";

export const EMAIL_MODULE = "email";

export default Module(EMAIL_MODULE, {
  service: EmailModuleService,
});
