# Conversation Tasks, Chat Confirmations, Connection Requests, Feedback, External Review Handoffs

Load for Chat-mode conversation tasks, answering a pending confirmation from a comment, connection access requests, incidental feedback, or PR review handoffs.

## Conversation tasks

When the task context says **Chat mode** (the issue has `conversationAgentId`),
follow that directive for the conversation lifecycle. Research, clarify, and
revise the conversation's `plan` document here. On an authorized handoff, create
ordinary assigned tasks in a suitable project, never with the conversation as
`parentId` and with no blocker relationship back to the conversation. Pick the
shape that fits: one task, one top-level task with child tasks you created under
it, or several separate top-level tasks. Link them in your reply and let them run
normally; do not wait for them or change the conversation's status. Default new
tasks and task suggestions to the agent in this chat (yourself), unless the user
explicitly specifies another agent or person. "For me" alone is not a request to
assign the task to the user. Do not infer a different owner from task suitability.

Copy the relevant approved plan into each execution task **at creation**, using
`create_task.initialPlan` or the HTTP issue-creation body's `initialPlan` field.
Include an `idempotencyKey`. A copy in `description` is not a plan document, and a
later document write can race execution. Verify the created task's `plan`
document before claiming handoff. Preserve the source plan in this conversation.
The ordinary completion, child-task, and blocker instructions below apply to
execution tasks; they do not override chat mode.

### Conversational confirmation answers

When the user answers a pending confirmation in a message, record the answer before acting. Read current cards and comments, then POST `/api/issues/{issueId}/interactions/{interactionId}/resolve-from-comment` with `commentId`, `decision: "accept" | "reject"`, and explicit `selectedOptionIds` for checkbox acceptance (native runners use `call_api`). Ambiguous replies among proposals require clarification. Revisions are not acceptance. Retry the same request after a lost response instead of leaving a pending card. Resolver permissions remain enforced; question forms and governed approvals use their existing controls. See the API reference for scope and retry rules.

In Agent Chat, a question is optional: if the user moves on to another topic, answer that message without requiring them to answer or resolve the earlier question. Leave its card unanswered so they can reopen it later. When a historical answer arrives, use its attached original question as context and continue from the current conversation. Unrelated messages are never approval.

**Connection access requests.**

Use the run-scoped `connections_search` and `connection_request` tools for app
setup. If a saved connection is not enabled for this agent or its tools are Off,
call `connection_request` with its service identifier, saved `connectionId`, and
exact indexed `toolNames`. This creates an embedded human **Grant access** card;
do not substitute an `ask_user_questions` permission checklist or ask the human
to edit settings manually. Yield while waiting. Acceptance resumes the task with
agent-scoped access; writes still require approval. A declined card is not consent
and a connected gateway does not prove the underlying app is authorized.

## Incidental feedback

The `complain` and `suggestion-box` skills are available alongside this skill.
Use them proactively when agent-work friction warrants a raw reaction or a useful
improvement. This is not a mandatory report. Their shared helper is
`scripts/submit-agent-commentary.mjs`, relative to this skill directory. Feedback
stays in this instance with agent/run/task attribution; submit silently once and
continue the primary task even if submission fails.

**External review handoffs.**

For a PR, put its link in the work product's top-level `url` field. If a human
must review or merge it before you can continue, name that action in a durable
human-only interaction with an appropriate continuation policy and leave the
task `in_review`. A `needs_board_review` work-product flag and a periodic monitor
do not create an interaction card. Keep any merge check bounded, record its
purpose in the monitor's `notes`, and verify the actual provider state when you
resume; a confirmation response is not proof of a merge. Update the existing PR
work product when the PR merges or closes instead of registering a duplicate.

The same rule applies to external release approval gates: link the exact run,
create a human-only confirmation asking whether the user approved it in the
provider, and keep the agent assigned with `continuationPolicy: "wake_assignee"`
so the answer resumes verification. A handoff comment asking the user to comment
back or reassign the task is not a confirmation card. The card records the user's
answer; verify the provider's gate and publish result before continuing.
