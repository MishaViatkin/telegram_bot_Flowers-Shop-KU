export type DeepLinkRoute =
  | { type: "catalog" }
  | { type: "product"; productId: string }
  | { type: "cart" }
  | { type: "order"; orderId: string }
  | { type: "referral"; referrerId: string };

export function parseStartParam(param: string | null): DeepLinkRoute {
  if (!param) return { type: "catalog" };

  if (param.startsWith("product_")) {
    return { type: "product", productId: param.slice(8) };
  }
  if (param === "cart") {
    return { type: "cart" };
  }
  if (param.startsWith("order_")) {
    return { type: "order", orderId: param.slice(6) };
  }
  if (param.startsWith("ref_")) {
    return { type: "referral", referrerId: param.slice(4) };
  }

  return { type: "catalog" };
}

export function deepLinkToPath(route: DeepLinkRoute): string {
  switch (route.type) {
    case "product":
      return `/product/${route.productId}`;
    case "cart":
      return "/cart";
    case "order":
      return `/order/${route.orderId}`;
    case "referral":
      return `/?ref=${route.referrerId}`;
    default:
      return "/";
  }
}
