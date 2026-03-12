import { videoFlows } from "./flows";

for (const flow of videoFlows) {
  console.log(`${flow.id}`);
  console.log(`  status: ${flow.status}`);
  console.log(`  route: ${flow.targetRoute}`);
  console.log(`  audience: ${flow.audience}`);
  console.log(`  lengths: ${flow.targetLengths.join(", ")}`);
  console.log(`  steps:`);
  for (const step of flow.steps) {
    console.log(`    - ${step}`);
  }
  console.log("");
}
