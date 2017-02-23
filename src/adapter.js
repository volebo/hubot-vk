"use strict"

const HTTPS         = require("https");

const hubot         = require("hubot")

const Robot = hubot.robot
const Adapter = hubot.adapter
const Message = hubot.message

const TextMessage   =  Message.TextMessage
const EnterMessage  =  Message.EnterMessage
const LeaveMessage  =  Message.LeaveMessage
const TopicMessage  =  Message.TopicMessage

const Streaming = require("./streaming")

const utils = require("./utils")
const slice = utils.slice

class VkAdapter extends Adapter {

	constructor(robot) {
		super(robot)
        @verifyToken = process.env.MESSENGER_VERIFY_TOKEN
        @accessToken = process.env.MESSENGER_ACCESS_TOKEN
        @apiURL = "https://graph.facebook.com/v2.6"
        @robot.logger.info "hubot-messenger-bot: Adapter loaded."
	}

	send {
		var envelope, string, strings;
		envelope = arguments[0], strings = 2 <= arguments.length ? slice.call(arguments, 1) : [];
		if (strings.length > 0) {
			string = strings.shift();
			if (typeof string === 'function') {
				string();
				return this.send.apply(this, [envelope].concat(slice.call(strings)));
			} else {
				return this.bot.Room(envelope.room).speak(string, (function(_this) {
					return function(err, data) {
						if (err != null) {
							_this.robot.logger.error("Campfire send error: " + err);
						}
						return _this.send.apply(_this, [envelope].concat(slice.call(strings)));
					};
				})(this));
			}
		}
	}

	emote() {
		var envelope, strings;
		envelope = arguments[0], strings = 2 <= arguments.length ? slice.call(arguments, 1) : [];
		return this.send.apply(this, [envelope].concat(slice.call(strings.map(function(str) {
			return "*" + str + "*";
		}))));
	}

	reply() {
		var envelope, strings;
		envelope = arguments[0], strings = 2 <= arguments.length ? slice.call(arguments, 1) : [];
		return this.send.apply(this, [envelope].concat(slice.call(strings.map(function(str) {
			return envelope.user.name + ": " + str;
		}))));
	}

	topic() {
		var envelope, strings;
		envelope = arguments[0], strings = 2 <= arguments.length ? slice.call(arguments, 1) : [];
		return this.bot.Room(envelope.room).topic(strings.join(" / "), (function(_this) {
			return function(err, data) {
				if (err != null) {
					return _this.robot.logger.error("Campfire topic error: " + err);
				}
			};
		})(this));
	}

	play() {
		var envelope, strings;
		envelope = arguments[0], strings = 2 <= arguments.length ? slice.call(arguments, 1) : [];
		return this.bot.Room(envelope.room).sound(strings.shift(), (function(_this) {
			return function(err, data) {
				if (err != null) {
					_this.robot.logger.error("Campfire sound error: " + err);
				}
				return _this.play.apply(_this, [envelope].concat(slice.call(strings)));
			};
		})(this));
	}

	locked() {
		var envelope, strings;
		envelope = arguments[0], strings = 2 <= arguments.length ? slice.call(arguments, 1) : [];
		if (envelope.message["private"]) {
			return this.send.apply(this, [envelope].concat(slice.call(strings)));
		} else {
			return this.bot.Room(envelope.room).lock((function(_this) {
				return function() {
					var args;
					args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
					strings.push(function() {
						return setTimeout((function() {
							return _this.bot.Room(envelope.room).unlock();
						}), 3000);
					});
					return _this.send.apply(_this, [envelope].concat(slice.call(strings)));
				};
			})(this));
		}
	}

	run() {
		var bot, options, self, withAuthor;
		self = this;
		options = {
			token: process.env.HUBOT_CAMPFIRE_TOKEN,
			rooms: process.env.HUBOT_CAMPFIRE_ROOMS,
			account: process.env.HUBOT_CAMPFIRE_ACCOUNT
		};
		bot = new CampfireStreaming(options, this.robot);
		withAuthor = function(callback) {
			return function(id, created, room, user, body) {
				return bot.User(user, function(err, userData) {
					var author, userId;
					if (userData.user) {
						author = self.robot.brain.userForId(userData.user.id, userData.user);
						userId = userData.user.id;
						self.robot.brain.data.users[userId].name = userData.user.name;
						self.robot.brain.data.users[userId].email_address = userData.user.email_address;
						author.room = room;
						return callback(id, created, room, user, body, author);
					}
				});
			};
		};
		bot.on("TextMessage", withAuthor(function(id, created, room, user, body, author) {
			var message;
			if (bot.info.id !== author.id) {
				message = new TextMessage(author, body, id);
				message["private"] = bot["private"][room];
				return self.receive(message);
			}
		}));
		bot.on("EnterMessage", withAuthor(function(id, created, room, user, body, author) {
			if (bot.info.id !== author.id) {
				return self.receive(new EnterMessage(author, null, id));
			}
		}));
		bot.on("LeaveMessage", withAuthor(function(id, created, room, user, body, author) {
			if (bot.info.id !== author.id) {
				return self.receive(new LeaveMessage(author, null, id));
			}
		}));
		bot.on("TopicChangeMessage", withAuthor(function(id, created, room, user, body, author) {
			if (bot.info.id !== author.id) {
				return self.receive(new TopicMessage(author, body, id));
			}
		}));
		bot.on("LockMessage", withAuthor(function(id, created, room, user, body, author) {
			return bot["private"][room] = true;
		}));
		bot.on("UnlockMessage", withAuthor(function(id, created, room, user, body, author) {
			return bot["private"][room] = false;
		}));
		bot.Me(function(err, data) {
			var i, len, ref1, results, roomId;
			bot.info = data.user;
			bot.name = bot.info.name;
			ref1 = bot.rooms;
			results = [];
			for (i = 0, len = ref1.length; i < len; i++) {
				roomId = ref1[i];
				results.push((function(roomId) {
					return bot.Room(roomId).join(function(err, callback) {
						return bot.Room(roomId).listen();
					});
				})(roomId));
			}
			return results;
		});
		bot.on("reconnect", function(roomId) {
			return bot.Room(roomId).join(function(err, callback) {
				return bot.Room(roomId).listen();
			});
		});
		this.bot = bot;
		return self.emit("connected");
	}
}

module.exports = VkAdapter
