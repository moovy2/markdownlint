import { readFile, writeFile } from "node:fs/promises";
import { EOL } from "node:os";
import { default as rules } from "../lib/rules.js";
import { newLineRe } from "../helpers/helpers.js";
import { deprecatedRuleNames, fixableRuleNames } from "../lib/constants.js";

const pathFor = (relativePath) => new URL(relativePath, import.meta.url);
const sortedComma = (items) => items.sort().join(", ");
const linesFrom = (text) => text.split(newLineRe);

// import { default as schema } from "file.json" assert { type: "json" };
const importJson =
  async(file) => JSON.parse(await readFile(pathFor(file)));
const schema = await importJson("../schema/markdownlint-config-schema.json");

const lines = [];

const heading = await readFile(pathFor("./heading.md"), "utf8");
lines.push(...linesFrom(heading));

for (const rule of rules) {
  const name = rule.names[0];
  const deprecated = deprecatedRuleNames.includes(name);
  const decorator = deprecated ? "~~" : "";
  lines.push(
    `<a name="${name.toLowerCase()}"></a>`,
    ""
  );
  const section = [];
  section.push(
    `## ${decorator}${name} - ${rule.description}${decorator}`,
    ""
  );
  if (deprecated) {
    section.push(
      "> This rule is deprecated and provided for backward-compatibility",
      ""
    );
  }
  section.push(
    `Tags: ${sortedComma(rule.tags)}`,
    "",
    `Aliases: ${sortedComma(rule.names.slice(1))}`,
    ""
  );
  const ruleData = schema.properties[name];
  if (ruleData.properties) {
    section.push(
      "Parameters:",
      "",
      ...Object.keys(ruleData.properties).sort().map((property) => {
        const propData = ruleData.properties[property];
        const propType = (propData.type === "array") ?
          `${propData.items.type}[]` :
          propData.type;
        const defaultValue = Array.isArray(propData.default) ?
          JSON.stringify(propData.default) :
          propData.default;
        const allValues = propData.enum?.sort();
        return `* \`${property}\`: ${propData.description} (` +
          `\`${propType}\`, default \`${defaultValue}\`` +
          (propData.enum ?
            `, values ${allValues.map((value) => `\`${value}\``).join("/")}` :
            ""
          ) +
          ")";
      }),
      ""
    );
  }
  if (fixableRuleNames.includes(name)) {
    section.push(
      "Fixable: Most violations can be fixed by tooling",
      ""
    );
  }
  const contents =
    // eslint-disable-next-line no-await-in-loop
    await readFile(pathFor(`./${name.toLowerCase()}.md`), "utf8");
  section.push(...linesFrom(contents));

  // eslint-disable-next-line no-await-in-loop
  await writeFile(
    pathFor(`../doc/${name.toLowerCase()}.md`),
    section.join(EOL).slice(1),
    "utf8"
  );

  lines.push(...section);
}

const footing = await readFile(pathFor("./footing.md"), "utf8");
lines.push(...linesFrom(footing));

const content = lines.join(EOL);
await writeFile(pathFor("../doc/Rules.md"), content, "utf8");
