export const sha256Hex = async (input: ArrayBuffer | string) => {
  const data =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};
