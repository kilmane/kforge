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

test("blocks a progress database row from being applied as the app payload", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        import { loadUserProgress } from './lib/supabase'

        async function loadProgressForUser(user) {
          const progressData = await loadUserProgress(user.id)
          applyProgress(progressData)
        }
      `,
    },
    implementationContext: {
      ...reusableHelperContext,
      reusableCapabilities: [
        {
          path: "src/lib/supabase.js",
          capabilities: ["auth-session", "data-access", "supabase-client"],
          exportedSymbols: ["loadUserProgress"],
          helperContracts: [
            {
              exportName: "loadUserProgress",
              role: "progress-load",
              resultKind: "database-row",
              payloadPath: "data",
              nullable: true,
              errorMode: "throws",
            },
          ],
        },
      ],
    },
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/progress|payload|database-row|data/i);
});
test("allows a progress database row payload to be applied through its declared payload path", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        import { loadUserProgress } from './lib/supabase'

        async function loadProgressForUser(user) {
          const progressRow = await loadUserProgress(user.id)
          applyProgress(progressRow?.data)
        }
      `,
    },
    implementationContext: {
      ...reusableHelperContext,
      reusableCapabilities: [
        {
          path: "src/lib/supabase.js",
          capabilities: ["auth-session", "data-access", "supabase-client"],
          exportedSymbols: ["loadUserProgress"],
          helperContracts: [
            {
              exportName: "loadUserProgress",
              role: "progress-load",
              resultKind: "database-row",
              payloadPath: "data",
              nullable: true,
              errorMode: "throws",
            },
          ],
        },
      ],
    },
  });

  expect(result).toEqual({ ok: true, error: "" });
});
test("blocks failed progress hydration from enabling autosave of reset defaults", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        import {
          getCurrentUser,
          loadUserProgress,
          saveUserProgress,
        } from './lib/supabase'

        function App() {
          const [user, setUser] = useState(null)
          const [isHydrated, setIsHydrated] = useState(false)

          const resetProgress = () => {
            setSelectedStageId('preparation')
            setPreparationState({})
          }

          const loadProgressForUser = async (currentUser) => {
            setIsHydrated(false)
            resetProgress()

            const progressRow = await loadUserProgress(currentUser.id)
            applyProgress(progressRow?.data)

            setIsHydrated(true)
          }

          useEffect(() => {
            const restoreSession = async () => {
              try {
                const currentUser = await getCurrentUser()
                setUser(currentUser)

                if (currentUser) {
                  await loadProgressForUser(currentUser)
                } else {
                  setIsHydrated(true)
                }
              } catch (error) {
                setAuthMessage(error.message)
                setIsHydrated(true)
              }
            }

            restoreSession()
          }, [])

          useEffect(() => {
            if (!user || !isHydrated) return

            const progressData = {
              selectedStageId,
              preparationState,
            }

            saveUserProgress(user.id, progressData)
          }, [user, isHydrated, selectedStageId, preparationState])
        }
      `,
    },
    implementationContext: {
      ...reusableHelperContext,
      reusableCapabilities: [
        {
          path: "src/lib/supabase.js",
          capabilities: ["auth-session", "data-access", "supabase-client"],
          exportedSymbols: [
            "getCurrentUser",
            "loadUserProgress",
            "saveUserProgress",
          ],
          helperContracts: [
            {
              exportName: "getCurrentUser",
              role: "current-user",
              resultKind: "user",
              errorMode: "throws",
            },
            {
              exportName: "loadUserProgress",
              role: "progress-load",
              resultKind: "database-row",
              payloadPath: "data",
              nullable: true,
              errorMode: "throws",
            },
            {
              exportName: "saveUserProgress",
              role: "progress-save",
              resultKind: "database-row",
              payloadPath: "data",
              nullable: false,
              errorMode: "throws",
            },
          ],
        },
      ],
    },
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/hydration|autosave|reset|load/i);
});
test("blocks failed progress hydration from enabling autosave through finally", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        import {
          loadUserProgress,
          saveUserProgress,
        } from './lib/supabase'

        function App() {
          const [user, setUser] = useState(null)
          const [hasHydrated, setHasHydrated] = useState(false)

          useEffect(() => {
            const hydrateProgress = async () => {
              if (!user) {
                setHasHydrated(false)
                return
              }

              setHasHydrated(false)

              try {
                const progressRow = await loadUserProgress(user.id)
                const savedProgress = progressRow?.data

                if (savedProgress) {
                  applyProgress(savedProgress)
                }
              } catch (error) {
                setAuthMessage('Progress failed to load.')
              } finally {
                setHasHydrated(true)
              }
            }

            hydrateProgress()
          }, [user])

          useEffect(() => {
            if (!user || !hasHydrated) return

            saveUserProgress(user.id, {
              selectedStageId,
              preparationState,
            })
          }, [user, hasHydrated, selectedStageId, preparationState])
        }
      `,
    },
    implementationContext: {
      ...reusableHelperContext,
      reusableCapabilities: [
        {
          path: "src/lib/supabase.js",
          capabilities: ["auth-session", "data-access", "supabase-client"],
          exportedSymbols: [
            "loadUserProgress",
            "saveUserProgress",
          ],
          helperContracts: [
            {
              exportName: "loadUserProgress",
              role: "progress-load",
              resultKind: "database-row",
              payloadPath: "data",
              nullable: true,
              errorMode: "throws",
            },
            {
              exportName: "saveUserProgress",
              role: "progress-save",
              resultKind: "database-row",
              payloadPath: "data",
              nullable: false,
              errorMode: "throws",
            },
          ],
        },
      ],
    },
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/hydration|autosave|finally|load/i);
});
test("allows failed progress hydration to keep autosave disabled", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        import {
          getCurrentUser,
          loadUserProgress,
          saveUserProgress,
        } from './lib/supabase'

        function App() {
          const [user, setUser] = useState(null)
          const [isHydrated, setIsHydrated] = useState(false)

          const loadProgressForUser = async (currentUser) => {
            setIsHydrated(false)

            const progressRow = await loadUserProgress(currentUser.id)
            applyProgress(progressRow?.data)

            setIsHydrated(true)
          }

          useEffect(() => {
            const restoreSession = async () => {
              try {
                const currentUser = await getCurrentUser()
                setUser(currentUser)

                if (currentUser) {
                  await loadProgressForUser(currentUser)
                } else {
                  setIsHydrated(true)
                }
              } catch (error) {
                setAuthMessage(error.message)
                setIsHydrated(false)
              }
            }

            restoreSession()
          }, [])

          useEffect(() => {
            if (!user || !isHydrated) return

            saveUserProgress(user.id, {
              selectedStageId,
              preparationState,
            })
          }, [user, isHydrated, selectedStageId, preparationState])
        }
      `,
    },
    implementationContext: {
      ...reusableHelperContext,
      reusableCapabilities: [
        {
          path: "src/lib/supabase.js",
          capabilities: ["auth-session", "data-access", "supabase-client"],
          exportedSymbols: [
            "getCurrentUser",
            "loadUserProgress",
            "saveUserProgress",
          ],
          helperContracts: [
            {
              exportName: "getCurrentUser",
              role: "current-user",
              resultKind: "user",
              errorMode: "throws",
            },
            {
              exportName: "loadUserProgress",
              role: "progress-load",
              resultKind: "database-row",
              payloadPath: "data",
              nullable: true,
              errorMode: "throws",
            },
            {
              exportName: "saveUserProgress",
              role: "progress-save",
              resultKind: "database-row",
              payloadPath: "data",
              nullable: false,
              errorMode: "throws",
            },
          ],
        },
      ],
    },
  });

  expect(result).toEqual({ ok: true, error: "" });
});
test("blocks a sign-up user from being treated as an authenticated session", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        import {
          signInWithEmail,
          signUpWithEmail,
          loadUserProgress,
        } from './lib/supabase'

        const handleAuthChange = () => null

        async function handleAuthentication() {
          const result = authMode === 'sign-in'
            ? await signInWithEmail(email, password)
            : await signUpWithEmail(email, password)

          const authenticatedUser = result?.user ?? result?.data?.user

          if (authenticatedUser?.id) {
            setUser(authenticatedUser)
          }
        }

        useEffect(() => {
          if (!user) return
          loadUserProgress(user.id)
        }, [user])
      `,
    },
    implementationContext: reusableHelperContext,
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/sign.?up|signup/i);
  expect(result.error).toMatch(/session/i);
});
test("blocks an auth response envelope from being stored as the authenticated user", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "replace_text",
    args: {
      path: "src/App.jsx",
      oldText: "const selectedStage = useMemo(",
      newText: "const selectedStage = useMemo(",
    },
    materializedContent: `
      import {
        getCurrentUser,
        loadUserProgress,
        signInWithEmail,
        signUpWithEmail,
      } from './lib/supabase'

      function App() {
        const [user, setUser] = useState(null)

        useEffect(() => {
          const restoreSession = async () => {
            try {
              const currentUser = await getCurrentUser()
              setUser(currentUser)
            } catch (error) {
              setUser(null)
            }
          }

          restoreSession()
        }, [])

        const handleAuthSubmit = async () => {
          const authenticatedUser = authMode === 'sign-in'
            ? await signInWithEmail(authEmail, authPassword)
            : await signUpWithEmail(authEmail, authPassword)

          setUser(authenticatedUser)
        }

        useEffect(() => {
          if (!user) return
          loadUserProgress(user.id)
        }, [user])
      }
    `,
    implementationContext: reusableHelperContext,
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/auth|response|user/i);
});
test("blocks a sign-in response envelope from being stored as the authenticated user", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        async function handleAuthentication() {
          const result = await signInWithEmail(email, password)
          setUser(result)
        }
      `,
    },
    implementationContext: reusableHelperContext,
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/auth|response|user/i);
});

test("allows a sign-in user extracted from the auth response", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        async function handleAuthentication() {
          const result = await signInWithEmail(email, password)
          setUser(result.data?.user ?? null)
        }
      `,
    },
    implementationContext: reusableHelperContext,
  });

  expect(result).toEqual({ ok: true, error: "" });
});

test("allows unified auth handling through an active session user", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        async function handleAuthentication() {
          const result = authMode === 'sign-in'
            ? await signInWithEmail(email, password)
            : await signUpWithEmail(email, password)

          const session = result.data?.session
          setUser(session?.user ?? null)
        }
      `,
    },
    implementationContext: reusableHelperContext,
  });

  expect(result).toEqual({ ok: true, error: "" });
});

test("blocks a sign-up user when the session is merely mentioned but not used as a gate", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        async function handleAuthentication() {
          const result = await signUpWithEmail(email, password)
          const authenticatedUser = result.data?.user
          const session = result.data?.session

          setUser(authenticatedUser)
        }
      `,
    },
    implementationContext: reusableHelperContext,
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/sign.?up|session/i);
});
test("blocks getCurrentUser handling that catches and rethrows the session error", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        async function restoreSession() {
          try {
            const currentUser = await getCurrentUser()
            setUser(currentUser)
          } catch (error) {
            throw error
          }
        }
      `,
    },
    implementationContext: reusableHelperContext,
  });

  expect(result.ok).toBe(false);
  expect(result.error).toMatch(/getCurrentUser|session/i);
});

test("allows getCurrentUser inside a structurally valid large try catch", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        async function restoreSession() {
          try {
            const currentUser = await getCurrentUser()
            ${"// harmless filler to exceed the old regex window\n".repeat(80)}
            setUser(currentUser)
          } catch (error) {
            setUser(null)
          }
        }
      `,
    },
    implementationContext: reusableHelperContext,
  });

  expect(result).toEqual({ ok: true, error: "" });
});
test("blocks unguarded initial auth hydration when getCurrentUser can reject", () => {
  const result = evaluateSupabaseAppWiringWrite({
    contract,
    toolName: "write_file",
    args: {
      path: "src/App.jsx",
      content: `
        import {
          getCurrentUser,
          loadUserProgress,
        } from './lib/supabase'

        function App() {
          const [user, setUser] = useState(null)
          const [isLoadingProgress, setIsLoadingProgress] = useState(true)

          useEffect(() => {
            let isActive = true

            const loadProgress = async () => {
              setIsLoadingProgress(true)

              const currentUser = await getCurrentUser()
              if (!isActive) return

              setUser(currentUser ?? null)

              if (!currentUser) {
                setIsLoadingProgress(false)
                return
              }

              await loadUserProgress(currentUser.id)
              if (!isActive) return

              setIsLoadingProgress(false)
            }

            loadProgress()

            return () => {
              isActive = false
            }
          }, [])
        }
      `,
    },
    implementationContext: reusableHelperContext,
  })

  expect(result.ok).toBe(false)
  expect(result.error).toMatch(/getCurrentUser/i)
})
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
