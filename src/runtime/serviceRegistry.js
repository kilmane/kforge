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
      "Check Supabase readiness, guide next development steps, and help create starter integration files after setup.",
    quickActionLabel: "Quick Connect Supabase",
    status: "available",
    envVars: [
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
    ],
    setupCommand: "service_setup",
  },
  {
    id: "stripe",
    name: "Stripe",
    description:
      "Check Stripe readiness, help prepare env files, and guide the next setup steps for payments and webhook-ready projects.",
    quickActionLabel: "Check Stripe setup",
    status: "available",
    envVars: [
      "STRIPE_SECRET_KEY",
      "STRIPE_PUBLISHABLE_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ],
    setupCommand: "service_setup",
  },
  {
    id: "openai",
    name: "OpenAI",
    description:
      "Add OpenAI-powered features to this project, including text generation, chat, and embeddings.",
    status: "available",
    envVars: ["OPENAI_API_KEY"],
    setupCommand: "service_setup",
  },
];

export function getServiceById(serviceId) {
  return SERVICE_REGISTRY.find((service) => service.id === serviceId) || null;
}
