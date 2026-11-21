/** Parses UTF-8 CSV cells, including escaped quotes and multiline fields. */
export function parseCsv(input: string, file: string): string[][] {
  const source = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let state: "plain" | "quoted" | "closed" = "plain";

  function finishCell() {
    row.push(cell.trim());
    cell = "";
    state = "plain";
  }

  function finishRow() {
    finishCell();
    if (row.length !== 1 || row[0] !== "") rows.push(row);
    row = [];
  }

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (state === "quoted") {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        state = "closed";
      } else {
        cell += char;
      }
      continue;
    }
    if (char === ",") {
      finishCell();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      finishRow();
    } else if (char === '"' && state === "plain" && cell.trim() === "") {
      cell = "";
      state = "quoted";
    } else if (char === '"' || (state === "closed" && char.trim() !== "")) {
      throw new Error(`${file} record ${rows.length + 1}: unexpected character in CSV field.`);
    } else {
      cell += char;
    }
  }
  if (state === "quoted") throw new Error(`${file} record ${rows.length + 1}: unclosed quoted field.`);
  finishRow();
  return rows;
}
