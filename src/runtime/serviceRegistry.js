export const SERVICE_REGISTRY = [
  {
    id: "github",
    name: "GitHub",
    description: "Publish this project to a GitHub repository.",
    status: "available",
    envVars: [],
    setupCommand: "service_setup",
  },
  {
    id: "supabase",
    name: "Supabase",
    description:
      "Check this project for Supabase readiness and prepare env placeholders for backend connection.",
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
