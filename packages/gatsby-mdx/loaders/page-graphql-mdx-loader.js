/**
 * Loader for making MDX queried via pageQuery work.
 *
 * For the next step in rendering from MDX node, see mdx-renderer.js
 */
const crypto = require("crypto");
const { graphql } = global;
const { getOptions } = require("loader-utils");
const { uniqBy } = require("lodash");
const fs = require("fs-extra");
const findScopes = require("../utils/find-scopes");
const { WRAPPER_START } = require("../constants");

module.exports = async function(content) {
  const callback = this.async();
  const { store, getNodes } = getOptions(this);
  const file = this.resourcePath;

  if (!content.startsWith(WRAPPER_START)) {
    return callback(null, content);
  }

  const [, originalFile, urlPath] = content
    .replace(WRAPPER_START, "")
    .split("\n// ");

  this.addDependency(originalFile);
  const originalContent = await fs.readFile(originalFile, "utf8");

  const oldHash = content.split("\n// hash ")[1];
  const newHash = crypto
    .createHash(`md5`)
    .update(originalContent)
    .digest(`hex`);
  if (oldHash !== newHash) {
    await fs.writeFile(
      file,
      `${content.split("\n// hash ")[0]}\n${`// hash ${newHash}`}`
    );
  }

  const components = [...store.getState().components.values()];

  const foundComponent = components.find(
    component => component.componentPath === file
  );

  const pageNode = getNodes().find(
    node => node.internal.type === `SitePage` && node.path === urlPath
  );

  const query = (foundComponent && foundComponent.query) || "";

  const result = await graphql(query, pageNode && pageNode.context);
  const scopes = uniqBy(findScopes(result.data), "id");

  const scopesImports = scopes
    .map(({ id, location }) => `import ${id} from "${location}";`)
    .join("\n");

  const mdxScopes = `{${scopes.map(({ id }) => id).join(", ")}}`;

  const code = `import React from "react";
import { MDXScopeProvider } from "gatsby-mdx/context";
${scopesImports}

import OriginalWrapper from "${originalFile}";

export default ({children, ...props}) => <MDXScopeProvider scopes={${mdxScopes}}>
  <OriginalWrapper {...props}>
    {children}
  </OriginalWrapper>
</MDXScopeProvider>`;

  return callback(null, code);
};
