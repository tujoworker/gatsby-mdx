import React, { Component } from "react";
import { graphql } from "gatsby";
import { css } from "emotion";

import MDXRenderer from "gatsby-mdx/mdx-renderer";

export default class MDXRuntimeMultiTest extends Component {
  render() {
    const { children, data, ...props } = this.props;
    return (
      <div>
        <h1>Uses MDXRenderer</h1>
        <div>{children}</div>
        <div
          className={css`
            display: flex;
          `}
        >
          {data.allMdx.edges.map(({ node }) => (
            <div key={node.id}>
              <MDXRenderer
                {...props}
                pageContext={{ tableOfContents: node.tableOfContents }}
              >
                {node.code.body}
              </MDXRenderer>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export const pageQuery = graphql`
  query {
    allMdx {
      edges {
        node {
          id
          code
          tableOfContents
        }
      }
    }
  }
`;
