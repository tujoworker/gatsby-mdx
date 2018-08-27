const { isFunction } = require("lodash");

const defaultOptions = require("./utils/default-options");
const createMDXNode = require("./utils/create-mdx-node");

module.exports = async (
  { node, getNode, loadNodeContent, actions, createNodeId },
  pluginOptions
) => {
  const options = defaultOptions(pluginOptions);

  /**
   * transformerOptions can be a function or a {transformer, filter} object
   */
  if (Object.keys(options.transformers).includes(node.internal.type)) {
    const transformerOptions = options.transformers[node.internal.type];
    const transformerFn = isFunction(transformerOptions)
      ? transformerOptions
      : transformerOptions.transformer;

    if (
      isFunction(transformerOptions.filter) &&
      transformerOptions.filter({ node })
    ) {
      createMDXNode(
        {
          createNodeId,
          getNode,
          loadNodeContent,
          node,
          transform: transformerFn
        },
        actions,
        { __internalMdxTypeName: "Mdx", ...pluginOptions }
      );
    }
  }
};
