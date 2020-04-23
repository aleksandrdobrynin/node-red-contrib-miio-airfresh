# node-red-contrib-miio-airfresh

Node-Red Nodes for Xiaomi Air Fresh (MJXFJ-150-A1).
Model: dmaker.airfresh.a1.



Available nodes are:
* miio-airfresh-in: get changes
* miio-airfresh-get: get status of device
* miio-airfresh-out: send command to device



<img src="https://github.com/aleksandrdobrynin/node-red-contrib-miio-airfresh/blob/master/readme/main.png?raw=true">
<img src="https://github.com/aleksandrdobrynin/node-red-contrib-miio-airfresh/blob/master/readme/properties.png?raw=true">



<b>HomeKit characteristic properties.</b>
```json
{
	"Active": {},
	"CurrentAirPurifierState": {},
	"TargetAirPurifierState": {},
	"SwingMode": {},
	"LockPhysicalControls": {},
	"CurrentTemperature": {},
	"FilterLifeLevel": {},
	"FilterChangeIndication": {},
	"CarbonDioxideLevel": {},
	"CarbonDioxideDetected": {},
	"PM2_5Density": {},
	"AirQuality": {},
	"On": {},
	"RotationSpeed": {
	     "minValue": 0,
         "maxValue": 100,
         "minStep": 1
	}
}
```
