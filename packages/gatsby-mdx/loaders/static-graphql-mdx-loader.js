/**
 * Loader for making MDX queried via StaticQuery work.
 *
 * For the next step in rendering from MDX node, see mdx-renderer.js
 */
const { babelParseToAst } = require("../utils/babel-parse-to-ast");
const traverse = require("@babel/traverse").default;
const { getGraphQLTag } = require("babel-plugin-remove-graphql-queries");
const stringifyGraphQL = require("gatsby/graphql").print;
const { graphql } = global;

// pulled from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby/src/internal-plugins/query-runner/file-parser.js#L98
const extractStaticQuery = taggedTemplateExpressPath => {
  const { ast: gqlAst } = getGraphQLTag(taggedTemplateExpressPath);
  if (!gqlAst) return;

  return stringifyGraphQL(gqlAst);
};

// pulled from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby/src/internal-plugins/query-runner/file-parser.js#L129
const findStaticQueries = ast => {
  let queries = [];

  traverse(ast, {
    JSXElement(path) {
      if (path.node.openingElement.name.name !== `StaticQuery`) {
        return;
      }

      // astexplorer.com link I (@kyleamathews) used when prototyping this algorithm
      // https://astexplorer.net/#/gist/ab5d71c0f08f287fbb840bf1dd8b85ff/2f188345d8e5a4152fe7c96f0d52dbcc6e9da466
      path.traverse({
        JSXAttribute(jsxPath) {
          if (jsxPath.node.name.name !== `query`) {
            return;
          }
          jsxPath.traverse({
            // Assume the query is inline in the component and extract that.
            TaggedTemplateExpression(templatePath) {
              queries.push(extractStaticQuery(templatePath));
            },
            // Also see if it's a variable that's passed in as a prop
            // and if it is, go find it.
            Identifier(identifierPath) {
              if (identifierPath.node.name !== `graphql`) {
                const varName = identifierPath.node.name;
                let found = false;
                traverse(ast, {
                  VariableDeclarator(varPath) {
                    if (
                      varPath.node.id.name === varName &&
                      varPath.node.init.type === `TaggedTemplateExpression`
                    ) {
                      varPath.traverse({
                        TaggedTemplateExpression(templatePath) {
                          found = true;
                          queries.push(extractStaticQuery(templatePath));
                        }
                      });
                    }
                  }
                });
                if (!found) {
                  // let Gatsby code handle surfacing the error to the user
                }
              }
            }
          });
        }
      });
      return;
    }
  });

  return queries;
};

const injectScopeIntoMDXRenderer = (code, scope) =>
  code.replace(/<MDXRenderer/g, `$& scope={${scope}}`);

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

  // findScopes
  const scopes = results.map(({ data }) => data.mdx.code.scope);

  // if we have no mdx scopes, move on
  if (scopes.length === 0) {
    return callback(null, content);
  }

  const scopesImports = scopes
    .map((path, i) => `import __mdxScope_${i} from "${path}";`)
    .join("\n");

  const singleScopeObject = `{${scopes
    .map((_, i) => `...__mdxScope_${i}`)
    .join(", ")}}`;

  const code = `${scopesImports}

${injectScopeIntoMDXRenderer(content, singleScopeObject)}`;

  return callback(null, code);
};
