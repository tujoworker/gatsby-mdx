/**
 * Loader for making MDX queried via StaticQuery work.
 *
 * For the next step in rendering from MDX node, see mdx-renderer.js
 */
const { graphql } = global;
const { flatten, uniqBy } = require("lodash");
const { babelParseToAst } = require("../utils/babel-parse-to-ast");
const findStaticQueries = require("../utils/find-static-queries");
const findScopes = require("../utils/find-scopes");

const injectScopeIntoMDXRenderer = (code, scope) =>
  code.replace(/<MDXRenderer/g, `$& scopes={${scope}}`);

module.exports = async function(content) {
  const callback = this.async();
  const file = this.resourcePath;
  const ast = babelParseToAst(content, file);

  const queries = findStaticQueries(ast);
  const results = [];

  // if we have no static queries, move on
  if (queries.length === 0) {
    return callback(null, content);
  }

  for (let query of queries) {
    results.push(await graphql(query));
  }

  const scopes = uniqBy(
    flatten(results.map(({ data }) => findScopes(data))),
    "scopeId"
  );

  // if we have no mdx scopes, move on
  if (scopes.length === 0) {
    return callback(null, content);
  }

  const scopesImports = scopes
    .map(({ scopeId, scope }) => `import ${scopeId} from "${scope}";`)
    .join("\n");

  const singleScopeObject = `{${scopes
    .map(({ scopeId }) => scopeId)
    .join(", ")}}`;

  const code = `${scopesImports}

${injectScopeIntoMDXRenderer(content, singleScopeObject)}`;

  return callback(null, code);
};
