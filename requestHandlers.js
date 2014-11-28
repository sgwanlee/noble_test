var querystring = require("querystring");
var noble = require('noble');
var async = require('async');


function three(response) {
  console.log("three request handler");
  start(response, 3);
}

function ten(response) {
  start(response, 10);
}

function index(response) {
  response.writeHead(200, {"Content-Type": "text/html"});
  response.write('<a href="/3" >Scan 3 beacons for Startkit</a><br>')
  response.write('<a href="/10" >Scan 10 beacons for Bulk</a><br>')
  response.end();
}

function start(response, beacon_number) {

  noble.startScanning();
  response.writeHead(200, {"Content-Type": "text/html"});
  response.write("Find " + beacon_number + " beacons<br>")
  var beacons = [];

  noble.on('discover', function(peripheral) {

    if ( peripheral.rssi < -65 ) {
      console.log(".");
      response.write(".");
      return;
    }

    beacons.push(peripheral);
    console.log("!");
    response.write("!");

    // console.log('peripheral uuid: '+ peripheral.uuid);
    // console.log('\tLocalName: ' + peripheral.advertisement.localName);
    // console.log('\trssi:' + peripheral.rssi);
    // console.log('\tserviceUUID' + JSON.stringify(peripheral.advertisement.serviceUuids));

    if (!(peripheral.advertisement.manufacturerData)) {
      console.log("no adv data");
      return;
    }

    // console.log('\there is my manufacturer data:');
    // var data = JSON.stringify(peripheral.advertisement.manufacturerData.toString('hex'))
    // var uuid = data.slice(9,41);
    // var major = data.slice(41, 45);
    // var minor = data.slice(45, 49);
    // console.log('\t\t' + data);
    // console.log('\t\t' + uuid);
    // console.log('\t\t' + parseInt(major, 16));
    // console.log('\t\t' + parseInt(minor, 16));

    if (beacons.length == beacon_number) {
      find_near_beacon(beacons, response)
    }
  });
  console.log("end of Start");
}

function find_near_beacon(beacons, response) {
  console.log("stop!!");
  noble.stopScanning();

  console.log(beacons.length + "beacons finds.");
  var beaconIndex = 0;
  response.write("<br>");

  async.whilst(
    function () {
      return (beaconIndex < beacons.length);
    },
    function(callback) {
      console.log("beaconIndex: " + beaconIndex);
      var beacon = beacons[beaconIndex];

      async.series([
        function(callback) {
          explore(beacon, callback, response);
        },
        function() {
          beaconIndex++;
          response.write("<br>");
          callback();
        }
      ]);
    },
    function (err) {
      console.log("call mother callback");
      response.write("<br> end.")
      response.end();
      beacons = [];
    }
  );
}

function explore(peripheral, mother_callback, response) {
  console.log('services and characteristics:');

  peripheral.on('disconnect', function() {
    // process.exit(0);
    mother_callback();
  });

  peripheral.connect(function(error) {
    var serviceUUIDs = ["28f67260100048b3ade76cda36c999d5"];
    var characteristicUUIDs = ["28f67261100048b3ade76cda36c999d5", "28f67265100048b3ade76cda36c999d5", "28f67264100048b3ade76cda36c999d5"]

    peripheral.discoverSomeServicesAndCharacteristics(serviceUUIDs, characteristicUUIDs, function(error, services, characteristics) {
      var characteristicIndex = 0;
      console.log("number of characteristics: " + characteristics.length);
      // console.log("characteristics: " + characteristics);

      async.whilst(
        function () {
          return (characteristicIndex < characteristics.length);
        },
        function(callback) {
          var characteristic = characteristics[characteristicIndex];

          async.series([
            function(callback) {
              characteristic.read(function(error, data) {
                if (data) {

                  if (characteristic.uuid == "28f67261100048b3ade76cda36c999d5") {
                    var battery_hex = data.toString('hex');
                    battery_hex = battery_hex.substring(2,4) + battery_hex.substring(0,2)
                    console.log("battery: " + parseInt(battery_hex, 16));
                    response.write("battery: " + parseInt(battery_hex, 16) + " ");
                  }

                  if (characteristic.uuid == "28f67265100048b3ade76cda36c999d5") {
                    var firmware_ver = data.toString('ascii');
                    console.log("firm_ver: " + firmware_ver);
                    response.write("firm_ver: " + firmware_ver + " ");
                  }

                  if (characteristic.uuid == "28f67264100048b3ade76cda36c999d5") {
                    var serial_hex = data.toString('hex');
                    serial_hex = serial_hex.substring(6,8) + serial_hex.substring(4,6) + serial_hex.substring(2,4) + serial_hex.substring(0,2);
                    console.log("serial: " + parseInt(serial_hex, 16));
                    response.write("serial: " + parseInt(serial_hex, 16) + " ");
                  }
                }
                callback();
              });
            },
            function() {
              characteristicIndex++;
              callback();
            }
          ]);
        },
        function(error) {
          peripheral.disconnect();
        }
      );
    });
  });
}

exports.three = three;
exports.ten = ten;
exports.index = index;
