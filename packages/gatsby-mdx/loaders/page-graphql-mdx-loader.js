/**
 * Loader for making MDX queried via pageQuery work.
 *
 * For the next step in rendering from MDX node, see mdx-renderer.js
 */
const crypto = require("crypto");
const { graphql } = global;
const { print: stringifyGraphQL } = require("gatsby/graphql");
const { getOptions } = require("loader-utils");
const { uniqBy } = require("lodash");
const fs = require("fs-extra");
const {
  default: FileParser
} = require("gatsby/dist/internal-plugins/query-runner/file-parser");
const {
  isWrapper,
  parseWrapper,
  updateQueryHash
} = require("../utils/wrapper");
const findScopes = require("../utils/find-scopes");

const parser = new FileParser();

module.exports = async function(content) {
  const callback = this.async();
  const { getNodes } = getOptions(this);
  const file = this.resourcePath;

  if (!isWrapper(content)) {
    return callback(null, content);
  }

  const {
    component: originalFile,
    path: urlPath,
    queryHash: oldHash
  } = parseWrapper(content);

  this.addDependency(originalFile);

  const document = await parser.parseFile(originalFile);

  let query = "";
  if (document) {
    query = stringifyGraphQL(document);
  }

  const newHash = crypto
    .createHash(`md5`)
    .update(query)
    .digest(`hex`);
  /**
   * If the pageQuery has changed, we retrigger the webpack loader and force
   * Gatsby to pick up on the new pageQuery
   */
  if (oldHash !== newHash) {
    await fs.writeFile(file, updateQueryHash(content, newHash));

    return callback(null, "");
  }

  const pageNode = getNodes().find(
    node => node.internal.type === `SitePage` && node.path === urlPath
  );

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
