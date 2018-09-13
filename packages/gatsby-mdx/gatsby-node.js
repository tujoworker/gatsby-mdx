const path = require("path");
const mkdirp = require("mkdirp");
const fs = require("fs-extra");
const { first, compact } = require("lodash");
const apiRunnerNode = require("gatsby/dist/utils/api-runner-node");
const defaultOptions = require("./utils/default-options");
const mdx = require("./utils/mdx");
const {
  WRAPPER_START,
  MDX_WRAPPERS_LOCATION,
  MDX_SCOPES_LOCATION
} = require("./constants");

/**
 * Create Mdx nodes from MDX files.
 */
exports.onCreateNode = require("./gatsby/on-create-node");

/**
 * Add additional fields to MDX nodes
 */
exports.setFieldsOnGraphQLNodeType = require("./gatsby/extend-node-type");

/**
 * 1. Add frontmatter as page context for MDX pages
 * 2. Wrap pages that query mdx in a wrapper for pulling in the MDX scope
 */
exports.onCreatePage = require("./gatsby/on-create-page");

/**
 * Add the webpack config for loading MDX files
 */
exports.onCreateWebpackConfig = require("./gatsby/create-webpack-config");

/**
 * Create the cache directories
 */

exports.onPreBootstrap = ({ store }) => {
  const { directory } = store.getState().program;
  mkdirp.sync(path.join(directory, MDX_WRAPPERS_LOCATION));
  mkdirp.sync(path.join(directory, MDX_SCOPES_LOCATION));
};

/**
 * Make graphql function glboal for the static and page loaders
 */
exports.createPages = ({ graphql }) => {
  global.graphql = graphql;
};

/**
 * Add the MDX extensions as resolvable. This is how the page creator
 * determines which files in the pages/ directory get built as pages.
 */
exports.resolvableExtensions = (data, pluginOptions) =>
  defaultOptions(pluginOptions).extensions;

exports.preprocessSource = async function preprocessSource(
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

/**
 * Required config for mdx to function
 */
exports.onCreateBabelConfig = ({ actions }) => {
  actions.setBabelPlugin({
    name: `@babel/plugin-proposal-object-rest-spread`
  });
};
