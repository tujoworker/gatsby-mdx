const { get } = require("lodash");
const traverse = require("traverse");

/**
 * Checks if the given GraphQL query looks for the code field in an mdx node
 */
const findChild = (node, childName) => {
  const selections = get(node, "selectionSet.selections");

  if (!selections) {
    return;
  }

  const child = selections.find(selection => {
    return selection.kind === "Field" && selection.name.value === childName;
  });

  return child;
};

module.exports = function isMDXCodeQuery(queryAST) {
  try {
    return traverse(queryAST).reduce(function(acc, node) {
      // if the node is falsy, skip it
      if (!node) {
        return acc;
      }

      // if the query is already good, skip more looking
      if (acc) {
        return true;
      }

      // node isn't a field that ends in mdx (case insenstive), stop looking at it
      if (
        !(
          node.kind === "Field" &&
          node.name.value &&
          /mdx$/i.test(node.name.value)
        )
      ) {
        return acc;
      }

      const codeField = findChild(node, "code");

      // if we found the code field, this query is good to go
      if (codeField) {
        return true;
      }

      // if we have a edges.node.mdx.code, this query is good to go
      const edgesField = findChild(node, "edges");
      const nodeField = edgesField && findChild(edgesField, "node");

      return edgesField && nodeField && findChild(nodeField, "code");
    }, false);
  } catch (e) {
    // not a valid graphql query
    return false;
  }
};
