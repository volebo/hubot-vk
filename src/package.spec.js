'use strict'

const pkg = require('../')

describe('package.spec', () => {
	it('should export a function', () => {
		expect(pkg).to.be.a('function')
	})
})
