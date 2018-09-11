/**
 * Loader for making MDX queried via StaticQuery work.
 *
 * For the next step in rendering from MDX node, see mdx-renderer.js
 */
const { graphql } = global;
const { getOptions } = require("loader-utils");
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
  code.replace(/<MDXRenderer/g, `$& scope={${scope}}`);

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
  const scopes = findScopes(result.data);

  // if we have no mdx scopes, move on
  if (scopes.length === 0) {
    return callback(null, originalContent);
  }

  const codeWithoutQuery = originalContent.replace("pageQuery", "meh");
  // const codeWithoutQuery = babel.transform(originalContent, {
  //   plugins: [instance.plugin, syntaxObjRestSpread],
  //   presets: [require("@babel/preset-react")]
  // }).code;

  const scopesImports = scopes
    .map((path, i) => `import __mdxScope_${i} from "${path}";`)
    .join("\n");

  const singleScopeObject = `{${scopes
    .map((_, i) => `...__mdxScope_${i}`)
    .join(", ")}}`;

  const code = `${scopesImports}

${injectScopeIntoMDXRenderer(codeWithoutQuery, singleScopeObject)}

${content.split("import { graphql } from 'gatsby'")[1]}`;

  return callback(null, code);
};
