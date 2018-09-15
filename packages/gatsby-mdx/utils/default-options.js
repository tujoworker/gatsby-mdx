const { isString, uniq, once } = require("lodash");
const debug = require("debug")("gatsby-mdx:utils/default-options");

const optDebug = once(options => {
  debug("options", options);
});

module.exports = pluginOptions => {
  const options = Object.assign(
    {
      defaultLayouts: {},
      extensions: [".mdx"],
      handleMarkdown: true,
      hastPlugins: [],
      mdPlugins: [],
      transformers: {},
      root: process.cwd(),
      gatsbyRemarkPlugins: []
    },
    pluginOptions
  );

  /**
   * When `handleMarkdown` is true, we will catch all nodes with the media type
   * of `text/markdown`. In order for the mdx-loader to load markdown files as well
   * we need to add these file extensions.
   */
  if (options.handleMarkdown) {
    options.extensions = uniq([...options.extensions, ".md", ".markdown"]);
  }

  // ensure File transformer is always ours
  options.transformers.File = {
    transformer: async ({ loadNodeContent, node }) => {
      const mdxContent = await loadNodeContent(node);
      return { meta: undefined, content: mdxContent };
    },
    // We only care about markdown content.
    // replace with mediaType when mime-db is merged
    //    node.internal.mediaType !== `text/mdx`
    filter: ({ node }) => options.extensions.includes(node.ext)
  };

  // support single layout set in the `defaultLayouts` option
  if (options.defaultLayouts && isString(options.defaultLayouts)) {
    options.defaultLayouts = {
      default: options.defaultLayouts
    };
  }

  // backwards compatibility for `defaultLayout`
  if (options.defaultLayout && !options.defaultLayouts.default) {
    options.defaultLayouts.default = options.defaultLayout;
  }

  optDebug(options);
  return options;
};
