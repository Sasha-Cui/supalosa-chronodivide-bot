import { runResearchPlanFromEnvironment } from "./researchPlanRunner.js";

runResearchPlanFromEnvironment("confirmatory").catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
