import React from "react";
import { graphql, StaticQuery } from "gatsby";
import MDXRenderer from "gatsby-mdx/mdx-renderer";

export default function anotherPage() {
  return (
    <StaticQuery
      query={graphql`
        query {
          mdx(id: { eq: "c9610a63-e336-5fdc-b2ca-abe0e4143e22" }) {
            code
          }
        }
      `}
      render={data => {
        return (
          <div>
            <MDXRenderer>{data.mdx.code.body}</MDXRenderer>
          </div>
        );
      }}
    />
  );
}
