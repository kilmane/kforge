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
