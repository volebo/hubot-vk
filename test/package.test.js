"use strict"

const pkg = require("../")

describe("package.test", () => {
	it("always pass", () => {
		expect(true).is.true
		expect(pkg).exist
	})
})
