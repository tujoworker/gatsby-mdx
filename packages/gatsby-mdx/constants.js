const path = require("path");

const CACHE_DIR = ".cache";
const PLUGIN_DIR = "gatsby-mdx";
const MDX_WRAPPERS_DIR = "mdx-wrappers-dir";
const MDX_SCOPES_DIR = "mdx-scopes-dir";
const WRAPPER_START = "// MDX WRAPPER";

const MDX_WRAPPERS_LOCATION = path.join(
  CACHE_DIR,
  PLUGIN_DIR,
  MDX_WRAPPERS_DIR
);

const MDX_SCOPES_LOCATION = path.join(CACHE_DIR, PLUGIN_DIR, MDX_SCOPES_DIR);

module.exports = {
  CACHE_DIR,
  PLUGIN_DIR,
  MDX_WRAPPERS_LOCATION,
  MDX_SCOPES_LOCATION,
  WRAPPER_START
};
