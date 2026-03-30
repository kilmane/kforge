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

/*
Discover service providers from the runtime registry.
*/

export function discoverServiceCapabilities() {
  if (!SERVICE_REGISTRY) return [];

  return Object.keys(SERVICE_REGISTRY).map((name) => ({
    name: `Service: ${name}`,
    status: "available",
    route: `Services → ${name}`,
    summary: `Connect and configure the ${name} integration inside KForge.`,
  }));
}

/*
Main discovery entry point.
Future domains can be added here.

Examples:
- template registry
- terminal runner
- environment panel
*/

export function discoverCapabilities() {
  return [...discoverServiceCapabilities()];
}
