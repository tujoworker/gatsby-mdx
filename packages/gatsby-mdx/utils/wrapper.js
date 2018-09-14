/**
 * utils for handling the page wrappers
 */
const isWrapper = wrapper => {
  return wrapper.startsWith("// MDX WRAPPER\n");
};

const createWrapper = ({ component, path }) => {
  return `// MDX WRAPPER
// ${component}
// ${path}
// pageQuery
export const pageQuery = graphql\`\`
// queryHash `;
};

const parseWrapper = wrapper => {
  const lines = wrapper.split("\n// ");

  return {
    component: lines[1],
    path: lines[2],
    queryHash: lines[4].replace("queryHash ", "")
  };
};

const updateQueryHash = (wrapper, newHash) => {
  return `${wrapper.split("\n// queryHash ")[0]}\n${`// queryHash ${newHash}`}`;
};

module.exports = {
  isWrapper,
  createWrapper,
  parseWrapper,
  updateQueryHash
};
