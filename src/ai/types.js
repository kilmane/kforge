// Plain JS versions of the AI core types (Phase 3.1.0)

export function createAiRequest({
  provider_id,
  model,
  input,
  system = null,
  temperature = null,
  max_output_tokens = null,
  endpoint = null
}) {
  return {
    provider_id,
    model,
    input,
    system,
    temperature,
    max_output_tokens,
    endpoint
  };
}
