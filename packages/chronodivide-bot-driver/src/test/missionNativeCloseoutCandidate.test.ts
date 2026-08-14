import { describe, expect, it, vi } from "vitest";
import { Countries } from "@supalosa/chronodivide-bot/dist/bot/logic/common/utils.js";
import { createMissionNativeCloseoutCandidate } from "../training/missionNativeCloseoutCandidate.js";
import { buildMissionNativeCloseoutPolicy } from "../training/missionNativeCloseoutPolicy.js";

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
});
