const crypto = require("crypto");
const defaultOptions = require("../utils/default-options");
const mdx = require("../utils/mdx");
const extractExports = require("../utils/extract-exports");

module.exports = async (
  { node, loadNodeContent, actions, createNodeId },
  pluginOptions
) => {
  const { createNode, createParentChildLink } = actions;
  const options = defaultOptions(pluginOptions);

  const isMarkdownMediaType =
    node.internal.mediaType === `text/markdown` ||
    node.internal.mediaType === `text/x-markdown`;

  if (
    !options.extensions.includes(node.ext) &&
    !(options.handleMarkdown && isMarkdownMediaType)
  ) {
    return;
  }

  const content = await loadNodeContent(node);

  const code = await mdx(content, options);

  // extract all the exports
  const { frontmatter, ...nodeExports } = extractExports(code);

  const mdxNode = {
    id: createNodeId(`${node.id} >>> Mdx`),
    children: [],
    parent: node.id,
    internal: {
      content: content,
      type: "Mdx"
    }
  };

  mdxNode.frontmatter = {
    title: ``, // always include a title
    ...frontmatter,
    _PARENT: node.id
  };

  mdxNode.excerpt = frontmatter.excerpt;
  mdxNode.exports = nodeExports;
  mdxNode.rawBody = content;

  // Add path to the markdown file path
  if (node.internal.type === `File`) {
    mdxNode.fileAbsolutePath = node.absolutePath;
  }

  mdxNode.internal.contentDigest = crypto
    .createHash(`md5`)
    .update(JSON.stringify(mdxNode))
    .digest(`hex`);

  createNode(mdxNode);
  createParentChildLink({ parent: node, child: mdxNode });
};
