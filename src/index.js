"use strict"

const debug         = require("debug")("hubot-vk")
const VkAdapter     = require("./adapter")

exports.use = function use(robot) {
	return new VkAdapter(robot)
}
