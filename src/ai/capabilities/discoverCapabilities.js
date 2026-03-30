// src/ai/capabilities/discoverCapabilities.js

/*
Phase 5.0.3

Capability discovery layer.

Purpose:
Allow the AI capability system to discover
real KForge capabilities from registries instead
of relying only on manual manifests.

This prevents drift between product features
and AI awareness.
*/

import { SERVICE_REGISTRY } from "../../runtime/serviceRegistry";
import { TEMPLATE_REGISTRY } from "../../runtime/templateRegistry";

/*
Discover service providers from the runtime registry.
*/

export function discoverServiceCapabilities() {
  if (!Array.isArray(SERVICE_REGISTRY)) return [];

  return SERVICE_REGISTRY.map((service) => ({
    name: `Service: ${service.name}`,
    status: service.status || "available",
    route: `Services → ${service.name}`,
    summary:
      service.description ||
      `Connect and configure the ${service.name} integration inside KForge.`,
  }));
}

/*
Discover templates from the runtime registry.
*/

export function discoverTemplateCapabilities() {
  if (!Array.isArray(TEMPLATE_REGISTRY)) return [];

  return TEMPLATE_REGISTRY.map((template) => ({
    name: `Template: ${template.name}`,
    status: "available",
    route: `Preview → Generate → ${template.name}`,
    summary:
      template.description ||
      `Generate a ${template.name} project from inside KForge.`,
  }));
}

/*
Main discovery entry point.
Future domains can be added here.

Examples:
- environment panel
- project memory
*/

export function discoverCapabilities() {
  return [...discoverServiceCapabilities(), ...discoverTemplateCapabilities()];
}
