const path = require("path");
const fs = require("fs-extra");
const merge = require("lodash/merge");
const apiRunnerNode = require("gatsby/dist/utils/api-runner-node");
const defaultOptions = require("../utils/default-options");
const extractExports = require("../utils/extract-exports");
const mdx = require("../utils/mdx");
const pageWithMDX = require("../page-with-mdx");
const { babelParseToAst } = require("../utils/babel-parse-to-ast");
const findPageQuery = require("../utils/find-page-query");
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

  /**
   * Wrap pages that query mdx in a wrapper for pulling in the MDX scope
   */
  if (
    store.getState().program.extensions.includes(ext) &&
    !file.includes(MDX_WRAPPERS_LOCATION)
  ) {
    let ast;
    const preProcessedContent = await fs.readFile(file, "utf8");
    const transpiled = await apiRunnerNode(`preprocessSource`, {
      filename: file,
      contents: preProcessedContent
    });

    if (transpiled && transpiled.length) {
      for (const item of transpiled) {
        try {
          const tmp = babelParseToAst(item, file);
          ast = tmp;
          break;
        } catch (error) {
          continue;
        }
      }
    } else {
      try {
        ast = babelParseToAst(preProcessedContent, file);
      } catch (error) {
        // silently fail
      }
    }

    if (!ast) {
      return;
    }

    const query = findPageQuery(ast);

    if (!query) {
      return;
    }

    // check if the query has anything that ends in mdx and has a code field
    if (/mdx(.*){(.|\s)*\s*code/gi.test(query)) {
      deletePage(page);
      createPage(pageWithMDX(page));
    }
  }
};
