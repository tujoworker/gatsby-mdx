const path = require("path");
const fs = require("fs-extra");
const { first, compact } = require("lodash");
const apiRunnerNode = require("gatsby/dist/utils/api-runner-node");
const defaultOptions = require("../utils/default-options");
const mdx = require("../utils/mdx");
const { isWrapper, parseWrapper } = require("../utils/wrapper");

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
  if (isWrapper(contents)) {
    const { component: originalFile } = parseWrapper(contents);

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
