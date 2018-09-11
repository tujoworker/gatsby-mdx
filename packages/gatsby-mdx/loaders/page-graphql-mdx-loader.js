/**
 * Loader for making MDX queried via StaticQuery work.
 *
 * For the next step in rendering from MDX node, see mdx-renderer.js
 */
const { graphql } = global;
const { getOptions } = require("loader-utils");
const { uniqBy } = require("lodash");
const fs = require("fs-extra");
const path = require("path");
const { babelParseToAst } = require("../utils/babel-parse-to-ast");
const findScopes = require("../utils/find-scopes");
const traverse = require("@babel/traverse").default;
const stringifyGraphQL = require("gatsby/graphql").print;
const { getGraphQLTag } = require("babel-plugin-remove-graphql-queries");

const findPageQuery = ast => {
  let pageQuery;

  traverse(ast, {
    ExportNamedDeclaration(path) {
      path.traverse({
        TaggedTemplateExpression(innerPath) {
          const { ast: gqlAst } = getGraphQLTag(innerPath);
          if (!gqlAst) return;

          pageQuery = stringifyGraphQL(gqlAst);
        }
      });
    }
  });

  return pageQuery;
};

const injectScopeIntoMDXRenderer = (code, scope) =>
  code.replace(/<MDXRenderer/g, `$& scopes={${scope}}`);

module.exports = async function(content) {
  const callback = this.async();
  const { getNodes } = getOptions(this);
  const file = this.resourcePath;

  if (!content.startsWith("// MDX wrapper")) return callback(null, content);

  const originalFile = content
    .replace("// MDX wrapper\n// ", "")
    .split("\n")[0];
  this.addDependency(originalFile);
  const originalContent = await fs.readFile(originalFile, "utf8");

  const ast = babelParseToAst(originalContent, file);
  const query = findPageQuery(ast);
  const urlPath = decodeURIComponent(path.basename(file).split(".")[0]);

  // if we have no page query, move on
  if (!query) {
    return callback(null, originalContent);
  }

  const pageNode = getNodes().find(
    node => node.internal.type === `SitePage` && node.path === urlPath
  );

  const result = await graphql(query, pageNode && pageNode.context);
  const scopes = uniqBy(findScopes(result.data), "scopeId");

  // if we have no mdx scopes, move on
  if (scopes.length === 0) {
    return callback(null, originalContent);
  }

  const scopesImports = scopes
    .map(({ scopeId, scope }) => `import ${scopeId} from "${scope}";`)
    .join("\n");

  const singleScopeObject = `{${scopes
    .map(({ scopeId }) => scopeId)
    .join(", ")}}`;

  const code = `${scopesImports}

${injectScopeIntoMDXRenderer(originalContent, singleScopeObject)}`;

  return callback(null, code);
};
