// src/ai/tools/toolSchema.js

/*
Tool Schema Registry

Provides tool descriptions for the AI model.

Execution still goes through toolRuntime.js.
This file only exposes metadata describing available tools.
*/

export function getToolSchemas() {
  return [
    {
      name: "list_dir",
      description: "List files and folders in a directory.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Directory path to inspect",
          },
        },
        required: ["path"],
      },
    },

    {
      name: "read_file",
      description: "Read contents of a file.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path to read",
          },
        },
        required: ["path"],
      },
    },

    {
      name: "search_in_file",
      description: "Search for text or a pattern inside a file.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path to search",
          },
          query: {
            type: "string",
            description: "Text or pattern to search for",
          },
        },
        required: ["path", "query"],
      },
    },

    {
      name: "write_file",
      description: "Create or overwrite a file.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path to write",
          },
          content: {
            type: "string",
            description: "Full file contents",
          },
          expectedFileFingerprint: {
            type: "string",
            description:
              "For a controlled overwrite of an existing file, the exact fingerprint reported by its latest successful inspection",
          },
        },
        required: ["path", "content"],
      },
    },

    {
      name: "mkdir",
      description: "Create a directory.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Directory path to create",
          },
        },
        required: ["path"],
      },
    },
  ];
}

const CONTROLLED_REPLACE_TEXT_SCHEMA = Object.freeze({
  name: "replace_text",
  description:
    "Replace one unique exact text anchor in an inspected approved file. Controlled implementation only.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Approved inspected project-relative file path",
      },
      expectedFileFingerprint: {
        type: "string",
        description:
          "Exact file fingerprint reported by the successful target-file inspection",
      },
      oldText: {
        type: "string",
        description: "Non-empty exact text that must occur exactly once",
      },
      newText: {
        type: "string",
        description: "Exact replacement text; no regex or patch syntax",
      },
    },
    required: [
      "path",
      "expectedFileFingerprint",
      "oldText",
      "newText",
    ],
  },
});

const CONTROLLED_COMPLETE_OPERATION_SCHEMA = Object.freeze({
  name: "complete_operation",
  description:
    "Record completion of one exact planned implementation operation after post-mutation inspection. Controlled implementation only.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      operationId: {
        type: "string",
        pattern: "^[A-Za-z0-9_.-]{1,120}$",
        description: "Exact deterministic planned operation ID",
      },
      satisfiedResponsibilityIds: {
        type: "array",
        minItems: 1,
        maxItems: 12,
        uniqueItems: true,
        items: {
          type: "string",
          pattern: "^[A-Za-z0-9_.-]{1,80}$",
        },
        description:
          "Exact complete set of structured responsibility IDs satisfied by the operation",
      },
    },
    required: ["operationId", "satisfiedResponsibilityIds"],
  },
});

export function getControlledImplementationToolSchemas() {
  return [
    CONTROLLED_REPLACE_TEXT_SCHEMA,
    CONTROLLED_COMPLETE_OPERATION_SCHEMA,
  ];
}
