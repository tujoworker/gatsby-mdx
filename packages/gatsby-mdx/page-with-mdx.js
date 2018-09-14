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
export const pageQuery = graphql\`\`
// hash `;

module.exports = function pageWithMDX({ page, directory }) {
  const componentHash = crypto
    .createHash(`md5`)
    .update(page.path)
    .digest(`hex`);

  const wrapperLocation = path.join(
    directory,
    MDX_WRAPPERS_LOCATION,
    `${componentHash}.js`
  );

  const newWrapper = createWrapper({
    component: page.component,
    path: page.path
  });

  fs.writeFileSync(wrapperLocation, newWrapper);

  debug(`wrapper "${wrapperLocation}" created from "${page.component}"`);
  return {
    ...page,
    component: wrapperLocation
  };
};
