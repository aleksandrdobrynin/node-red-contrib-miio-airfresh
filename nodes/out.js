const miio = require('miio');

module.exports = function(RED) {
	class MiioAirFreshOutput {
		constructor(config) {
			RED.nodes.createNode(this, config);

			var node = this;
			node.config = config;
			node.cleanTimer = null;

			//get server node
			node.server = RED.nodes.getNode(node.config.server);
			if (node.server) {
				// node.server.on('onClose', () => this.onClose());
				// node.server.on('onStateChanged', (data) => node.onStateChanged(data));
				// node.server.on('onStateChangedError', (error) => node.onStateChangedError(error));
			} else {
				node.status({
					fill: "red",
					shape: "dot",
					text: "node-red-contrib-miio-airfresh/out:status.server_node_error"
				});
			}

			node.status({}); //clean

			node.on('input', function(message) {
				clearTimeout(node.cleanTimer);
				//                console.log(node);
				var payload;
				switch (node.config.payloadType) {
					case 'flow':
					case 'global':
						{
							RED.util.evaluateNodeProperty(node.config.payload, node.config.payloadType, this, message, function(error, result) {
								if (error) {
									node.error(error, message);
								} else {
									payload = result;
								}
							});
							break;
						}

					case 'num':
						{
							payload = parseInt(node.config.payload);
							break;
						}

					case 'str':
						{
							payload = node.config.payload;
							break;
						}

					case 'object':
						{
							payload = node.config.payload;
							break;
						}

					case 'miio_payload':
						payload = node.config.payload;
						break;

					case 'homekit':
					case 'msg':
					default:
						{
							payload = message[node.config.payload];
							break;
						}
				}

				var command;
				switch (node.config.commandType) {
					case 'msg':
						{
							command = message[node.config.command];
							break;
						}
					case 'miio_cmd':
						command = node.config.command;

						switch (command) {
							case "set_power":
							case "set_ptc_on":
							case "set_display":
							case "set_sound":
							case "set_child_lock":
								if (payload === 'on' || payload === 1 || payload === '1' || payload === true) payload = 'on';
								if (payload === 'off' || payload === 0 || payload === '0' || payload === false) payload = 'off';
								break;
							case "set_favourite_speed":
								payload = parseInt(payload);
								break

							default:
								{
									break;
								}
						}
						break;

					case 'homekit':
						var fromHomekit = node.formatHomeKit(message, payload);
						if (fromHomekit) {
							command = 'json';
							payload = fromHomekit;
						} else {
							payload = command = null;
						}
						break;

					case 'str':
					default:
						{
							command = node.config.command;
							break;
						}
				}


				if (command === 'json') {
					for (var key in payload) {
						node.sendCommand(key, payload[key]);
					}
				} else {
					node.sendCommand(command, payload);
				}
			});
		}

		sendCommand(command, payload) {
			var node = this;
			var device = node.server.device;

			if (device === null) return false;
			if (device === undefined) return false;
			if (command === null) return false;
			if (payload === undefined) payload = [];
			//            if (command === 'set_favourite_speed') payload = parseInt(payload);
			if (payload && typeof(payload) !== 'object') payload = [payload];

			console.log('BEFORE SEND:');
			console.log({
				command: command,
				payload: payload
			});

			return device.call(command, payload).then(result => {
				var status = {
					fill: "green",
					shape: "dot",
					text: command
				};

				var sendPayload = result;
				if (Object.keys(result).length === 1 && (typeof(result[0]) === 'string' || typeof(result[0]) === 'number')) {
					status.text += ': ' + result[0];
					sendPayload = result[0];
				}
				node.status(status);
				node.cleanTimer = setTimeout(function() {
					node.status({});
				}, 3000);


				node.send({
					request: {
						command: command,
						payload: payload
					},
					payload: sendPayload
				});
			}).catch(err => {
				node.warn("Miio AirFresh error on command '" + command + "': " + err.message);
				node.send({
					request: {
						command: command,
						args: payload
					},
					error: err
				});
				node.status({
					fill: "red",
					shape: "dot",
					text: "node-red-contrib-miio-airfresh/out:status.error"
				});
				node.cleanTimer = setTimeout(function() {
					node.status({});
				}, 3000);
			});
		}

		formatHomeKit(message, payload) {
			if (message.hap.context === undefined) {
				return null;
			}

			var msg = {};

			if (payload.Active !== undefined) {
				msg["set_power"] = Boolean(payload.Active) ? "true" : "false";
			}

			if (payload.SwingMode !== undefined) {
				msg["set_mode"] = Boolean(payload.SwingMode) ? "sleep" : "auto";
			}

			if (payload.TargetAirPurifierState !== undefined) {
				msg["set_mode"] = Boolean(payload.TargetAirPurifierState) ? "auto" : "favourite";
			}

			if (payload.LockPhysicalControls !== undefined) {
				msg["set_child_lock"] = Boolean(payload.LockPhysicalControls) ? "true" : "false";
			}

			if (payload.On !== undefined) {
				msg["set_ptc_on"] = Boolean(payload.On) ? "true" : "false";
			}

			if (payload.RotationSpeed !== undefined) {
				var value = payload.RotationSpeed;
				var newVal;
				var newmode = "favourite";
				if (value > 0) {
					newVal = 50 + payload.RotationSpeed;

					msg["set_favourite_speed"] = newVal;
					msg["set_mode"] = newmode;
				}
			}

			return msg;
		}
	}

	RED.nodes.registerType('miio-airfresh-output', MiioAirFreshOutput);
};
