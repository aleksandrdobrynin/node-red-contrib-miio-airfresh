const miio = require('miio');


module.exports = function(RED) {
	class MiioAirFreshInput {
		constructor(config) {
			RED.nodes.createNode(this, config);

			var node = this;
			node.config = config;
			node.cleanTimer = null;
			node.connected = false;
			node.status({}); //clean

			//get server node
			node.server = RED.nodes.getNode(node.config.server);
			if (node.server) {
				// node.server.on('onClose', () => this.onClose());
				node.server.on('onInitEnd', (status) => node.onInitEnd(status));
				node.server.on('onState', (status) => node.onStateChanged(status));
				node.server.on('onStateChanged', (data, output) => node.onStateChanged(data, output));
				node.server.on('onConnectionError', (error) => node.onConnectionError(error));


				if (node.config.outputAtStartup || node.config.for_homekit) {
					node.sendState();
				}
			} else {
				node.status({
					fill: "red",
					shape: "dot",
					text: "node-red-contrib-miio-airfresh/in:status.server_node_error"
				});
			}
		}

		sendState() {
			var node = this;
			node.send({
				'payload': node.config.for_homekit ? node.formatHomeKit() : node.server.status,
				'change': null,
				'status': node.server.status
			});
		}

		updateStatus() {
			var node = this;

			if (Object.keys(node.server.status).length) {
				var isOn = node.server.status.power === true;
				var co2 = node.server.status.co2;
				var pm25 = node.server.status.pm25;
				var mode = node.server.status.mode;
				var temperature_outside = node.server.status.temperature_outside

				var status = {
					fill: co2 <= 800 ? "green" : (isOn ? "green" : "red"),
					shape: "dot",
					text: (isOn ? "On (" + mode + ")" : "Off") + ',  ' + co2 + ' ppm' + ',  ' + pm25 + ' Вµg/m3' + ',  ' + temperature_outside + 'В°C'
				};

				node.status(status);
			}
		}

		onInitEnd(status) {
			var node = this;
			node.connected = true;
			node.updateStatus();

			if (node.config.outputAtStartup || node.config.for_homekit) {
				node.sendState();
			}
		}

		onState(status) {
			var node = this;

			if (!node.connected) {
				if (node.config.outputAtStartup || node.config.for_homekit) {
					node.sendState();
					node.updateStatus();
				}
			}

			node.connected = true;
		}

		onStateChanged(data, output) {
			var node = this;

			if ("key" in data && ["power", "mode", "co2", "pm25", "temperature_outside"].indexOf(data.key) >= 0) {
				node.updateStatus();
			}

			if (output) {
				node.send({
					'payload': node.config.for_homekit ? node.formatHomeKit() : data,
					'change': data,
					'status': node.server.status
				});
			}
		}

		onConnectionError(error) {
			var node = this;
			node.connected = false;
			var status = {
				fill: "red",
				shape: "dot",
				text: "node-red-contrib-miio-airfresh/in:status.disconnected"
			};
			node.status(status);

			if (node.config.for_homekit) {
				node.send({
					'payload': node.formatHomeKitError(),
					'status': null,
					'error': error
				});
			}
		}

		formatHomeKit() {
			var node = this;
			var status = node.server.status;
			var msg = {};

			// CurrentAirPurifierState (0,1,2 (inactive, idle, purify air))
			if (status.power === true) {
				msg.Active = 1;
				msg.CurrentAirPurifierState = 2;
			} else if (status.power === false) {
				msg.Active = 0;
				msg.CurrentAirPurifierState = 0;
			}

			// TargetAirPurifierState (0,1 (manual, auto))
			if (status.mode === "favourite") {
				msg.TargetAirPurifierState = 0;
			} else {
				msg.TargetAirPurifierState = 1;
			}

			if (status.mode == "sleep") {
				msg.SwingMode = 1;
				msg.TargetAirPurifierState = 1;
			} else {
				msg.SwingMode = 0;
			}

			if (status.child_lock === true) {
				msg.LockPhysicalControls = 1;
			} else if (status.child_lock === false) {
				msg.LockPhysicalControls = 0;
			}

			// msg.CurrentTemperature = status.temperature_outside;

			// if (status.ptc_status === true) {
			// 	msg.On = 1;
			// } else if (status.ptc_status === false) {
			// 	msg.On = 0;
			// }

			// msg.FilterLifeLevel = status.filter_rate;

			// if (status.filter_rate < 5) {
			// 	msg.FilterChangeIndication = 1;
			// } else {
			// 	msg.FilterChangeIndication = 0;
			// }

			if (status.power === false) {
				msg.RotationSpeed = 0;
			   } else if (status.mode === "auto") {
				msg.RotationSpeed = status.control_speed - 50;
			   } else if (status.mode === "favourite") {
				msg.RotationSpeed = status.control_speed - 50;
			   } else if (status.mode === "sleep") {
				msg.RotationSpeed = status.control_speed - 50;
			   } else {
				msg.RotationSpeed = 0;
			   }

			// msg.CarbonDioxideLevel = status.co2

			// if (status.co2 <= 800) {
			// 	msg.CarbonDioxideDetected = 0;
			// } else if (status.co2 > 1000) {
			// 	msg.CarbonDioxideDetected = 1;
			// }

			// msg.PM2_5Density = status.pm25;

		// 	if (status.pm25 <= 5) {
		// 		msg.AirQuality = 1;
		// 	} else if (status.pm25 > 5 && status.pm25 <= 12) {
		// 		msg.AirQuality = 2;
		// 	} else if (status.pm25 > 12 && status.pm25 <= 35) {
		// 		msg.AirQuality = 3;
		// 	} else if (status.pm25 > 35 && status.pm25 <= 55) {
		// 		msg.AirQuality = 4;
		// 	} else if (status.aqi > 55) {
		// 		msg.AirQuality = 5;
		// 	} else {
		// 		msg.AirQuality = 0;
		// 	}
		//
			return msg;
		}

		formatHomeKitError() {
			var msg = {};
			msg.Active = "NO_RESPONSE";
			msg.CurrentAirPurifierState = "NO_RESPONSE";
			msg.TargetAirPurifierState = "NO_RESPONSE";
			msg.SwingMode = "NO_RESPONSE";
			msg.LockPhysicalControls = "NO_RESPONSE";
			// msg.FilterChangeIndication = "NO_RESPONSE";
			// msg.FilterLifeLevel = "NO_RESPONSE";
			// msg.CarbonDioxideLevel = "NO_RESPONSE";
			// msg.AirQuality = "NO_RESPONSE";
			// msg.PM2_5Density = "NO_RESPONSE";
			// msg.CurrentTemperature = "NO_RESPONSE";
			// msg.On = "NO_RESPONSE";
			msg.RotationSpeed = "NO_RESPONSE";
			return msg;
		}
	}

	RED.nodes.registerType('miio-airfresh-input', MiioAirFreshInput, {});
};
