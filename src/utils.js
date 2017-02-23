"use strict"

const _s = [].slice

module.exports.slice = function(...args) {
	return _s.call(...args)
}
