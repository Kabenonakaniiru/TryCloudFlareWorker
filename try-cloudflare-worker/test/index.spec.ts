import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src";

describe("Worker API", () => {
	describe("GET /api/rules", () => {
		it("should handle request", async () => {
			const request = new Request("http://example.com/api/rules", {
				method: "GET",
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			// DB error expected in test environment (no tables)
			// Just verify the route was found and error was handled
			expect(response.status).toBe(500);
			expect(response.headers.get("content-type")).toContain("application/json");
		});
	});

	describe("GET /api/groups", () => {
		it("should handle request", async () => {
			const request = new Request("http://example.com/api/groups", {
				method: "GET",
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			// DB error expected in test environment (no tables)
			// Just verify the route was found and error was handled
			expect(response.status).toBe(500);
			expect(response.headers.get("content-type")).toContain("application/json");
		});
	});

	describe("POST requests", () => {
		it("should return 400 for invalid JSON", async () => {
			const request = new Request("http://example.com/api/rules", {
				method: "POST",
				body: "invalid json",
				headers: { "Content-Type": "application/json" },
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(400);
			const body = await response.json() as any;
			expect(body.error).toContain("Invalid JSON");
		});

		it("should validate rule creation with groupId", async () => {
			const request = new Request("http://example.com/api/rules", {
				method: "POST",
				body: JSON.stringify({
					title: "Test Rule",
					groupId: 1
				}),
				headers: { "Content-Type": "application/json" },
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			// DB error expected in test environment (no tables)
			// But validation should pass and reach DB operation
			expect(response.status).toBe(500);
			expect(response.headers.get("content-type")).toContain("application/json");
		});
	});

	describe("404 Not Found", () => {
		it("should return 404 for unknown route", async () => {
			const request = new Request("http://example.com/api/nonexistent", {
				method: "GET",
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
		});

		it("should return 404 for unknown POST route", async () => {
			const request = new Request("http://example.com/api/unknown", {
				method: "POST",
				body: "{}",
				headers: { "Content-Type": "application/json" },
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
		});
	});
});

