const path = require("path");
const fs = require("fs-extra");
const { first, compact } = require("lodash");
const apiRunnerNode = require("gatsby/dist/utils/api-runner-node");
const defaultOptions = require("../utils/default-options");
const mdx = require("../utils/mdx");
const { WRAPPER_START } = require("../constants");

module.exports = async function preprocessSource(
  { filename, contents },
  pluginOptions
) {
  const { extensions, ...options } = defaultOptions(pluginOptions);
  const ext = path.extname(filename);

  /**
   * Convert MDX to JSX so that Gatsby can extract the GraphQL queries.
   */
  if (extensions.includes(ext)) {
    const code = await mdx(contents, options);
    return code;
  }

  /**
   * Intercept MDX wrappers and pass through the original component so the
   * query can be extracted correctly
   */
  if (contents.startsWith(WRAPPER_START)) {
    const [, originalFile] = contents.replace(WRAPPER_START, "").split("\n// ");

    const code = await fs.readFile(originalFile, "utf8");

    const transpiled = first(
      compact(
        await apiRunnerNode(`preprocessSource`, {
          filename: originalFile,
          contents: code
        })
      )
    );

    return transpiled || code;
  }

  return null;
};
