import fs from "fs";
import path from "path";
import { Compositions } from "./compositionUtils.js";

const FALLBACK_AI_INI_TASK_FORCES = `
[0CE4357C-G]
Name=6 GIs
0=6,E1

[0D0813CC-G]
Name=10 GIs, 2 Engineers
0=10,E1
1=2,ENGINEER

[0A86ACAC-G]
Name=6 Grizzly, 1 Mirage, 1 Prism
0=4,MTNK
1=1,MGTK
2=1,SREF

[0D082BEC-G]
Name=5 Rocketeers
0=5,JUMPJET

[0A31360C-G]
Name=10 Conscripts, 2 Engineers
0=10,E2
1=2,SENGINEER

[0EC2118C-G]
Name=2 Rhino, 1 Flak Track
0=2,HTNK
1=1,HTK

[0EC204BC-G]
Name=5 Rhino, 2 Flak
0=2,FLAKT
1=5,HTNK

[0EC2027C-G]
Name=2 V3, 2 Flak
0=2,V3
1=2,FLAKT

[0C90985C-G]
Name=1 Flak Track, 5 Terrorists
0=1,HTK
1=5,TERROR

[0EC24A6C-G]
Name=2 Desolators
0=2,DESO

[0EC2482C-G]
Name=Soviet Navy Bombard
0=1,DRED
1=2,HYD
2=1,SQD

[0CE4D2AC-G]
Name=Allied Navy Bombard
0=1,CARRIER
1=2,DEST
2=1,AEGIS
`;

type IniSection = Record<string, string>;

let cachedCompositions: Compositions | null = null;

export function getAiIniAttackCompositions(): Compositions {
    if (!cachedCompositions) {
        const loadedText = loadAiIniText();
        cachedCompositions = parseAiIniTaskForces(loadedText ?? FALLBACK_AI_INI_TASK_FORCES);
    }
    return cachedCompositions;
}

function loadAiIniText(): string | null {
    const candidates = [
        process.env.CHRONO_AI_INI_PATH,
        path.resolve(process.cwd(), "packages/chronodivide-bot-driver/data/ai.ini"),
        path.resolve(process.cwd(), "data/ai.ini"),
    ].filter((candidate): candidate is string => !!candidate);

    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate)) {
                return fs.readFileSync(candidate, "utf8");
            }
        } catch (_err) {
            // Ignore unreadable optional ai.ini files and fall back to bundled task forces.
        }
    }
    return null;
}

function parseAiIniTaskForces(text: string): Compositions {
    const sections = parseIni(text);
    const result: Compositions = {};
    for (const [sectionName, section] of sections.entries()) {
        const unitEntries = Object.entries(section)
            .filter(([key]) => /^\d+$/.test(key))
            .map(([, value]) => parseTaskForceUnit(value))
            .filter((entry): entry is { count: number; unitName: string } => !!entry)
            .filter((entry) => entry.count > 0);
        if (unitEntries.length === 0) {
            continue;
        }
        const composition: Record<string, number> = {};
        unitEntries.forEach(({ unitName, count }) => {
            composition[unitName] = (composition[unitName] ?? 0) + count;
        });
        const totalUnits = Object.values(composition).reduce((sum, count) => sum + count, 0);
        if (totalUnits === 0 || totalUnits > 24) {
            continue;
        }
        const displayName = section.Name ?? sectionName;
        result[`aiIni.${slugify(displayName)}.${sectionName}`] = {
            composition,
            minimumUnits: Math.max(1, Math.ceil(totalUnits * 0.7)),
            maximumUnits: totalUnits,
        };
    }
    return result;
}

function parseIni(text: string): Map<string, IniSection> {
    const sections = new Map<string, IniSection>();
    let currentSection: IniSection | null = null;
    text.split(/\r?\n/).forEach((rawLine) => {
        const line = rawLine.replace(/;.*/, "").trim();
        if (!line) {
            return;
        }
        const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
        if (sectionMatch) {
            currentSection = {};
            sections.set(sectionMatch[1], currentSection);
            return;
        }
        if (!currentSection) {
            return;
        }
        const eqIndex = line.indexOf("=");
        if (eqIndex <= 0) {
            return;
        }
        const key = line.slice(0, eqIndex).trim();
        const value = line.slice(eqIndex + 1).trim();
        currentSection[key] = value;
    });
    return sections;
}

function parseTaskForceUnit(value: string): { count: number; unitName: string } | null {
    const [countText, unitName] = value.split(",").map((part) => part.trim());
    const count = Number.parseInt(countText, 10);
    if (!Number.isFinite(count) || !unitName) {
        return null;
    }
    return { count, unitName };
}

function slugify(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "task-force";
}
