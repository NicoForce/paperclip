// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExecutionReconciliationRecovery } from "./ExecutionReconciliationRecovery";
const api = vi.hoisted(() => ({ resolveRecoveryAction: vi.fn() }));
vi.mock("../api/issues", () => ({ issuesApi: api }));

describe("confirm a previous run stopped", () => {
  let root: Root, container: HTMLDivElement, client: QueryClient;
  const blocker = { recoveryActionId: "action", runId: "run", agentId: "agent", cause: "legacy_execution_requires_reconciliation", nextAction: "" };
  beforeEach(() => {
    vi.clearAllMocks();
    api.resolveRecoveryAction.mockResolvedValue({});
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  });
  afterEach(async () => { await act(async () => root.unmount()); client.clear(); container.remove(); });
  async function mount(props: { canManage?: boolean; blocker?: typeof blocker | null } = {}) {
    await act(async () => root.render(<QueryClientProvider client={client}>
      <ExecutionReconciliationRecovery issueId="task" blocker={props.blocker === undefined ? blocker : props.blocker} canManage={props.canManage ?? true} />
    </QueryClientProvider>));
  }
  it("renders nothing without a reconciliation blocker", async () => {
    await mount({ blocker: null });
    expect(container.innerHTML).toBe("");
    await mount({ blocker: { ...blocker, cause: "other" } });
    expect(container.innerHTML).toBe("");
  });
  it("requires confirmation and evidence, then resolves with the run decision", async () => {
    await mount();
    const button = Array.from(container.querySelectorAll("button")).find(item => item.textContent === "Confirm and continue")!;
    expect(button.disabled).toBe(true);
    await act(async () => {
      const area = container.querySelector("textarea")!;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(area, "Process list shows no live run; no external action was started.");
      area.dispatchEvent(new Event("input", { bubbles: true }));
      container.querySelector<HTMLButtonElement>('[role="checkbox"]')!.click();
    });
    expect(button.disabled).toBe(false);
    await act(async () => button.click());
    expect(api.resolveRecoveryAction).toHaveBeenCalledWith("task", {
      actionId: "action", outcome: "restored", sourceIssueStatus: "todo",
      executionReconciliation: { runId: "run", providerStopped: true, actionOutcome: "not_performed",
        outcomeEvidence: "Process list shows no live run; no external action was started." },
    });
  });
});
