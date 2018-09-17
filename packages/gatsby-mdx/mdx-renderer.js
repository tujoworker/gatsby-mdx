import { withMDXComponents } from "@mdx-js/tag/dist/mdx-provider";
import { withMDXScope } from "./context";

export default withMDXScope(
  withMDXComponents(
    ({ scopes = {}, scope = {}, components = {}, children, ...props }) => {
      const {
        scope: { id: scopeId },
        body
      } = children;
      const fullScope = {
        components,
        props,
        ...scope,
        ...scopes[scopeId]
      };

      // body is pre-compiled mdx
      const keys = Object.keys(fullScope);
      const values = keys.map(key => fullScope[key]);
      const fn = new Function("_fn", ...keys, `${body}`);

      const end = fn({}, ...values)({ components, ...props });
      return end;
    }
  )
);
