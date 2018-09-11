const mkdirp = require("mkdirp");
const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");
const syntaxObjRestSpread = require("@babel/plugin-syntax-object-rest-spread");
const debug = require("debug")("gatsby-mdx:page-width-mdx");
const BabelPluginPluckExports = require("babel-plugin-pluck-exports");

const CACHE_DIR = `.cache`;
const PLUGIN_DIR = `gatsby-mdx`;
const MDX_WRAPPERS_DIR = `mdx-wrappers-dir`;

module.exports = function pageWithMDX(pageConfig) {
  mkdirp.sync(
    path.join(process.cwd(), CACHE_DIR, PLUGIN_DIR, MDX_WRAPPERS_DIR)
  );

  const absPathToNewWrapper = path.join(
    process.cwd(),
    CACHE_DIR,
    PLUGIN_DIR,
    MDX_WRAPPERS_DIR,
    `${encodeURIComponent(pageConfig.path)}${".js"}`
  );

  // hoist pageQuery and any other named exports
  const OGWrapper = fs.readFileSync(pageConfig.component, "utf-8");
  const instance = new BabelPluginPluckExports();
  babel.transform(OGWrapper, {
    plugins: [instance.plugin, syntaxObjRestSpread],
    presets: [require("@babel/preset-react")]
  }).code;

  const newWrapper = `// MDX wrapper
// ${pageConfig.component}

import { graphql } from 'gatsby'

${instance.state.exports.map(exportString => exportString)}`;

  fs.writeFileSync(absPathToNewWrapper, newWrapper);

  debug(
    `wrapper "${absPathToNewWrapper}" created from "${pageConfig.component}"`
  );
  return {
    ...pageConfig,
    component: absPathToNewWrapper
  };
};
