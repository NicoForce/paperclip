import { describeError } from "@/api/errors";
import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requiresExecutionReconciliation, type ExecutionBlocker } from "@paperclipai/shared";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { NativeSelect } from "./ui/select";

export function ExecutionReconciliationRecovery({ issueId, blocker, canManage, className, onRecorded }: {
  issueId: string;
  blocker: ExecutionBlocker | null | undefined;
  canManage: boolean;
  className?: string;
  onRecorded?: () => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const [providerStopped, setProviderStopped] = useState(false);
  const [actionOutcome, setActionOutcome] = useState<"completed" | "not_performed" | "mixed">("not_performed");
  const [outcomeEvidence, setOutcomeEvidence] = useState("");
  const submit = useMutation({
    mutationFn: () => issuesApi.resolveRecoveryAction(issueId, {
      actionId: blocker!.recoveryActionId!,
      outcome: "restored",
      sourceIssueStatus: "todo",
      executionReconciliation: {
        runId: blocker!.runId!,
        providerStopped: true,
        actionOutcome,
        outcomeEvidence: outcomeEvidence.trim(),
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.activity(issueId) });
      onRecorded?.();
    },
  });
  if (!blocker || !blocker.recoveryActionId || !blocker.runId || !requiresExecutionReconciliation(blocker.cause)) return null;
  return <details className={className} data-testid="execution-reconciliation-recovery">
    <summary className="cursor-pointer text-sm">Confirm the previous run stopped</summary>
    <p className="text-sm text-muted-foreground">
      Paperclip cannot prove the previous run stopped or what it did. Confirm it here to let new messages start. Existing work limits still apply.
    </p>
    {canManage ? <div className="flex flex-col gap-2">
      <fieldset disabled={submit.isPending} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Checkbox id={`${id}-stopped`} checked={providerStopped} onCheckedChange={checked => setProviderStopped(checked === true)} />
          <Label htmlFor={`${id}-stopped`}>I confirmed the previous run is no longer executing.</Label>
        </div>
        <Label htmlFor={`${id}-outcome`}>External actions the previous run performed</Label>
        <NativeSelect id={`${id}-outcome`} value={actionOutcome} onChange={event => setActionOutcome(event.target.value as typeof actionOutcome)}>
          <option value="not_performed">None performed</option>
          <option value="mixed">Some completed, some not performed</option>
          <option value="completed">All completed</option>
        </NativeSelect>
        <Label htmlFor={`${id}-evidence`}>Evidence and actions that must not be repeated</Label>
        <Textarea id={`${id}-evidence`} maxLength={12000} value={outcomeEvidence} onChange={event => setOutcomeEvidence(event.target.value)} />
      </fieldset>
      <div className="flex justify-end">
        <Button disabled={submit.isPending || !providerStopped || outcomeEvidence.trim().length < 20} onClick={() => submit.mutate()}>
          {submit.isPending ? "Recording…" : "Confirm and continue"}
        </Button>
      </div>
      {submit.error && <p role="alert" className="text-destructive">{describeError(submit.error).body}</p>}
    </div> : <p className="text-sm text-muted-foreground">A board member can confirm this from the task.</p>}
  </details>;
}
