import { describe, expect, it, vi } from "vitest";

vi.mock("../services/fast-response-provider.js", () => ({}));
vi.mock("../services/decision-model-provider.js", () => ({}));

const { toAgentApplicationView, toAgentConnectionView } = await import("../routes/tool-access.js");

describe("agent tool config views", () => {
  it("strips credentials and config from connections", () => {
    const view = toAgentConnectionView({
      id: "c1",
      applicationId: "a1",
      name: "GitHub",
      status: "active",
      enabled: false,
      transportConfig: { token: "x" },
      secretRef: "s",
      config: { a: 1 },
    } as never);
    expect(view).toMatchObject({ id: "c1", enabled: false, status: "active", installs: [] });
    expect(JSON.stringify(view)).not.toMatch(/transportConfig|secretRef|config/);
  });

  it("strips extra fields from applications", () => {
    const view = toAgentApplicationView({ id: "a1", name: "GH", config: { k: 1 } } as never);
    expect(view).toEqual({ id: "a1", name: "GH", type: undefined, status: undefined, enabled: undefined, description: null });
  });
});
