import { describe, expect, it } from "vitest";
import { extractCheckUrl, extractSearchResults } from "@/lib/dataforseo";

const sampleResponse = {
  tasks: [
    {
      id: "123",
      result: [
        {
          check_url: "https://www.google.com/search?tbm=isch&q=test",
          items: [
            {
              type: "images",
              items: [
                {
                  title: "Sample Match",
                  url: "https://example.com/page",
                  image_url: "https://example.com/image.jpg",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("dataforseo parsing", () => {
  it("extracts check URL", () => {
    expect(extractCheckUrl(sampleResponse)).toBe(
      "https://www.google.com/search?tbm=isch&q=test",
    );
  });

  it("extracts visual match items", () => {
    const results = extractSearchResults(sampleResponse);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      title: "Sample Match",
      pageUrl: "https://example.com/page",
      imageUrl: "https://example.com/image.jpg",
      domain: "example.com",
    });
  });
});
