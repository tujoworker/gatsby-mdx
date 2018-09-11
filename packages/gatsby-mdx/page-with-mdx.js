const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const debug = require("debug")("gatsby-mdx:page-with-mdx");
const { MDX_WRAPPERS_LOCATION } = require("./constants");

const createWrapper = ({ originalFile, path }) =>
  `// MDX WRAPPER
// ${originalFile}
// ${path}`;

module.exports = function pageWithMDX(pageConfig) {
  const componentHash = crypto
    .createHash(`md5`)
    .update(pageConfig.component)
    .digest(`hex`);

  const wrapperLocation = path.join(
    MDX_WRAPPERS_LOCATION,
    `${componentHash}.js`
  );

  const newWrapper = createWrapper({
    originalFile: pageConfig.component,
    path: pageConfig.path
  });

  fs.writeFileSync(wrapperLocation, newWrapper);

  debug(`wrapper "${wrapperLocation}" created from "${pageConfig.component}"`);
  return {
    ...pageConfig,
    component: wrapperLocation
  };
};
