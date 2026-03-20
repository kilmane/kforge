export const SERVICE_REGISTRY = [
  {
    id: "supabase",
    name: "Supabase",
    description: "Backend/database foundation for future KForge project setup.",
    status: "available",
    envVars: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
    setupCommand: "service_setup",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Payments integration placeholder for future guided setup.",
    status: "planned",
    envVars: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"],
    setupCommand: "service_setup",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "AI provider integration placeholder for future guided setup.",
    status: "planned",
    envVars: ["OPENAI_API_KEY"],
    setupCommand: "service_setup",
  },
];

export function getServiceById(serviceId) {
  return SERVICE_REGISTRY.find((service) => service.id === serviceId) || null;
}
