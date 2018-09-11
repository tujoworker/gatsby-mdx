// pulled from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby/src/utils/babel-parse-to-ast.js

const parser = require("@babel/parser");

const PARSER_OPTIONS = {
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowSuperOutsideMethod: true,
  sourceType: `unambigious`,
  sourceFilename: true,
  plugins: [
    `jsx`,
    `flow`,
    `doExpressions`,
    `objectRestSpread`,
    [
      `decorators`,
      {
        decoratorsBeforeExport: true
      }
    ],
    `classProperties`,
    `classPrivateProperties`,
    `classPrivateMethods`,
    `exportDefaultFrom`,
    `exportNamespaceFrom`,
    `asyncGenerators`,
    `functionBind`,
    `functionSent`,
    `dynamicImport`,
    `numericSeparator`,
    `optionalChaining`,
    `importMeta`,
    `bigInt`,
    `optionalCatchBinding`,
    `throwExpressions`,
    [
      `pipelineOperator`,
      {
        proposal: `minimal`
      }
    ],
    `nullishCoalescingOperator`
  ]
};

exports.getBabelParserOptions = filePath => {
  // Flow and typescript plugins can't be enabled simultaneously
  if (/\.tsx?/.test(filePath)) {
    const { plugins } = PARSER_OPTIONS;
    return {
      ...PARSER_OPTIONS,
      plugins: plugins.map(
        plugin => (plugin === `flow` ? `typescript` : plugin)
      )
    };
  }
  return PARSER_OPTIONS;
};

exports.babelParseToAst = (contents, filePath) => {
  return parser.parse(contents, exports.getBabelParserOptions(filePath));
};
