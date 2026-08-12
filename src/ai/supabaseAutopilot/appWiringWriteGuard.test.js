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
