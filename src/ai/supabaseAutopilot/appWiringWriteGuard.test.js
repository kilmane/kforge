import { evaluateSupabaseAppWiringWrite } from "./appWiringWriteGuard";

const contract = [
  {
    table: "public.user_progress",
    ownership: "authenticated-user-owned",
    ownerColumn: "user_id",
    primaryKeys: ["id"],
    columns: [
      {
        name: "id",
        dataType: "uuid",
        nullable: false,
        unique: false,
      },
      {
        name: "user_id",
        dataType: "uuid",
        nullable: false,
        unique: false,
      },
      {
        name: "data",
        dataType: "jsonb",
        nullable: false,
        unique: false,
      },
    ],
  },
];

const reusableHelperContext = {
  plannedOperations: [
    {
      id: "application-operation-main",
      path: "src/App.jsx",
      responsibilityIds: [
        "auth-ui-session",
        "reusable-helper-integration",
      ],
      responsibilities: [
        {
          id: "reusable-helper-integration",
          purpose: "Reuse the inspected existing helper boundary.",
        },
      ],
    },
  ],
  completedOperationIds: [],
  reusableCapabilities: [
    {
      path: "src/lib/supabase.js",
      capabilities: ["auth-session", "data-access", "supabase-client"],
    },
  ],
};

test("blocks a raw Supabase client import from required reusable helper evidence", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: "import { supabase } from './lib/supabase'\n",
    },
    implementationContext: reusableHelperContext,
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/reusable-helper-integration/i);
  expect(result.error).toMatch(/raw exported Supabase client/i);
});

test("blocks an aliased raw Supabase client import", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: "import { supabase as client } from './lib/supabase.js'\n",
    },
    implementationContext: reusableHelperContext,
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/raw exported Supabase client/i);
});

test("blocks a namespace import from reusable helper evidence", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: "import * as supabaseAuth from './lib/supabase'\n",
    },
    implementationContext: reusableHelperContext,
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/entire module namespace/i);
  expect(result.error).toMatch(/indirectly exposes its raw client/i);
});

test("blocks a reusable helper namespace import regardless of local alias", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: "import * as progressQueries from './lib/supabaseQueries'\n",
    },
    implementationContext: {
      ...reusableHelperContext,
      reusableCapabilities: [
        {
          path: "src/lib/supabaseQueries.js",
          capabilities: ["data-access", "supabase-client"],
        },
      ],
    },
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/entire module namespace/i);
});

test("allows helper imports from the same reusable evidence module", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        import {
          signInWithEmail,
          signOut,
          loadUserProgress,
          saveUserProgress,
        } from './lib/supabase'
      `,
    },
    implementationContext: reusableHelperContext,
  });

  expect(result).toEqual({ ok: true, error: "" });
});

test("allows aliased named helper imports from reusable evidence", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        import {
          signInWithEmail as signIn,
          signOut as endSession,
          loadUserProgress as loadProgress,
          saveUserProgress as saveProgress,
        } from './lib/supabase'
      `,
    },
    implementationContext: reusableHelperContext,
  });

  expect(result).toEqual({ ok: true, error: "" });
});

test("blocks direct createClient imports when reusable helper evidence exists", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content:
        "import { createClient as makeClient } from '@supabase/supabase-js'\n",
    },
    implementationContext: reusableHelperContext,
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/client creation access directly/i);
  expect(result.error).toMatch(/@supabase\/supabase-js/i);
});

test("blocks namespace access to the direct Supabase client package", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: "import * as supabaseSdk from '@supabase/supabase-js'\n",
    },
    implementationContext: reusableHelperContext,
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/client creation access directly/i);
});

test("leaves writes unchanged without the reusable-helper responsibility", () => {
  const implementationContext = {
    ...reusableHelperContext,
    plannedOperations: [
      {
        ...reusableHelperContext.plannedOperations[0],
        responsibilityIds: ["auth-ui-session"],
        responsibilities: [],
      },
    ],
  };
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: "import { supabase } from './lib/supabase'\n",
    },
    implementationContext,
  });

  expect(result).toEqual({ ok: true, error: "" });
});

test("allows namespace imports when the target has no reusable-helper responsibility", () => {
  const implementationContext = {
    ...reusableHelperContext,
    plannedOperations: [
      {
        ...reusableHelperContext.plannedOperations[0],
        responsibilityIds: ["auth-ui-session"],
        responsibilities: [],
      },
    ],
  };
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: "import * as supabaseAuth from './lib/supabase'\n",
    },
    implementationContext,
  });

  expect(result).toEqual({ ok: true, error: "" });
});

test("leaves writes unchanged without reusable auth or data evidence", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: "import { supabase } from './lib/supabase'\n",
    },
    implementationContext: {
      ...reusableHelperContext,
      reusableCapabilities: [],
    },
  });

  expect(result).toEqual({ ok: true, error: "" });
});

test("does not enforce a pending operation against an unrelated target", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/Other.jsx",
      content: "import { supabase } from './lib/supabase'\n",
    },
    implementationContext: reusableHelperContext,
  });

  expect(result).toEqual({ ok: true, error: "" });
});

test("allows namespace imports from unrelated relative modules", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: "import * as formatting from './lib/formatting'\n",
    },
    implementationContext: reusableHelperContext,
  });

  expect(result).toEqual({ ok: true, error: "" });
});

test("validates reusable-helper bypass against replace_text materialized content", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "replace_text",
    args: {
      path: "src/App.jsx",
      oldText: "old import",
      newText: "import { signInWithEmail } from './lib/supabase'",
    },
    materializedContent:
      "import { supabase as client } from './lib/supabase'\nexport default App\n",
    implementationContext: reusableHelperContext,
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/raw exported Supabase client/i);
});

test("does not enforce reusable-helper rules after the target operation completes", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: "import { supabase } from './lib/supabase'\n",
    },
    implementationContext: {
      ...reusableHelperContext,
      completedOperationIds: ["application-operation-main"],
    },
  });

  expect(result).toEqual({ ok: true, error: "" });
});

test("leaves unrelated writes unaffected", () => {
  expect(
    evaluateSupabaseAppWiringWrite({
      contract: null,
      toolName: "write_file",
      args: { content: "export default function App() {}" },
    }),
  ).toEqual({ ok: true, error: "" });
});

test("blocks upsert conflict on a non-unique owner column", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      content: `
        await supabase
          .from("user_progress")
          .upsert(
            { id: crypto.randomUUID(), user_id: user.id, data: payload },
            { onConflict: "user_id" },
          )
      `,
    },
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/not declared unique/i);
});

test("blocks insert when a required NOT NULL field is omitted", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      content: `
        await supabase
          .from("user_progress")
          .insert({ user_id: user.id, data: payload })
      `,
    },
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/requires NOT NULL field/i);
  expect(result.error).toMatch(/\bid\b/i);
});

test("blocks undeclared database fields", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      content: `
        await supabase
          .from("user_progress")
          .update({ data: payload, invented_field: true })
      `,
    },
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/undeclared database field/i);
});

test("allows a contract-compatible insert", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      content: `
        await supabase
          .from("user_progress")
          .insert({
            id: crypto.randomUUID(),
            user_id: user.id,
            data: payload,
          })
      `,
    },
  });

  expect(result).toEqual({ ok: true, error: "" });
});

test("blocks a static Supabase table outside the approved contract", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      content: `
        await supabase
          .from("other_table")
          .insert({ id: crypto.randomUUID() })
      `,
    },
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/not present in the approved database contract/i);
});

test("does not treat Array.from as a Supabase table call", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      content: `const values = Array.from("other_table")`,
    },
  });

  expect(result).toEqual({ ok: true, error: "" });
});

test("allows updating only the declared payload field", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      content: `
        await supabase
          .from("user_progress")
          .update({ data: payload })
          .eq("id", rowId)
      `,
    },
  });

  expect(result).toEqual({ ok: true, error: "" });
});

test("validates the materialized result of a controlled replace_text", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "replace_text",
    args: {
      path: "src/App.jsx",
      oldText: "const save = oldSave;",
      newText: "const save = newSave;",
    },
    materializedContent: `
      await supabase
        .from("user_progress")
        .update({ data: payload, invented_field: true })
    `,
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/undeclared database field/i);
});

test("fails closed when replace_text has no trusted materialized result", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "replace_text",
    args: {
      path: "src/App.jsx",
      oldText: "old",
      newText: "new",
    },
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/materialized/i);
});
