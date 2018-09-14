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
const findScopes = require("../utils/find-scopes");
const { WRAPPER_START } = require("../constants");

const parser = new FileParser();

module.exports = async function(content) {
  const callback = this.async();
  const { getNodes } = getOptions(this);
  const file = this.resourcePath;

  if (!content.startsWith(WRAPPER_START)) {
    return callback(null, content);
  }

  const [, originalFile, urlPath] = content
    .replace(WRAPPER_START, "")
    .split("\n// ");

  this.addDependency(originalFile);

  const document = await parser.parseFile(originalFile);

  let query = "";
  if (document) {
    query = stringifyGraphQL(document);
  }

  const oldHash = content.split("\n// queryHash ")[1];
  const newHash = crypto
    .createHash(`md5`)
    .update(query)
    .digest(`hex`);
  if (oldHash !== newHash) {
    await fs.writeFile(
      file,
      `${content.split("\n// queryHash ")[0]}\n${`// queryHash ${newHash}`}`
    );

    /**
     * early return when we are re-triggering the load so Gatsby
     * picks up on the new pageQuery
     */
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
