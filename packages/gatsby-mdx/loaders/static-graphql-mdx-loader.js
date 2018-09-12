/**
 * Loader for making MDX queried via StaticQuery work.
 *
 * For the next step in rendering from MDX node, see mdx-renderer.js
 */
const crypto = require("crypto");
const { graphql } = global;
const { flatten, uniqBy } = require("lodash");
const apiRunnerNode = require("gatsby/dist/utils/api-runner-node");
const { babelParseToAst } = require("../utils/babel-parse-to-ast");
const findStaticQueries = require("../utils/find-static-queries");
const findScopes = require("../utils/find-scopes");

module.exports = async function(content) {
  const callback = this.async();
  const file = this.resourcePath;

  let ast;
  const transpiled = await apiRunnerNode(`preprocessSource`, {
    filename: file,
    contents: content
  });

  if (transpiled && transpiled.length) {
    for (const item of transpiled) {
      try {
        const tmp = babelParseToAst(item, file);
        ast = tmp;
        break;
      } catch (error) {
        continue;
      }
    }
  } else {
    try {
      ast = babelParseToAst(content, file);
    } catch (error) {
      // silently fail
    }
  }

  if (!ast) {
    return callback(null, content);
  }

  const queries = findStaticQueries(ast);
  const results = [];

  // if we have no static queries, move on
  if (queries.length === 0) {
    return callback(null, content);
  }

  for (let query of queries) {
    results.push(await graphql(query));
  }

  const scopes = uniqBy(
    flatten(results.map(({ data }) => findScopes(data))),
    "id"
  );

  // if we have no mdx scopes, move on
  if (scopes.length === 0) {
    return callback(null, content);
  }

  const scopesImports = scopes
    .map(({ id, location }) => `import ${id} from "${location}";`)
    .join("\n");

  const mdxScopes = `{${scopes.map(({ id }) => id).join(", ")}}`;

  const OriginalComponentId = `OriginalComponent_${crypto
    .createHash(`md5`)
    .update(mdxScopes)
    .digest(`hex`)}`;

  const code = `${scopesImports}
import { MDXScopeProvider } from "gatsby-mdx/context";

${content.replace("export default ", `const ${OriginalComponentId} = `)}

export default ({children, ...props}) => <MDXScopeProvider scopes={${mdxScopes}}>
  <${OriginalComponentId} {...props}>
    {children}
  </${OriginalComponentId}>
</MDXScopeProvider>`;

  return callback(null, code);
};
