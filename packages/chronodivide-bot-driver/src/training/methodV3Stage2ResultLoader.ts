import fs from "node:fs";
import path from "node:path";
import { RESEARCH_EPISODE_SCHEMA_VERSION, RESEARCH_OUTCOME_ENDPOINT, ResearchEpisodeResult } from "./researchEpisode.js";
import { MethodV3Stage2Campaign } from "./methodV3Stage2PlanGenerator.js";
import { methodV3Stage2ResultArtifactCommitmentSha256 } from "./methodV3Stage2TechnicalGate.js";
import { sha256File } from "./researchPlanRunner.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

export const loadMethodV3Stage2Results = (
    campaign: MethodV3Stage2Campaign,
    campaignPath: string,
    gatePath: string,
    resultsRoot: string,
    arrayJobId: string,
    requiredAuthorization: "method-v3-stage2-complete-stage-reduction" | "method-v3-stage2-run-finalization",
): ResearchEpisodeResult[] => {
    const gate = JSON.parse(fs.readFileSync(gatePath, "utf8")) as unknown;
    if (
        !isRecord(gate) ||
        gate.status !== "PASSED_METHOD_V3_STAGE2_TECHNICAL_GATE_OUTCOMES_NOT_SUMMARIZED" ||
        path.resolve(String(gate.campaignPath)) !== campaignPath ||
        gate.campaignSha256 !== sha256File(campaignPath) ||
        path.resolve(String(gate.resultsRoot)) !== resultsRoot ||
        String(gate.arrayJobId) !== arrayJobId ||
        gate.schedulerAccount !== "pi_jss233" ||
        gate.accountedLaunches !== campaign.launchedGameCount ||
        gate.technicalFailures !== 0 ||
        gate.actualWinInvariantViolations !== 0 ||
        gate.authorizedNextPhase !== requiredAuthorization ||
        gate.resultArtifactCommitmentSha256 !== methodV3Stage2ResultArtifactCommitmentSha256(
            campaign,
            resultsRoot,
            arrayJobId,
        )
    ) {
        throw new Error("Method-v3 Stage-2 technical gate does not authorize outcome loading");
    }
    const results = campaign.shards.flatMap((shard) => {
        const eventsPath = path.join(resultsRoot, `${arrayJobId}_${shard.shardIndex}`, "run", "events.jsonl");
        return fs.readFileSync(eventsPath, "utf8")
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line) as Record<string, unknown>)
            .filter(({ event }) => event === "episode_complete")
            .map(({ result }) => result as ResearchEpisodeResult);
    });
    if (
        results.length !== campaign.launchedGameCount ||
        new Set(results.map(({ episodeId, familyId, candidateCountry }) => `${episodeId}|${familyId}|${candidateCountry}`)).size !== results.length ||
        results.some((result) =>
            result.schemaVersion !== RESEARCH_EPISODE_SCHEMA_VERSION ||
            result.outcomeEndpoint !== RESEARCH_OUTCOME_ENDPOINT ||
            !campaign.policies.some(({ policyId }) => policyId === result.policyId) ||
            !campaign.selectedFamilies.some(({ familyId }) => familyId === result.familyId) ||
            !campaign.countries.includes(result.candidateCountry) ||
            result.baselineCountry !== result.candidateCountry ||
            result.maxTicks !== campaign.maxTicks
        )
    ) {
        throw new Error("Method-v3 Stage-2 result population is incomplete or outside its campaign");
    }
    return results;
};
