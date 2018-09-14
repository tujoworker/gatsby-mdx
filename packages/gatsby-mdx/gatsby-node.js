const path = require("path");
const mkdirp = require("mkdirp");
const defaultOptions = require("./utils/default-options");
const { MDX_WRAPPERS_LOCATION, MDX_SCOPES_LOCATION } = require("./constants");

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
 * preprocess mdx files and page wrappers before Gatsby extracts the graphql queries
 */
exports.preprocessSource = require("./gatsby/preprocess-source");

/**
 * Add the MDX extensions as resolvable. This is how the page creator
 * determines which files in the pages/ directory get built as pages.
 */
exports.resolvableExtensions = (data, pluginOptions) =>
  defaultOptions(pluginOptions).extensions;

/**
 * Required config for mdx to function
 */
exports.onCreateBabelConfig = ({ actions }) => {
  actions.setBabelPlugin({
    name: `@babel/plugin-proposal-object-rest-spread`
  });
};
