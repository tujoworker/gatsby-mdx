const babel = require("@babel/core");
const babelReact = require("@babel/preset-react");
const objRestSpread = require("@babel/plugin-proposal-object-rest-spread");
const merge = require("lodash/merge");
const mdx = require("./mdx");
const gatherExportsGenerator = require("./babel-plugin-gather-exports");

// grab all the export values
module.exports = code => {
  const gatherExports = gatherExportsGenerator();
  babel.transform(code, {
    presets: [babelReact],
    plugins: [gatherExports, objRestSpread]
  });

  const exportedVariables = gatherExports.results();

  // grab the frontmatter
  const classicFrontmatter = exportedVariables._frontmatter || {};
  const exportFrontmatter = exportedVariables.frontmatter || {};

  // delete the frontmatter from the exports
  delete exportedVariables._frontmatter;
  delete exportedVariables.frontmatter;

  // add the merged frontmatter to the exports
  exportedVariables.frontmatter = merge(classicFrontmatter, exportFrontmatter);

  return exportedVariables;
};
