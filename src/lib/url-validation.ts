const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "local",
]);

const isIPv4 = (value: string) => {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^[0-9]+$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
};

const isPrivateIPv4 = (value: string) => {
  if (!isIPv4(value)) return false;
  const [a, b] = value.split(".").map((part) => Number(part));
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
};

const isPrivateIPv6 = (value: string) => {
  const host = value.toLowerCase();
  if (host === "::" || host === "::1") return true;
  if (host.startsWith("fe80:")) return true;
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  if (host.startsWith("2001:db8")) return true;
  if (host.startsWith("::ffff:")) {
    const v4 = host.replace("::ffff:", "");
    return isPrivateIPv4(v4);
  }
  return false;
};

const isBlockedHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase();
  if (LOCAL_HOSTNAMES.has(normalized)) return true;
  if (normalized.endsWith(".local")) return true;
  if (normalized.endsWith(".localhost")) return true;
  if (normalized.endsWith(".internal")) return true;
  if (normalized.endsWith(".localdomain")) return true;
  if (isPrivateIPv4(normalized)) return true;
  if (normalized.includes(":")) return isPrivateIPv6(normalized);
  return false;
};

export const validatePublicImageUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid image URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS image URLs are allowed.");
  }

  if (url.username || url.password) {
    throw new Error("Image URLs cannot include credentials.");
  }

  if (!url.hostname || isBlockedHostname(url.hostname)) {
    throw new Error("Image URL must be publicly reachable.");
  }

  return url.toString();
};
