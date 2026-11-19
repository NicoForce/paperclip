# Workspaces, Credentials, Granted Secrets

Load when selecting a workspace/repository, running runtime services, proposing a credential, or reading granted secrets.

## Task Files and Workspace Choices

Use the task's provided working directory for task files. `AGENT_HOME` holds personal instructions and memory; provider home is runtime-managed. A task does not need a project or Git repository. Do not clone unrelated repositories or place task output in home to compensate for a missing project.

Use `get_workspace` to inspect the current folder, pending selection, and capabilities. Use `list_workspaces` for authorized existing folders and `list_project_repositories` for repository choices. `select_workspace` and `prepare_repository` express intent; the harness validates and prepares it. Respect `next_normal_admission` responses: keep the current root, do not claim the requested checkout exists, and do not retry in a loop or interrupt the run. Project assignment alone does not relocate files. See `references/issue-workspaces.md` for the API equivalents.

Prefer a matching configured, authorized source over guessing a repository URL. Inspect available runtime and testing capabilities before claiming that browser or command testing is unavailable. When an authorized repository is pending and unfinished work needs it, finish independent work, explain the remaining work, and yield. Native Runner can select the saved same-agent continuation from current task context; it does not need a timer or a user restart. A request only to stage a repository can finish normally without starting more work.

## Issue Workspace Runtime Controls

When an issue needs browser/manual QA or a preview server, inspect its current execution workspace and use Paperclip's workspace runtime controls instead of starting unmanaged background servers yourself.

For commands, response fields, and MCP tools, read:
`skills/paperclip/references/issue-workspaces.md`

## Proposing Credentials Safely

**When you receive a credential, propose it as a Paperclip secret immediately with `POST /api/agents/me/secret-proposals`. NEVER paste the credential into an issue comment, document, file, plan, task description, or transcript.** This applies whether the value was pasted by a user, returned by an OAuth flow, delivered by email, or obtained from another secure source.

Before proposing a credential you MUST read the "Agent secret proposals" section in:
`skills/paperclip/references/api-reference.md`

## Reading Granted Secrets

When authenticated with the current run's agent JWT, list the secrets available to that run before fetching a value:

```bash
PAPERCLIP_API_BASE="${PAPERCLIP_API_URL%/}"
PAPERCLIP_API_BASE="${PAPERCLIP_API_BASE%/api}"
curl -s -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "$PAPERCLIP_API_BASE/api/agents/me/secrets"
```

The list is metadata-only. Fetch a specific value only when needed; the request has no body:

```bash
curl -s -X POST -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  "$PAPERCLIP_API_BASE/api/agents/me/secrets/github_token/value"
```

- An `env.*` secret binding also grants API read access; `access.*` bindings grant API access without env injection.
- Prefer env injection for values needed on every run by the adapter or its child processes.
- Prefer on-demand fetch for values used only on some runs, large or structured values, or skills/tools that do not inherit adapter env.
- Every value fetch, including failures, is audited in `secret_access_events` and `activity_log`; never print, persist, or paste fetched values into task comments.
- These endpoints require the current run-bound agent JWT. Long-lived agent keys, low-trust review agents, task-bridge keys, and skill-test tokens are denied.

Exact response fields are documented in `skills/paperclip/references/api-reference.md`.
