/**
 * Given an JavaScript AST, this function returns all the StaticQuery graphql queries
 */
const traverse = require("@babel/traverse").default;
const stringifyGraphQL = require("gatsby/graphql").print;
const { getGraphQLTag } = require("babel-plugin-remove-graphql-queries");

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

module.exports = findStaticQueries;
