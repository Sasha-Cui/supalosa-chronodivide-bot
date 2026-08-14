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
    });

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
    });
});
