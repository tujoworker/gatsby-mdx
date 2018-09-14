const path = require("path");
const fs = require("fs-extra");
const { merge, first } = require("lodash");
const {
  default: FileParser
} = require("gatsby/dist/internal-plugins/query-runner/file-parser");
const defaultOptions = require("../utils/default-options");
const extractExports = require("../utils/extract-exports");
const mdx = require("../utils/mdx");
const pageWithMDX = require("../page-with-mdx");
const isMDXCodeQuery = require("../utils/is-mdx-code-query");
const { MDX_WRAPPERS_LOCATION } = require("../constants.js");

const parser = new FileParser();

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
    const document = await parser.parseFile(file);

    const queryAST = document && first(document.definitions);

    // if we don't have a query or the query is a static query, move on
    if (!queryAST || queryAST.isStaticQuery) {
      return;
    }

    // if the query isn't looking for the code field of mdx nodes, move on
    if (!isMDXCodeQuery(queryAST)) {
      return;
    }

    deletePage(page);
    createPage(
      pageWithMDX({
        page,
        directory: state.program.directory
      })
    );
  }
};
