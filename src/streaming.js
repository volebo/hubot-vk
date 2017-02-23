const EventEmitter        = require('events').EventEmitter

class CampfireStreaming extends EventEmitter {

	constructor(options, robot1) {
		this.robot = robot1;
		if (!((options.token != null) && (options.rooms != null) && (options.account != null))) {
			this.robot.logger.error("Not enough parameters provided. I need a token, rooms and account");
			process.exit(1);
		}
		this.token = options.token;
		this.rooms = options.rooms.split(",");
		this.account = options.account;
		this.host = this.account + ".campfirenow.com";
		this.authorization = "Basic " + new Buffer(this.token + ":x").toString("base64");
		this["private"] = {};
	}

	Rooms (callback) {
		return this.get("/rooms", callback);
	}

	User (id, callback) {
		return this.get("/users/" + id, callback);
	}

	Me (callback) {
		return this.get("/users/me", callback);
	}

	Room(id) {
		var logger, self;
		self = this;
		logger = this.robot.logger;
		return {
			show: function(callback) {
				return self.get("/room/" + id, callback);
			},
			join: function(callback) {
				return self.post("/room/" + id + "/join", "", callback);
			},
			leave: function(callback) {
				return self.post("/room/" + id + "/leave", "", callback);
			},
			lock: function(callback) {
				return self.post("/room/" + id + "/lock", "", callback);
			},
			unlock: function(callback) {
				return self.post("/room/" + id + "/unlock", "", callback);
			},
			paste: function(text, callback) {
				return this.message(text, "PasteMessage", callback);
			},
			topic: function(text, callback) {
				var body;
				body = {
					room: {
						topic: text
					}
				};
				return self.put("/room/" + id, body, callback);
			},
			sound: function(text, callback) {
				return this.message(text, "SoundMessage", callback);
			},
			speak: function(text, callback) {
				var body;
				body = {
					message: {
						"body": text
					}
				};
				return self.post("/room/" + id + "/speak", body, callback);
			},
			message: function(text, type, callback) {
				var body;
				body = {
					message: {
						"body": text,
						"type": type
					}
				};
				return self.post("/room/" + id + "/speak", body, callback);
			},
			listen: function() {
				var headers, options, ref1, ref2, request;
				headers = {
					"Host": "streaming.campfirenow.com",
					"Authorization": self.authorization,
					"User-Agent": "Hubot/" + ((ref1 = this.robot) != null ? ref1.version : void 0) + " (" + ((ref2 = this.robot) != null ? ref2.name : void 0) + ")"
				};
				options = {
					"agent": false,
					"host": "streaming.campfirenow.com",
					"port": 443,
					"path": "/room/" + id + "/live.json",
					"method": "GET",
					"headers": headers
				};
				request = HTTPS.request(options, function(response) {
					var buf;
					response.setEncoding("utf8");
					buf = '';
					response.on("data", function(chunk) {
						var data, error, offset, part, results;
						if (chunk === ' ') {

						} else if (chunk.match(/^\s*Access Denied/)) {
							return logger.error("Campfire error on room " + id + ": " + chunk);
						} else {
							buf += chunk;
							results = [];
							while ((offset = buf.indexOf("\r")) > -1) {
								part = buf.substr(0, offset);
								buf = buf.substr(offset + 1);
								if (part) {
									try {
										data = JSON.parse(part);
										results.push(self.emit(data.type, data.id, data.created_at, data.room_id, data.user_id, data.body));
									} catch (error1) {
										error = error1;
										results.push(logger.error("Campfire data error: " + error + "\n" + error.stack));
									}
								} else {
									results.push(void 0);
								}
							}
							return results;
						}
					});
					response.on("end", function() {
						logger.error("Streaming connection closed for room " + id + ". :(");
						return setTimeout(function() {
							return self.emit("reconnect", id);
						}, 5000);
					});
					return response.on("error", function(err) {
						return logger.error("Campfire listen response error: " + err);
					});
				});
				request.on("error", function(err) {
					return logger.error("Campfire listen request error: " + err);
				});
				return request.end();
			}
		};
	}

	get(path, callback) {
		return this.request("GET", path, null, callback);
	}

	post(path, body, callback) {
		return this.request("POST", path, body, callback);
	}

	put(path, body, callback) {
		return this.request("PUT", path, body, callback);
	}

	request(method, path, body, callback) {
		var headers, logger, options, ref1, ref2, request;
		logger = this.robot.logger;
		headers = {
			"Authorization": this.authorization,
			"Host": this.host,
			"Content-Type": "application/json",
			"User-Agent": "Hubot/" + ((ref1 = this.robot) != null ? ref1.version : void 0) + " (" + ((ref2 = this.robot) != null ? ref2.name : void 0) + ")"
		};
		options = {
			"agent": false,
			"host": this.host,
			"port": 443,
			"path": path,
			"method": method,
			"headers": headers
		};
		if (method === "POST" || method === "PUT") {
			if (typeof body !== "string") {
				body = JSON.stringify(body);
			}
			body = new Buffer(body);
			options.headers["Content-Length"] = body.length;
		}
		request = HTTPS.request(options, function(response) {
			var data;
			data = "";
			response.on("data", function(chunk) {
				return data += chunk;
			});
			response.on("end", function() {
				var error;
				if (response.statusCode >= 400) {
					switch (response.statusCode) {
						case 401:
							throw new Error("Invalid access token provided");
							break;
						default:
							logger.error("Campfire HTTPS status code: " + response.statusCode);
							logger.error("Campfire HTTPS response data: " + data);
					}
				}
				if (callback) {
					try {
						return callback(null, JSON.parse(data));
					} catch (error1) {
						error = error1;
						return callback(null, data || {});
					}
				}
			});
			return response.on("error", function(err) {
				logger.error("Campfire HTTPS response error: " + err);
				return callback(err, {});
			});
		});
		if (method === "POST" || method === "PUT") {
			request.end(body, 'binary');
		} else {
			request.end();
		}
		return request.on("error", function(err) {
			return logger.error("Campfire request error: " + err);
		});
	}
}

module.exports = CampfireStreaming
