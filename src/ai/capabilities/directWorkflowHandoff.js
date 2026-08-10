export function getDirectWorkflowHandoffRouteDecision({
  promptTask = null,
} = {}) {
  const kind = promptTask?.kind || "";

  if (kind === "expo_terminal_choice") {
    return { action: "expo_terminal_choice" };
  }

  if (kind === "no_project_implementation") {
    return { action: "no_project_implementation" };
  }

  if (kind === "no_project_performance") {
    return { action: "no_project_performance" };
  }

  if (kind === "empty_folder_implementation") {
    return { action: "empty_folder_implementation" };
  }

  if (kind === "empty_folder_performance") {
    return { action: "empty_folder_performance" };
  }

  if (kind === "manual_performance") {
    return { action: "manual_performance" };
  }

  if (kind === "empty_folder_plan") {
    return { action: "empty_folder_plan" };
  }

  if (kind === "open_project_build_app_clarifier") {
    return { action: "open_project_build_app_clarifier" };
  }

  if (kind === "provider_setup") {
    return { action: "provider_setup" };
  }

  if (kind === "openai_service") {
    return { action: "openai_service" };
  }

  if (kind === "stripe_service") {
    return { action: "stripe_service" };
  }

  if (kind === "supabase_autopilot") {
    return { action: "supabase_autopilot" };
  }

  if (kind === "supabase_service") {
    return { action: "supabase_service" };
  }

  if (kind === "deploy_service") {
    return { action: "deploy_service" };
  }

  if (kind === "ambiguous_service_trigger") {
    return {
      action: "ambiguous_service_trigger",
      serviceTrigger: promptTask?.serviceTrigger || null,
    };
  }

  if (kind === "preview_followup") {
    return { action: "preview_followup" };
  }

  if (kind === "dependency_install") {
    return { action: "dependency_install" };
  }

  if (kind === "expo_phone_preview") {
    return { action: "expo_phone_preview" };
  }

  return null;
}
