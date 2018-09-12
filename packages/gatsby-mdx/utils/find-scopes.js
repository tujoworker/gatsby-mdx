/**
 * Given any result from GraphQL, this function returns all the scope
 * values from the `code` field of MDX nodes.
 */
const { isObject } = require("lodash");
const traverse = require("traverse");

const isMdxCode = node => {
  return node.key === "code" && node.keys.includes("_mdxCode");
};

module.exports = graphqlResult => {
  const scopes = traverse(graphqlResult).reduce(function(acc, code) {
    if (isObject(code) && isMdxCode(this)) {
      return [...acc, code.scope];
    }

    return acc;
  }, []);

  return scopes;
};
