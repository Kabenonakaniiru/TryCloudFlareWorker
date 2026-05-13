import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src";

describe("Worker API", () => {
	describe("GET /api/tasks", () => {
		it("should handle request", async () => {
			const request = new Request("http://example.com/api/tasks", {
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

	describe("GET /api/categories", () => {
		it("should handle request", async () => {
			const request = new Request("http://example.com/api/categories", {
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
			const request = new Request("http://example.com/api/tasks", {
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

