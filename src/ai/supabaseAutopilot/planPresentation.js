export function presentSupabaseAutopilotPlan(plan) {
  const databaseSteps = plan.proposedDatabaseObjects.map(
    (item) =>
      `${plainOperation(item.operation)} ${item.name} to ${lowerFirst(
        item.purpose,
      )}`,
  );
  const policySteps = plan.proposedRlsPolicyIntent.map(
    (item) => `Add RLS policies for ${item.table} so ${lowerFirst(item.intent)}`,
  );
  const applicationSteps = plan.proposedApplicationFileOperations.map(
    (item) =>
      `${plainOperation(item.operation)} ${item.path} to ${lowerFirst(
        item.purpose,
      )}`,
  );
  const packageSteps = plan.proposedPackageOperations.map(
    (item) => `Add ${item.package} with ${plan.detectedPackageManager}`,
  );

  return {
    title: `Plan for: ${plan.requestedObjective}`,
    summary: [
      `KForge inspected ${plan.projectApplicationIdentity.applicationName} and Supabase project ${plan.projectApplicationIdentity.supabaseProjectName} in read-only mode.`,
      `The detected application is ${displayFramework(
        plan.detectedFramework,
      )} using ${plan.detectedPackageManager}.`,
      plan.mutationRequired
        ? "The future implementation would require changes, but this milestone has made none."
        : "No implementation operations are proposed until the unsupported conditions are resolved.",
    ],
    steps: [
      ...databaseSteps,
      ...policySteps,
      ...applicationSteps,
      ...packageSteps,
      ...plan.proposedVerificationSteps,
    ],
    warnings: plan.warnings,
    unsupportedConditions: plan.unsupportedConditions,
    risk: plan.riskClassification,
    shortFingerprint: plan.fingerprint.slice(-12),
  };
}

function plainOperation(operation) {
  switch (operation) {
    case "create-table":
      return "Create";
    case "review-table":
      return "Review and extend";
    case "review-and-update":
      return "Review and update";
    case "create-or-update":
      return "Create or update";
    default:
      return "Propose";
  }
}

function displayFramework(framework) {
  if (framework === "vite-react") return "Vite + React";
  if (framework === "ambiguous") return "an ambiguous framework";
  return "an unsupported framework";
}

function lowerFirst(value) {
  const text = String(value || "");
  return text ? `${text[0].toLowerCase()}${text.slice(1)}` : "";
}
