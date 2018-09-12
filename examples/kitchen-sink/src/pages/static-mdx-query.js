import React from "react";
import { graphql, StaticQuery } from "gatsby";
import MDXRenderer from "gatsby-mdx/mdx-renderer";

export default function anotherPage() {
  return (
    <StaticQuery
      query={graphql`
        query staticQuery {
          mdx(frontmatter: { name: { eq: "non-page" } }) {
            code
          }
        }
      `}
      render={data => {
        return (
          <div>
            <MDXRenderer>{data.mdx.code}</MDXRenderer>
          </div>
        );
      }}
    />
  );
}
