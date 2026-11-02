import { describe, expect, it } from "vitest";
import { getErrorMessage } from "@/services/errors";

const failure = (detail: unknown) => ({ response: { data: { detail } } });

describe("getErrorMessage", () => {
	it("returns a plain string detail as is", () => {
		expect(getErrorMessage(failure("Invalid email or password"), "fallback")).toBe("Invalid email or password");
	});

	it("flattens a list of validation errors, dropping the 'body' prefix", () => {
		const detail = [
			{ loc: ["body", "price"], msg: "Input should be a valid number" },
			{ loc: ["body", "company_id"], msg: "Field required" },
		];
		expect(getErrorMessage(failure(detail), "fallback")).toBe("price: Input should be a valid number; company_id: Field required");
	});

	it("handles the backend's custom errors whose location is just 'body'", () => {
		expect(getErrorMessage(failure([{ loc: ["body"], msg: "The specified vehicle does not exist." }]), "fallback")).toBe("The specified vehicle does not exist.");
	});

	it("handles list items without a location", () => {
		expect(getErrorMessage(failure([{ msg: "Something is off" }]), "fallback")).toBe("Something is off");
	});

	it("keeps nested locations readable", () => {
		expect(getErrorMessage(failure([{ loc: ["body", "address", "city"], msg: "too short" }]), "x")).toBe("address.city: too short");
	});

	it.each([
		["no response", {}],
		["undefined error", undefined],
		["null error", null],
		["empty detail list", failure([])],
		["object detail", failure({ unexpected: true })],
		["no detail", { response: { data: {} } }],
	])("falls back for %s", (_label, error) => {
		expect(getErrorMessage(error, "fallback")).toBe("fallback");
	});
});
