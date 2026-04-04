// src/ai/capabilities/kforgeServiceWorkflows.js

export const KFORGE_SERVICE_WORKFLOWS = {
  github: {
    id: "github",
    category: "code",
    name: "GitHub",
    status: "available",
    route: "Services -> Code -> GitHub",
    summary:
      "Use GitHub actions for the current open local project, including publish, push, pull, and open repository.",
    prerequisites: [
      "A project folder should be open before using GitHub actions.",
    ],
    service_notes: [
      "Services -> Code -> GitHub is for actions on the current open local project.",
      "Current GitHub actions include publish, push, pull, and open repository.",
      "This is not the GitHub import flow.",
      "To import a repository into KForge, use: New Project -> Import from GitHub.",
    ],
    preferred_ai_behavior: [
      "Prefer the KForge GitHub service flow before suggesting manual git commands.",
      "If no project folder is open, tell the user to open a project folder first.",
      "Describe GitHub support as a KForge service, not as generic external setup.",
      "Do not claim there is a Connect to GitHub or Import Repository action inside Services unless that capability is actually added later.",
      "Do not say the user can open or import a GitHub repository from Services -> Code -> GitHub.",
      "If the user wants to import a repository into KForge, send them to New Project -> Import from GitHub.",
      "If the user wants GitHub actions for the current open local project, send them to Services -> Code -> GitHub.",
      "Do not continue the GitHub service workflow inside chat unless the user explicitly wants to bypass KForge Services.",
    ],
    first_response_template: [
      "KForge has GitHub support in Services -> Code -> GitHub for actions on the current open local project.",
      "First make sure a project folder is open.",
      "If you want to import a repository into KForge, use: New Project -> Import from GitHub.",
      "If you want GitHub actions for the current open local project, you can now leave the chat and open: Services -> Code -> GitHub.",
      "If you prefer to bypass KForge Services, stay in the chat and I can guide you through a manual GitHub setup instead.",
    ],
    manual_fallback: [
      "Only suggest manual git or GitHub CLI steps if the user explicitly wants to bypass KForge.",
    ],
  },

  supabase: {
    id: "supabase",
    category: "backend",
    name: "Supabase",
    status: "available",
    route: "Services -> Backend -> Supabase",
    summary:
      "Connect this project to a Supabase database and generate starter integration files for development.",
    prerequisites: [
      "A project folder must be open before running Supabase actions.",
    ],
    kforge_paths: {
      beginner: "Quick Connect Supabase",
      step_by_step: "Check Supabase setup",
      optional_steps: [
        "Create .env file",
        "Install Supabase client",
        "Create Supabase client file",
        "Open Supabase",
      ],
    },
    service_notes: [
      'Beginner-friendly path: "Quick Connect Supabase".',
      'Step-by-step path: "Check Supabase setup".',
      "After env setup, common next steps are installing the Supabase client and creating a client file such as src/lib/supabase.js.",
      "KForge can also generate starter development files such as read examples, insert examples, and a reusable query helper.",
      "These developer-assist files help you start integrating Supabase into real application code.",
      "If Supabase is local, KForge also checks for local Supabase configuration.",
    ],
    env_vars: [
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
    ],
    preferred_ai_behavior: [
      "Do not jump straight to creating .env files, SDK code, or asking for credentials.",
      "First explain that KForge can handle this through Services -> Backend -> Supabase.",
      "If no project folder is open, tell the user to open a project folder first.",
      'Recommend "Quick Connect Supabase" for beginners.',
      'Offer "Check Supabase setup" for step-by-step control.',
      "After recommending the KForge workflow, explicitly tell the user they can now leave the chat and continue in KForge Services.",
      "Do not ask the user how they want to proceed with KForge Services.",
      "Do not continue the KForge Services workflow inside chat.",
      "Only move into manual code-first setup if the user explicitly says they do not want to use KForge Services or they want to bypass that flow.",
      "If the user wants the KForge path, stop at guidance and hand off to Services.",
    ],
    first_response_template: [
      "KForge can help with this through Services -> Backend -> Supabase.",
      "First make sure a project folder is open.",
      "You can now leave the chat and open: Services -> Backend -> Supabase.",
      'Start with "Quick Connect Supabase" for the beginner-friendly flow, or use "Check Supabase setup" if you want to go step by step.',
      "You can now leave the chat and proceed with KForge Services. If you prefer to bypass KForge, stay in the chat and I can guide you through a manual setup instead.",
      "Do not continue the KForge Services steps in chat unless the user explicitly asks to bypass KForge Services.",
    ],
    manual_fallback: [
      "Only offer manual .env and client-file wiring after the user chooses the manual path.",
    ],
  },

  stripe: {
    id: "stripe",
    category: "payments",
    name: "Stripe",
    status: "available",
    route: "Services -> Payments -> Stripe",
    summary:
      "Check Stripe readiness, help prepare env files, and guide the next setup steps for payments and webhook-ready projects.",
    prerequisites: [
      "A project folder should be open before running Stripe actions.",
    ],
    kforge_paths: {
      step_by_step: "Check Stripe setup",
      optional_steps: [
        "Create .env file",
        "Open Stripe dashboard",
        "Open Stripe docs",
        "Open Stripe webhook docs",
      ],
    },
    service_notes: [
      'Step-by-step path: "Check Stripe setup".',
      "KForge can check whether STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY are present.",
      "KForge can also check whether STRIPE_WEBHOOK_SECRET is present for webhook-ready server flows.",
      "KForge can help prepare .env.example and create a local .env file when needed.",
      "KForge can open the Stripe dashboard, Stripe docs, or Stripe webhook docs for the next manual steps.",
      "This phase focuses on readiness and setup guidance, not on a full billing dashboard.",
    ],
    env_vars: [
      "STRIPE_SECRET_KEY",
      "STRIPE_PUBLISHABLE_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ],
    preferred_ai_behavior: [
      "Prefer the KForge Stripe service flow before suggesting manual Stripe setup steps.",
      "If no project folder is open, tell the user to open a project folder first.",
      "Describe Stripe support as a KForge service with real setup guidance.",
      'Recommend "Check Stripe setup" as the first step.',
      "Mention webhook readiness when the user is working on checkout completion, subscriptions, or backend Stripe event handling.",
      "After recommending the KForge workflow, explicitly tell the user they can now leave the chat and continue in KForge Services.",
      "Do not ask the user how they want to proceed with KForge Services.",
      "Do not continue the KForge Services workflow inside chat.",
      "Only move into manual Stripe setup if the user explicitly says they want to bypass KForge Services.",
      "If the user wants the KForge path, stop at guidance and hand off to Services.",
    ],
    first_response_template: [
      "KForge can help with this through Services -> Payments -> Stripe.",
      "First make sure a project folder is open.",
      "You can now leave the chat and open: Services -> Payments -> Stripe.",
      'Start with "Check Stripe setup" to verify whether this project already has the core Stripe keys in place.',
      'If needed, use "Create .env file", then open "Stripe dashboard", "Stripe docs", or "Stripe webhook docs" for the next setup steps.',
      "You can now leave the chat and proceed with KForge Services. If you prefer to bypass KForge, stay in the chat and I can guide you through a manual Stripe setup instead.",
      "Do not continue the KForge Services steps in chat unless the user explicitly asks to bypass KForge Services.",
    ],
    manual_fallback: [
      "Only offer manual Stripe env wiring and code integration after the user chooses the manual path.",
    ],
  },

  openai: {
    id: "openai",
    category: "ai",
    name: "OpenAI",
    status: "planned",
    route: "Services -> AI -> OpenAI",
    summary:
      "Add OpenAI-powered features to your project, including text generation, images, and embeddings.",
    prerequisites: [
      "A project folder should be open before running OpenAI setup actions.",
      "An OpenAI API key is required to use the OpenAI API from your project.",
    ],
    kforge_paths: {
      step_by_step: "Check OpenAI setup",
      optional_steps: [
        "Create .env file",
        "Install OpenAI SDK",
        "Create OpenAI client file",
        "Create text generation example",
        "Open OpenAI dashboard",
      ],
    },
    env_vars: ["OPENAI_API_KEY"],
    service_notes: [
      "This service helps integrate OpenAI into the user's project.",
      "It does not configure which AI model powers KForge itself.",
      "Users will normally need their own OpenAI API key.",
      "API usage may incur charges depending on model usage.",
    ],
    preferred_ai_behavior: [
      "Prefer the KForge OpenAI service flow before suggesting manual SDK setup.",
      "If no project folder is open, tell the user to open a project folder first.",
      "Describe OpenAI support as a KForge service for adding AI features to the user's project.",
      "Do not confuse this with choosing the provider that powers KForge's own AI chat.",
      "After recommending the KForge workflow, explicitly tell the user they can now leave the chat and continue in KForge Services.",
      "Do not ask the user how they want to proceed with KForge Services.",
      "Do not continue the KForge Services workflow inside chat.",
      "Only move into manual OpenAI SDK setup if the user explicitly says they do not want to use KForge Services or they want to bypass that flow.",
      "If the user wants the KForge path, stop at guidance and hand off to Services.",
    ],
    first_response_template: [
      "KForge can help with this through Services -> AI -> OpenAI.",
      "First make sure a project folder is open.",
      "You can now leave the chat and open: Services -> AI -> OpenAI.",
      'Start with "Check OpenAI setup" to verify whether this project already has the required environment variable and starter setup.',
      "This service is for adding OpenAI to your project, not for changing which provider powers KForge itself.",
      "You can now leave the chat and proceed with KForge Services. If you prefer to bypass KForge, stay in the chat and I can guide you through a manual OpenAI setup instead.",
      "Do not continue the KForge Services steps in chat unless the user explicitly asks to bypass KForge Services.",
    ],
    manual_fallback: [
      "Only offer manual OpenAI env wiring and SDK integration after the user chooses the manual path.",
    ],
  },

  vercel: {
    id: "vercel",
    category: "deploy",
    name: "Vercel",
    status: "available",
    route: "Services -> Deploy -> Vercel",
    summary: "Deploy this GitHub-connected project with guided Vercel setup.",
    prerequisites: [
      "A project folder should be open before using deploy actions.",
      "Deploy guidance expects a GitHub-connected project.",
    ],
    preferred_ai_behavior: [
      "Prefer the KForge deploy flow before suggesting manual Vercel steps.",
      "If no project folder is open, tell the user to open one first.",
      "If the project is not GitHub-connected, explain that deploy guidance expects a GitHub-connected repo.",
      "For Next.js projects, prefer Vercel as the recommended option.",
      "If Vercel is available in KForge, guide the user to Services first.",
      "Do not continue the deploy service workflow inside chat unless the user explicitly wants to bypass KForge Services.",
    ],
    first_response_template: [
      "KForge can help with this through Services -> Deploy -> Vercel.",
      "First make sure a project folder is open.",
      "You can now leave the chat and open: Services -> Deploy -> Vercel.",
      "Make sure the project is connected to GitHub before using the KForge deploy flow.",
      "For Next.js projects, Vercel is the preferred recommendation.",
      "If you prefer to bypass KForge Services, stay in the chat and I can guide you through a manual Vercel setup instead.",
    ],
    manual_fallback: [
      "Only suggest fully manual Vercel setup if the user asks to bypass KForge.",
    ],
  },

  netlify: {
    id: "netlify",
    category: "deploy",
    name: "Netlify",
    status: "available",
    route: "Services -> Deploy -> Netlify",
    summary: "Deploy this GitHub-connected project with guided Netlify setup.",
    prerequisites: [
      "A project folder should be open before using deploy actions.",
      "Deploy guidance expects a GitHub-connected project.",
    ],
    preferred_ai_behavior: [
      "Prefer the KForge deploy flow before suggesting manual Netlify steps.",
      "If no project folder is open, tell the user to open one first.",
      "If the project is not GitHub-connected, explain that deploy guidance expects a GitHub-connected repo.",
      "For static or Vite-style projects, Netlify can be a good fit.",
      "If Netlify is available in KForge, guide the user to Services first.",
      "Do not continue the deploy service workflow inside chat unless the user explicitly wants to bypass KForge Services.",
    ],
    first_response_template: [
      "KForge can help with this through Services -> Deploy -> Netlify.",
      "First make sure a project folder is open.",
      "You can now leave the chat and open: Services -> Deploy -> Netlify.",
      "Make sure the project is connected to GitHub before using the KForge deploy flow.",
      "For static sites or Vite-style projects, Netlify is often a good fit.",
      "If you prefer to bypass KForge Services, stay in the chat and I can guide you through a manual Netlify setup instead.",
    ],
    manual_fallback: [
      "Only suggest fully manual Netlify setup if the user asks to bypass KForge.",
    ],
  },
};

export function getKforgeServiceWorkflow(serviceId) {
  return KFORGE_SERVICE_WORKFLOWS[serviceId] || null;
}

export function listKforgeServiceWorkflows() {
  return Object.values(KFORGE_SERVICE_WORKFLOWS);
}
