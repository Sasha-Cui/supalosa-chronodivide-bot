import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { sha256, ORIGINAL_GAME_API_SHA256, transformExplicitStartRuntime, validateExplicitStartAgents } from
    "./explicit-start-transform-v1.mjs";

const driver = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../packages/chronodivide-bot-driver");
test("accepts stock random inputs without mutation", () => {
    const agents = [{country:"Americans"}, {country:"Russians"}], options = {agents};
    assert.equal(validateExplicitStartAgents(options), agents);
    assert.deepEqual(options, {agents: [{country:"Americans"}, {country:"Russians"}]});
});
test("explicit inputs reject duplicate, partial, observer, online and invalid indices", () => {
    const create = (a,b) => [{country:"Americans",chronoResearchStartPos:a},{country:"Russians",chronoResearchStartPos:b}];
    assert.equal(validateExplicitStartAgents({agents:create(0,7)}).length, 2);
    for (const positions of [[0,0],[-1,2],[0,8],[0,0.5],[0,undefined],[NaN,1],[Infinity,1],["0",1]])
        assert.throws(() => validateExplicitStartAgents({agents:create(...positions)}));
    assert.throws(() => validateExplicitStartAgents({agents:create(0,1),online:true}));
    const agents=create(0,1); delete agents[0].country;
    assert.throws(() => validateExplicitStartAgents({agents}));
});
test("checks exact bundle hash and deterministic minimal transform", () => {
    const source=fs.readFileSync(path.join(driver,"node_modules/@chronodivide/game-api/dist/index.js"),"utf8");
    assert.equal(sha256(source),ORIGINAL_GAME_API_SHA256);
    const transformed=transformExplicitStartRuntime(source);
    assert.equal(transformed,transformExplicitStartRuntime(source));
    assert.equal(transformed.includes("startPos:RANDOM_START_POS"),false);
    assert.equal(transformed.split("startPos:(t.chronoResearchStartPos===undefined?RANDOM_START_POS:t.chronoResearchStartPos)").length,2);
    assert.throws(() => transformExplicitStartRuntime(source+" "));
});
test("serialized guard keeps the same validation behavior", () => {
    const validate=vm.runInNewContext("(" + validateExplicitStartAgents.toString() + ")");
    assert.equal(validate({agents:[{country:"A"},{country:"B"}]}).length,2);
    assert.throws(() => validate({agents:[{country:"A",chronoResearchStartPos:0},{country:"B",chronoResearchStartPos:0}]}));
});
