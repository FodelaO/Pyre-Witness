/** Validates CSV structure, labels and readable image inputs without model calls. */
import { DATASET_ROOT, loadDataset } from "./dataset";
import { readDatasetImage } from "./image";

async function main() {
  const { items, errors, warnings } = await loadDataset();
  for (const item of items) {
    if (item.input.kind !== "photo") continue;
    try {
      await readDatasetImage(DATASET_ROOT, item.input.file);
    } catch (error) {
      errors.push(`${item.id} (${item.input.file}): ${(error as Error).message}`);
    }
  }
  if (!items.length) errors.push("No valid items found in eval/dataset/labels.csv or eval/dataset/links.csv.");
  for (const warning of warnings) console.warn(`Dataset: ${warning}`);
  for (const error of errors) console.error(error);
  if (errors.length) process.exitCode = 1;
  else console.log(`Validated ${items.length} evaluation items.`);
}

main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
