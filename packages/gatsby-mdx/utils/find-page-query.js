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

module.exports = findPageQuery;
