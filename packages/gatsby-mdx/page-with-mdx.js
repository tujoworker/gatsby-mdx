const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const debug = require("debug")("gatsby-mdx:page-with-mdx");
const { WRAPPER_START, MDX_WRAPPERS_LOCATION } = require("./constants");

/**
 * Create a template that has a reference to the page url and
 * original component so we can link back to it.
 *
 * It has a pageQuery so that Gatsby tries to export and run the query.
 *
 * We replace the query in preprocessSource and we replace the content
 * in the loaders/page-graphql-mdx-loader.js
 */
const createWrapper = ({ component, path }) =>
  `${WRAPPER_START}
// ${component}
// ${path}
// 
export const pageQuery = graphql\`\``;

module.exports = function pageWithMDX(pageConfig) {
  const componentHash = crypto
    .createHash(`md5`)
    .update(pageConfig.path)
    .digest(`hex`);

  const wrapperLocation = path.join(
    MDX_WRAPPERS_LOCATION,
    `${componentHash}.js`
  );

  const newWrapper = createWrapper({
    component: pageConfig.component,
    path: pageConfig.path
  });

  fs.writeFileSync(wrapperLocation, newWrapper);

  debug(`wrapper "${wrapperLocation}" created from "${pageConfig.component}"`);
  return {
    ...pageConfig,
    component: wrapperLocation
  };
};
