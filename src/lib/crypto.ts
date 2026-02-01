/**
 * Computes the SHA-256 hash of the input and returns it as a hexadecimal string.
 *
 * @param input - The data to hash, either as a string or ArrayBuffer
 * @returns A promise that resolves to the 64-character lowercase hex string
 *
 * @example
 * ```ts
 * const hash = await sha256Hex("hello world");
 * // => "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
 *
 * const fileHash = await sha256Hex(arrayBuffer);
 * ```
 */
export const sha256Hex = async (input: ArrayBuffer | string): Promise<string> => {
  const data =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};
