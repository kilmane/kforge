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
    summary: "Connect this project to a Supabase database.",
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
    status: "planned",
    route: "Services -> Payments -> Stripe",
    summary: "Payments integration placeholder for future guided setup.",
    prerequisites: [],
    preferred_ai_behavior: [
      "Be explicit that Stripe exists in KForge as planned work, not a ready guided flow.",
      "Do not present Stripe as already available in Services if it is still planned.",
      "If the user wants payments right now, explain that KForge does not yet provide the same guided Stripe workflow as Supabase.",
      "Do not ask the user how they want to proceed with KForge Services for Stripe because that workflow is not ready yet.",
    ],
    first_response_template: [
      "KForge has Stripe listed under Services -> Payments -> Stripe, but it is currently planned rather than fully guided.",
      "So there is not yet a ready KForge Stripe workflow to send you to.",
      "If you want Stripe now, stay in the chat and I can help you plan or implement it manually.",
    ],
    manual_fallback: [
      "Manual Stripe implementation is acceptable because the KForge guided flow is not yet ready.",
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
