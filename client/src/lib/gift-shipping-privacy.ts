/**
 * Copy and retailer guidance used anywhere a gift's shipping hand-off is
 * described.  The buyer only needs to know that the retailer manages
 * delivery; an address (or the recipient's delivery name) must never be
 * rendered in the buyer's view.
 */
export const PRIVATE_RETAILER_SHIPPING_COPY =
  "Ships to recipient via retailer — address stays private.";

export interface RetailerShippingGuidance {
  retailer: string;
  title: string;
  description: string;
  /** The host is recognized, but this is not proof that privacy is configured. */
  retailerSupported: boolean;
  /** Safe URL for the recipient to open and configure retailer-managed shipping. */
  validatedUrl?: string;
}

const AMAZON_HOSTS = ["amazon.com", "amzn.to", "amzn.com", "a.co"];
const AWIN_WRAPPER_HOSTS = new Set(["awin1.com", "www.awin1.com"]);
const APPROVED_RETAILERS: Array<{ retailer: string; hosts: string[] }> = [
  { retailer: "Viator", hosts: ["viator.com", "tp.st", "travelpayouts.com"] },
  { retailer: "Klook", hosts: ["klook.com"] },
  { retailer: "Promeed", hosts: ["promeed.com", "promfreed.com"] },
  { retailer: "Lashterally", hosts: ["lashterally.com"] },
  { retailer: "Abracadabra NYC", hosts: ["abracadabranyc.com"] },
  { retailer: "YCZ Fragrance", hosts: ["yczfragrance.com"] },
];

function hostMatches(hostname: string, host: string): boolean {
  return hostname === host || hostname.endsWith(`.${host}`);
}

/**
 * Gift links must be HTTPS URLs without credentials or an explicit
 * non-default port.  Checking URL.hostname (rather than searching the raw
 * URL) prevents query strings, userinfo, and lookalike domains from selecting
 * a retailer.
 */
function parseSafeHttpsUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.port
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function retailerForHostname(hostname: string): string | null {
  const normalizedHostname = hostname.toLowerCase();
  if (AMAZON_HOSTS.some((host) => hostMatches(normalizedHostname, host))) {
    return "Amazon";
  }

  const approved = APPROVED_RETAILERS.find(({ retailer, hosts }) =>
    hosts.some((host) => hostMatches(normalizedHostname, host)),
  );
  return approved?.retailer || null;
}

function getRetailerMatch(
  url: string | null | undefined,
): { retailer: string; validatedUrl: string } | null {
  if (!url) return null;

  const parsed = parseSafeHttpsUrl(url);
  if (!parsed) return null;

  const hostname = parsed.hostname.toLowerCase();
  if (AWIN_WRAPPER_HOSTS.has(hostname)) {
    if (parsed.pathname !== "/cread.php") return null;

    const destination = parsed.searchParams.get("ued");
    const destinationUrl = destination ? parseSafeHttpsUrl(destination) : null;
    if (!destinationUrl || AWIN_WRAPPER_HOSTS.has(destinationUrl.hostname.toLowerCase())) {
      return null;
    }
    const retailer = retailerForHostname(destinationUrl.hostname);
    return retailer ? { retailer, validatedUrl: parsed.toString() } : null;
  }

  const retailer = retailerForHostname(hostname);
  return retailer ? { retailer, validatedUrl: parsed.toString() } : null;
}

export function getRetailerShippingGuidance(
  affiliateUrl: string | null | undefined,
): RetailerShippingGuidance {
  const match = getRetailerMatch(affiliateUrl);
  const retailer = match?.retailer;

  if (match && retailer === "Amazon") {
    return {
      retailer: match.retailer,
      retailerSupported: true,
      validatedUrl: match.validatedUrl,
      title: "Use Amazon's private delivery options",
      description:
        "Open the Amazon item or wishlist and configure a recipient-managed public wishlist or Amazon's retailer-supported private gift delivery. Selecting “This is a gift” alone does not automatically hide the recipient's address.",
    };
  }

  if (match) {
    return {
      retailer: match.retailer,
      retailerSupported: true,
      validatedUrl: match.validatedUrl,
      title: `Keep shipping with ${match.retailer}`,
      description:
        `Open the ${match.retailer} item and configure its gift-ship option or recipient-managed shipping directly. A recognized retailer host does not verify privacy; continue only after you confirm it can protect your address from the buyer.`,
    };
  }

  return {
    retailer: "Unsupported retailer",
    retailerSupported: false,
    title: "Private delivery is not confirmed",
    description:
      "This retailer's private delivery support is not confirmed. Do not proceed unless the retailer can protect the recipient's address.",
  };
}