import { describe, expect, it, vi } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { createMissionNativeCloseoutCandidate } from "../training/missionNativeCloseoutCandidate.js";
import { buildMissionNativeCloseoutPolicy } from "../training/missionNativeCloseoutPolicy.js";
import { buildMissionNativeCloseoutPolicyV2 } from "../training/missionNativeCloseoutPolicyV2.js";
import { buildMissionNativeCloseoutPolicyV3 } from "../training/missionNativeCloseoutPolicyV3.js";
import { buildMissionNativeCloseoutPolicyV4 } from "../training/missionNativeCloseoutPolicyV4.js";
import { buildMissionNativeCloseoutPolicyV5 } from "../training/missionNativeCloseoutPolicyV5.js";
import { buildMissionNativeCloseoutPolicyV12 } from "../training/missionNativeCloseoutPolicyV12.js";
import { buildMissionNativeCloseoutPolicyV13 } from "../training/missionNativeCloseoutPolicyV13.js";
import { buildMissionNativeCloseoutPolicyV14 } from "../training/missionNativeCloseoutPolicyV14.js";
import { buildMissionNativeCloseoutPolicyV15 } from "../training/missionNativeCloseoutPolicyV15.js";
import { buildMissionNativeCloseoutPolicyV16 } from "../training/missionNativeCloseoutPolicyV16.js";
import { buildMissionNativeCloseoutPolicyV17 } from "../training/missionNativeCloseoutPolicyV17.js";
import { buildMissionNativeCloseoutPolicyV18 } from "../training/missionNativeCloseoutPolicyV18.js";
import { buildMissionNativeCloseoutPolicyV19 } from "../training/missionNativeCloseoutPolicyV19.js";
import { buildMissionNativeCloseoutPolicyV20 } from "../training/missionNativeCloseoutPolicyV20.js";
import { buildMissionNativeCloseoutPolicyV21 } from "../training/missionNativeCloseoutPolicyV21.js";
import { buildMissionNativeCloseoutPolicyV22 } from "../training/missionNativeCloseoutPolicyV22.js";
import { buildMissionNativeCloseoutPolicyV23 } from "../training/missionNativeCloseoutPolicyV23.js";
import { buildMissionNativeCloseoutPolicyV24 } from "../training/missionNativeCloseoutPolicyV24.js";
import { buildMissionNativeCloseoutPolicyV25 } from "../training/missionNativeCloseoutPolicyV25.js";
import { buildMissionNativeCloseoutPolicyV26 } from "../training/missionNativeCloseoutPolicyV26.js";
import { buildMissionNativeCloseoutPolicyV27 } from "../training/missionNativeCloseoutPolicyV27.js";
import { buildMissionNativeCloseoutPolicyV28 } from "../training/missionNativeCloseoutPolicyV28.js";
import { buildMissionNativeCloseoutPolicyV29 } from "../training/missionNativeCloseoutPolicyV29.js";
import { buildMissionNativeCloseoutPolicyV30 } from "../training/missionNativeCloseoutPolicyV30.js";
import { buildMissionNativeCloseoutPolicyV31 } from "../training/missionNativeCloseoutPolicyV31.js";
import { buildMissionNativeCloseoutPolicyV32 } from "../training/missionNativeCloseoutPolicyV32.js";
import { buildMissionNativeCloseoutPolicyV33 } from "../training/missionNativeCloseoutPolicyV33.js";
import { buildMissionNativeCloseoutPolicyV34 } from "../training/missionNativeCloseoutPolicyV34.js";

describe("mission-native closeout candidate", () => {
    it("returns the exact external baseline path when disabled", () => {
        const direct = { kind: "direct" } as any;
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(() => direct),
            createDefaultStrategy: vi.fn(),
            createWithStrategy: vi.fn(),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicy(false),
        )).toBe(direct);
        expect(factory.create).toHaveBeenCalledOnce();
        expect(factory.createDefaultStrategy).not.toHaveBeenCalled();
        expect(factory.createWithStrategy).not.toHaveBeenCalled();
    });

    it("injects a wrapper around the external default strategy when enabled", () => {
        const injected = { kind: "injected" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicy(),
        )).toBe(injected);
        expect(factory.createDefaultStrategy).toHaveBeenCalledOnce();
        expect(factory.createWithStrategy).toHaveBeenCalledWith(
            "candidate",
            Countries.USA,
            expect.objectContaining({ onAiUpdate: expect.any(Function) }),
        );
        expect(factory.create).not.toHaveBeenCalled();
    });

    it("accepts the frozen completion-race v2 policy", () => {
        const injected = { kind: "injected-v2" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicyV2(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    });

    it("accepts the frozen bounded-screen v3 policy", () => {
        const injected = { kind: "injected-v3" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicyV3(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    });

    it("accepts the frozen progress-retargeting v4 policy", () => {
        const injected = { kind: "injected-v4" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicyV4(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    });

    it("accepts the frozen single-screen v5 policy", () => {
        const injected = { kind: "injected-v5" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicyV5(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    });

    it("accepts the frozen transfer-certified v12 policy", () => {
        const injected = { kind: "injected-v12" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicyV12(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    });

    it("accepts the frozen mission-owned-assembly v13 policy", () => {
        const injected = { kind: "injected-v13" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicyV13(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    });

    it("accepts the frozen staged first-blocker v14 policy", () => {
        const injected = { kind: "injected-v14" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicyV14(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    });

    it("accepts the frozen contact-clearance v15 policy", () => {
        const injected = { kind: "injected-v15" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicyV15(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    });

    it("accepts the frozen continuous-vanguard v16 policy", () => {
        const injected = { kind: "injected-v16" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicyV16(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    });

    it("accepts the frozen assault-infrastructure v17 policy", () => {
        const injected = { kind: "injected-v17" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicyV17(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    });

    it("accepts the frozen terminal-infrastructure-priority v18 policy", () => {
        const injected = { kind: "injected-v18" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicyV18(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    });

    it("accepts the frozen terminal-production-reservation v19 policy", () => {
        const injected = { kind: "injected-v19" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicyV19(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    }, 15_000);

    it("accepts the frozen persistent-production-scope v20 policy", () => {
        const injected = { kind: "injected-v20" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.USA,
            buildMissionNativeCloseoutPolicyV20(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    }, 15_000);

    it("accepts the frozen readiness-defense v21 policy", () => {
        const injected = { kind: "injected-v21" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(), createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory, "candidate", Countries.USA, buildMissionNativeCloseoutPolicyV21(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    }, 15_000);

    it("accepts the frozen combined-arms v22 policy", () => {
        const injected = { kind: "injected-v22" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(), createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory, "candidate", Countries.USA, buildMissionNativeCloseoutPolicyV22(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    }, 30_000);

    it("accepts the frozen factory-triggered screen v23 policy", () => {
        const injected = { kind: "injected-v23" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(), createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory, "candidate", Countries.USA, buildMissionNativeCloseoutPolicyV23(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    }, 60_000);

    it("accepts the frozen progressive-blocker v24 policy", () => {
        const injected = { kind: "injected-v24" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(), createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory, "candidate", Countries.USA, buildMissionNativeCloseoutPolicyV24(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    }, 90_000);

    it("accepts the frozen capability-certificate v25 policy", () => {
        const injected = { kind: "injected-v25" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(), createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory, "candidate", Countries.USA, buildMissionNativeCloseoutPolicyV25(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    }, 120_000);

    it("accepts the frozen regenerative-progress v26 policy", () => {
        const injected = { kind: "injected-v26" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(), createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory, "candidate", Countries.USA, buildMissionNativeCloseoutPolicyV26(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    }, 150_000);

    it("accepts the frozen transferable-wave continuity v27 policy", () => {
        const injected = { kind: "injected-v27" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(), createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory, "candidate", Countries.USA, buildMissionNativeCloseoutPolicyV27(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    }, 180_000);

    it("accepts the frozen objective-feasibility arbitration v28 policy", () => {
        const injected = { kind: "injected-v28" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(), createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory, "candidate", Countries.USA, buildMissionNativeCloseoutPolicyV28(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    }, 210_000);

    it("accepts the frozen preterminal force-certification v29 policy", () => {
        const injected = { kind: "injected-v29" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(), createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory, "candidate", Countries.USA, buildMissionNativeCloseoutPolicyV29(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    }, 240_000);

    it("accepts the prospective production-safe screen-infrastructure v30 policy", () => {
        const injected = { kind: "injected-v30" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(), createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory, "candidate", Countries.IRAQ, buildMissionNativeCloseoutPolicyV30(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    }, 240_000);

    it("accepts the prospective queue-safe production-focus v31 policy", () => {
        const injected = { kind: "injected-v31" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(), createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory, "candidate", Countries.IRAQ, buildMissionNativeCloseoutPolicyV31(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    }, 300_000);

    it("accepts the prospective exclusive production-focus v32 policy", () => {
        const injected = { kind: "injected-v32" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(), createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory, "candidate", Countries.IRAQ, buildMissionNativeCloseoutPolicyV32(),
        )).toBe(injected);
        expect(factory.createWithStrategy).toHaveBeenCalledOnce();
    }, 300_000);

    it("routes V33 through the external queue-controller focus adapter", () => {
        const injected = { kind: "injected-v33" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const telemetrySink = vi.fn();
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(),
            createWithStrategyAndExclusiveProductionFocus: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.IRAQ,
            buildMissionNativeCloseoutPolicyV33(),
            telemetrySink,
        )).toBe(injected);
        expect(factory.createWithStrategyAndExclusiveProductionFocus).toHaveBeenCalledWith(
            "candidate",
            Countries.IRAQ,
            expect.objectContaining({ onAiUpdate: expect.any(Function) }),
            telemetrySink,
        );
        expect(factory.createWithStrategy).not.toHaveBeenCalled();
        expect(factory.create).not.toHaveBeenCalled();
    }, 300_000);

    it("routes V34 objective-race allocation through the same external focus adapter", () => {
        const injected = { kind: "injected-v34" } as any;
        let inner: any;
        inner = { onAiUpdate: vi.fn(() => inner) };
        const telemetrySink = vi.fn();
        const factory = {
            descriptor: { kind: "external-package", packageRoot: "/baseline" },
            create: vi.fn(),
            createDefaultStrategy: vi.fn(() => inner),
            createWithStrategy: vi.fn(),
            createWithStrategyAndExclusiveProductionFocus: vi.fn(() => injected),
        } as any;
        expect(createMissionNativeCloseoutCandidate(
            factory,
            "candidate",
            Countries.IRAQ,
            buildMissionNativeCloseoutPolicyV34(),
            telemetrySink,
        )).toBe(injected);
        expect(factory.createWithStrategyAndExclusiveProductionFocus).toHaveBeenCalledWith(
            "candidate",
            Countries.IRAQ,
            expect.objectContaining({ onAiUpdate: expect.any(Function) }),
            telemetrySink,
        );
        expect(factory.createWithStrategy).not.toHaveBeenCalled();
        expect(factory.create).not.toHaveBeenCalled();
    }, 300_000);
});
