const path = require("path");
const fs = require("fs-extra");
const { merge, first, compact } = require("lodash");
const apiRunnerNode = require("gatsby/dist/utils/api-runner-node");
const defaultOptions = require("../utils/default-options");
const extractExports = require("../utils/extract-exports");
const mdx = require("../utils/mdx");
const pageWithMDX = require("../page-with-mdx");
const isMDXCodeQuery = require("../utils/is-mdx-code-query");
const { MDX_WRAPPERS_LOCATION } = require("../constants.js");

module.exports = async ({ page, actions, store }, pluginOptions) => {
  const { createPage, deletePage } = actions;
  const { extensions, ...options } = defaultOptions(pluginOptions);
  const file = page.component;
  const ext = path.extname(file);

  /**
   * Add frontmatter as page context for MDX pages
   */
  if (extensions.includes(ext)) {
    const content = await fs.readFile(file, "utf8");
    const code = await mdx(content, options);

    // grab the exported frontmatter
    const { frontmatter } = extractExports(code);

    deletePage(page);
    createPage(
      merge(
        {
          context: {
            frontmatter: {
              ...frontmatter
            }
          }
        },
        page
      )
    );
  }

  const state = store.getState();

  /**
   * Wrap pages that query mdx in a wrapper for pulling in the MDX scope
   */
  if (
    state.program.extensions.includes(ext) &&
    !file.includes(MDX_WRAPPERS_LOCATION)
  ) {
    const preProcessedContent = await fs.readFile(file, "utf8");
    const transpiled = await apiRunnerNode(`preprocessSource`, {
      filename: file,
      contents: preProcessedContent
    });

    let content = first(compact(transpiled)) || preProcessedContent;

    const result = /export.+graphql`((?:\n|(?:\\`)|[^`])*)`/g.exec(content);

    if (!result) {
      return;
    }

    const query = result[1];

    if (isMDXCodeQuery(query)) {
      deletePage(page);
      createPage(
        pageWithMDX({
          page,
          directory: state.program.directory
        })
      );
    }
  }
};
