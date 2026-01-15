import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  extractCheckUrl,
  extractSearchResults,
  parseImageSearchInput,
  postSearchByImageTask,
  getSearchByImageTask,
  pollSearchResults,
  resolveSearchResults,
} from "@/lib/dataforseo";
import { createMockEnv, mockFetch, restoreFetch } from "@/test/setup";
import { DataForSEOError, ValidationError } from "@/lib/errors";
import type { AppEnv } from "@/lib/cf-env";

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
  describe("extractCheckUrl", () => {
    it("extracts check URL from valid response", () => {
      expect(extractCheckUrl(sampleResponse)).toBe(
        "https://www.google.com/search?tbm=isch&q=test",
      );
    });

    it("returns undefined for empty tasks", () => {
      expect(extractCheckUrl({ tasks: [] })).toBeUndefined();
    });

    it("returns undefined when tasks is missing", () => {
      expect(extractCheckUrl({})).toBeUndefined();
    });

    it("returns undefined when result is missing", () => {
      expect(extractCheckUrl({ tasks: [{ id: "123" }] })).toBeUndefined();
    });

    it("returns undefined when result array is empty", () => {
      expect(
        extractCheckUrl({ tasks: [{ id: "123", result: [] }] }),
      ).toBeUndefined();
    });

    it("returns undefined when check_url is missing", () => {
      expect(
        extractCheckUrl({
          tasks: [{ id: "123", result: [{}] }],
        }),
      ).toBeUndefined();
    });
  });

  describe("extractSearchResults", () => {
    it("extracts visual match items from nested structure", () => {
      const results = extractSearchResults(sampleResponse);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        title: "Sample Match",
        pageUrl: "https://example.com/page",
        imageUrl: "https://example.com/image.jpg",
        domain: "example.com",
      });
    });

    it("returns empty array for empty response", () => {
      expect(extractSearchResults({})).toEqual([]);
    });

    it("returns empty array when tasks is missing", () => {
      expect(extractSearchResults({ tasks: [] })).toEqual([]);
    });

    it("returns empty array when result is missing", () => {
      expect(extractSearchResults({ tasks: [{ id: "123" }] })).toEqual([]);
    });

    it("returns empty array when items is missing", () => {
      expect(
        extractSearchResults({
          tasks: [{ id: "123", result: [{}] }],
        }),
      ).toEqual([]);
    });

    it("handles flat items array", () => {
      const response = {
        tasks: [
          {
            id: "123",
            result: [
              {
                items: [
                  {
                    title: "Flat Result",
                    url: "https://flat.com/page",
                  },
                ],
              },
            ],
          },
        ],
      };
      const results = extractSearchResults(response);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Flat Result");
    });

    it("deduplicates results by pageUrl", () => {
      const response = {
        tasks: [
          {
            result: [
              {
                items: [
                  {
                    title: "First",
                    url: "https://example.com/page",
                  },
                  {
                    title: "Duplicate",
                    url: "https://example.com/page",
                  },
                ],
              },
            ],
          },
        ],
      };
      const results = extractSearchResults(response);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("First");
    });

    it("normalizes different URL field names", () => {
      const response = {
        tasks: [
          {
            result: [
              {
                items: [
                  { url: "https://a.com" },
                  { page_url: "https://b.com" },
                  { source_url: "https://c.com" },
                  { link: "https://d.com" },
                ],
              },
            ],
          },
        ],
      };
      const results = extractSearchResults(response);
      expect(results).toHaveLength(4);
      expect(results.map((r) => r.pageUrl)).toEqual([
        "https://a.com",
        "https://b.com",
        "https://c.com",
        "https://d.com",
      ]);
    });

    it("normalizes different title field names", () => {
      const response = {
        tasks: [
          {
            result: [
              {
                items: [
                  { url: "https://a.com", title: "Title1" },
                  { url: "https://b.com", source_title: "Title2" },
                  { url: "https://c.com", alt: "Title3" },
                  { url: "https://d.com" },
                ],
              },
            ],
          },
        ],
      };
      const results = extractSearchResults(response);
      expect(results.map((r) => r.title)).toEqual([
        "Title1",
        "Title2",
        "Title3",
        "d.com",
      ]);
    });

    it("normalizes different image URL field names", () => {
      const response = {
        tasks: [
          {
            result: [
              {
                items: [
                  { url: "https://a.com", image_url: "img1.jpg" },
                  { url: "https://b.com", thumbnail_url: "img2.jpg" },
                  { url: "https://c.com", thumbnail: "img3.jpg" },
                ],
              },
            ],
          },
        ],
      };
      const results = extractSearchResults(response);
      expect(results.map((r) => r.imageUrl)).toEqual([
        "img1.jpg",
        "img2.jpg",
        "img3.jpg",
      ]);
    });

    it("skips items with no URL", () => {
      const response = {
        tasks: [
          {
            result: [
              {
                items: [
                  { title: "No URL" },
                  { url: "https://valid.com", title: "Valid" },
                ],
              },
            ],
          },
        ],
      };
      const results = extractSearchResults(response);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Valid");
    });

    it("skips null items", () => {
      const response = {
        tasks: [
          {
            result: [
              {
                items: [null, { url: "https://valid.com" }, null],
              },
            ],
          },
        ],
      };
      const results = extractSearchResults(response);
      expect(results).toHaveLength(1);
    });

    it("handles malformed domain extraction", () => {
      const response = {
        tasks: [
          {
            result: [
              {
                items: [{ url: "not-a-url" }, { url: "https://valid.com" }],
              },
            ],
          },
        ],
      };
      const results = extractSearchResults(response);
      expect(results).toHaveLength(2);
      expect(results[0].domain).toBeUndefined();
      expect(results[1].domain).toBe("valid.com");
    });
  });

  describe("parseImageSearchInput", () => {
    it("parses valid input with all fields", async () => {
      const request = new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          imageUrl: "https://example.com/image.jpg",
          imageHash: "a".repeat(64),
          turnstileToken: "token123",
        }),
      });

      const result = await parseImageSearchInput(request);
      expect(result.imageUrl).toBe("https://example.com/image.jpg");
      expect(result.imageHash).toBe("a".repeat(64));
      expect(result.turnstileToken).toBe("token123");
    });

    it("parses valid input with required fields only", async () => {
      const request = new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          imageUrl: "https://example.com/image.jpg",
        }),
      });

      const result = await parseImageSearchInput(request);
      expect(result.imageUrl).toBe("https://example.com/image.jpg");
      expect(result.imageHash).toBeUndefined();
      expect(result.turnstileToken).toBeUndefined();
    });

    it("normalizes imageHash to lowercase", async () => {
      const request = new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          imageUrl: "https://example.com/image.jpg",
          imageHash: "A".repeat(64),
        }),
      });

      const result = await parseImageSearchInput(request);
      expect(result.imageHash).toBe("a".repeat(64));
    });

    it("throws ValidationError for missing imageUrl", async () => {
      const request = new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({}),
      });

      await expect(parseImageSearchInput(request)).rejects.toThrow(
        ValidationError,
      );
    });

    it("throws ValidationError for invalid imageUrl", async () => {
      const request = new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          imageUrl: "not-a-url",
        }),
      });

      await expect(parseImageSearchInput(request)).rejects.toThrow(
        ValidationError,
      );
    });

    it("throws ValidationError for invalid imageHash format", async () => {
      const request = new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          imageUrl: "https://example.com/image.jpg",
          imageHash: "not-a-hash",
        }),
      });

      await expect(parseImageSearchInput(request)).rejects.toThrow(
        ValidationError,
      );
    });

    it("throws ValidationError for URL exceeding max length", async () => {
      const request = new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({
          imageUrl: "https://example.com/" + "a".repeat(3000),
        }),
      });

      await expect(parseImageSearchInput(request)).rejects.toThrow(
        ValidationError,
      );
    });

    it("handles malformed JSON", async () => {
      const request = new Request("https://example.com", {
        method: "POST",
        body: "invalid json",
      });

      await expect(parseImageSearchInput(request)).rejects.toThrow(
        ValidationError,
      );
    });
  });
});

describe("DataForSEO API calls", () => {
  let env: AppEnv;

  beforeEach(() => {
    env = createMockEnv();
    restoreFetch();
  });

  describe("postSearchByImageTask", () => {
    it("sends POST request with correct structure", async () => {
      const mockResponse = {
        tasks: [{ id: "task123", status_code: 20100 }],
      };
      mockFetch(mockResponse);

      const result = await postSearchByImageTask(
        env,
        "https://example.com/image.jpg",
      );

      expect(result).toEqual(mockResponse);
    });

    it("throws DataForSEOError when credentials are missing", async () => {
      const noCredsEnv = { ...env, DFS_LOGIN: undefined };

      await expect(
        postSearchByImageTask(noCredsEnv, "https://example.com/image.jpg"),
      ).rejects.toThrow(DataForSEOError);
    });

    it("throws DataForSEOError when endpoint is missing", async () => {
      const noEndpointEnv = { ...env, DFS_ENDPOINT_POST: undefined };

      await expect(
        postSearchByImageTask(noEndpointEnv, "https://example.com/image.jpg"),
      ).rejects.toThrow(DataForSEOError);
    });

    it("retries on 500 errors", async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          return new Response("Internal Server Error", { status: 500 });
        }
        return new Response(JSON.stringify({ tasks: [{ id: "task123" }] }), {
          status: 200,
        });
      });

      // Speed up the delay function
      vi.stubGlobal("setTimeout", (fn: () => void) => {
        return fn() as unknown as NodeJS.Timeout;
      });

      try {
        const result = await postSearchByImageTask(
          env,
          "https://example.com/image.jpg",
        );

        expect(attempts).toBe(3);
        expect(result.tasks?.[0]?.id).toBe("task123");
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it("retries on 429 rate limit errors", async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          return new Response("Rate Limited", { status: 429 });
        }
        return new Response(JSON.stringify({ tasks: [{ id: "task123" }] }), {
          status: 200,
        });
      });

      // Speed up the delay function
      vi.stubGlobal("setTimeout", (fn: () => void) => {
        return fn() as unknown as NodeJS.Timeout;
      });

      try {
        const result = await postSearchByImageTask(
          env,
          "https://example.com/image.jpg",
        );

        expect(attempts).toBe(2);
        expect(result.tasks?.[0]?.id).toBe("task123");
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it("does not retry on 401 auth errors", async () => {
      const fetchSpy = vi
        .fn()
        .mockResolvedValue(new Response("Unauthorized", { status: 401 }));
      global.fetch = fetchSpy;

      await expect(
        postSearchByImageTask(env, "https://example.com/image.jpg"),
      ).rejects.toThrow(DataForSEOError);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("retries 3 times then throws on 404 errors (BUG: should not retry)", async () => {
      const fetchSpy = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(new Response("Not Found", { status: 404 })),
        );
      global.fetch = fetchSpy;

      await expect(
        postSearchByImageTask(env, "https://example.com/image.jpg"),
      ).rejects.toThrow(DataForSEOError);

      // BUG: Currently retries 3 times on 404, but should only be called once
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it("handles network errors with retry", async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error("Network error");
        }
        return new Response(JSON.stringify({ tasks: [{ id: "task123" }] }), {
          status: 200,
        });
      });

      // Speed up the delay function
      vi.stubGlobal("setTimeout", (fn: () => void) => {
        return fn() as unknown as NodeJS.Timeout;
      });

      try {
        const result = await postSearchByImageTask(
          env,
          "https://example.com/image.jpg",
        );

        expect(attempts).toBe(2);
        expect(result.tasks?.[0]?.id).toBe("task123");
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it("throws after max retries", async () => {
      global.fetch = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(new Response("Server Error", { status: 500 })),
        );

      // Speed up the delay function
      vi.stubGlobal("setTimeout", (fn: () => void) => {
        return fn() as unknown as NodeJS.Timeout;
      });

      try {
        await expect(
          postSearchByImageTask(env, "https://example.com/image.jpg"),
        ).rejects.toThrow(DataForSEOError);
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe("getSearchByImageTask", () => {
    it("retrieves task results", async () => {
      const mockResponse = {
        tasks: [
          {
            id: "task123",
            status_code: 20000,
            result: [
              {
                items: [
                  {
                    type: "images",
                    items: [{ title: "Result", url: "https://example.com" }],
                  },
                ],
              },
            ],
          },
        ],
      };
      mockFetch(mockResponse);

      const result = await getSearchByImageTask(env, "task123");

      expect(result).toEqual(mockResponse);
    });

    it("throws DataForSEOError when endpoint is missing", async () => {
      const noEndpointEnv = { ...env, DFS_ENDPOINT_GET: undefined };

      await expect(
        getSearchByImageTask(noEndpointEnv, "task123"),
      ).rejects.toThrow(DataForSEOError);
    });

    it("retries on transient failures", async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          return new Response("Service Unavailable", { status: 503 });
        }
        return new Response(JSON.stringify({ tasks: [{ id: "task123" }] }), {
          status: 200,
        });
      });

      // Speed up the delay function
      vi.stubGlobal("setTimeout", (fn: () => void) => {
        return fn() as unknown as NodeJS.Timeout;
      });

      try {
        const result = await getSearchByImageTask(env, "task123");

        expect(attempts).toBe(2);
        expect(result.tasks?.[0]?.id).toBe("task123");
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe("pollSearchResults", () => {
    it("returns results when found on first attempt", async () => {
      const mockData = {
        tasks: [
          {
            result: [
              {
                items: [
                  {
                    type: "images",
                    items: [{ title: "Result", url: "https://example.com" }],
                  },
                ],
              },
            ],
          },
        ],
      };

      // Speed up the delay function
      vi.stubGlobal("setTimeout", (fn: () => void) => {
        return fn() as unknown as NodeJS.Timeout;
      });

      try {
        global.fetch = vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify(mockData), { status: 200 }),
          );

        const { results } = await pollSearchResults(env, "task123");

        expect(results).toHaveLength(1);
        expect(results[0].title).toBe("Result");
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it("retries when no results found", async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          return new Response(
            JSON.stringify({ tasks: [{ result: [{ items: [] }] }] }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            tasks: [
              {
                result: [
                  {
                    items: [
                      {
                        type: "images",
                        items: [
                          { title: "Result", url: "https://example.com" },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          }),
          { status: 200 },
        );
      });

      // Speed up the delay function
      vi.stubGlobal("setTimeout", (fn: () => void) => {
        return fn() as unknown as NodeJS.Timeout;
      });

      try {
        const { results } = await pollSearchResults(env, "task123");

        expect(results).toHaveLength(1);
        expect(attempts).toBe(2);
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it("returns empty results after max attempts", async () => {
      // Speed up the delay function
      vi.stubGlobal("setTimeout", (fn: () => void) => {
        return fn() as unknown as NodeJS.Timeout;
      });

      try {
        global.fetch = vi
          .fn()
          .mockImplementation(() =>
            Promise.resolve(
              new Response(
                JSON.stringify({ tasks: [{ result: [{ items: [] }] }] }),
                { status: 200 },
              ),
            ),
          );

        const { results } = await pollSearchResults(env, "task123");

        expect(results).toEqual([]);
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe("resolveSearchResults", () => {
    it("completes full search workflow", async () => {
      const taskId = "task456";

      // Speed up the delay function
      vi.stubGlobal("setTimeout", (fn: () => void) => {
        return fn() as unknown as NodeJS.Timeout;
      });

      try {
        global.fetch = vi
          .fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ tasks: [{ id: taskId }] }), {
              status: 200,
            }),
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({
                tasks: [
                  {
                    id: taskId,
                    result: [
                      {
                        check_url: "https://google.com/search",
                        items: [
                          {
                            type: "images",
                            items: [
                              { title: "Result", url: "https://example.com" },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              }),
              { status: 200 },
            ),
          );

        const result = await resolveSearchResults(
          env,
          "https://example.com/image.jpg",
        );

        expect(result.taskId).toBe(taskId);
        expect(result.results).toHaveLength(1);
        expect(result.checkUrl).toBe("https://google.com/search");
        expect(result.status).toBe("ready");
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it("returns pending status when no results found", async () => {
      const taskId = "task789";

      // Speed up the delay function
      vi.stubGlobal("setTimeout", (fn: () => void) => {
        return fn() as unknown as NodeJS.Timeout;
      });

      try {
        global.fetch = vi
          .fn()
          .mockImplementationOnce(() =>
            Promise.resolve(
              new Response(JSON.stringify({ tasks: [{ id: taskId }] }), {
                status: 200,
              }),
            ),
          )
          .mockImplementation(() =>
            Promise.resolve(
              new Response(
                JSON.stringify({ tasks: [{ result: [{ items: [] }] }] }),
                { status: 200 },
              ),
            ),
          );

        const result = await resolveSearchResults(
          env,
          "https://example.com/image.jpg",
        );

        expect(result.taskId).toBe(taskId);
        expect(result.results).toEqual([]);
        expect(result.status).toBe("pending");
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it("throws when taskId is missing", async () => {
      // Speed up the delay function
      vi.stubGlobal("setTimeout", (fn: () => void) => {
        return fn() as unknown as NodeJS.Timeout;
      });

      try {
        global.fetch = vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ tasks: [] }), { status: 200 }),
          );

        await expect(
          resolveSearchResults(env, "https://example.com/image.jpg"),
        ).rejects.toThrow();
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });
});
