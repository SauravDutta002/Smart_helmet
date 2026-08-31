const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 10000;

const server = http.createServer(app);

const wss = new WebSocket.Server({
    server
});


// =====================================================
// DEVICES
// =====================================================

const helmets = new Map();


// =====================================================
// GET HELMET
// =====================================================

function getHelmet(deviceId) {

    if (!helmets.has(deviceId)) {

        helmets.set(deviceId, {
            raspberrypi: null,
            nodemcu: null
        });

    }

    return helmets.get(deviceId);
}


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {

    res.status(200).json({
        status: "online",
        service: "Smart Helmet Server",
        time: new Date().toISOString()
    });

});


// =====================================================
// HEALTH
// =====================================================

app.get("/health", (req, res) => {

    res.status(200).json({
        status: "healthy",
        service: "smart-helmet",
        uptime: process.uptime(),
        devices: helmets.size,
        time: new Date().toISOString()
    });

});


// =====================================================
// SAFETY DECISION
// =====================================================

function calculateSafety(data) {

    const helmetWorn =
        data.helmetWorn === true;

    const alcohol =
        data.alcohol === true;

    const drowsy =
        data.drowsy === true;

    const cameraSafe =
        data.cameraSafe === true;


    // -----------------------------------------------
    // 1. HELMET
    // -----------------------------------------------

    if (!helmetWorn) {

        return {
            status: "WEAR_HELMET",
            motor: false,
            buzzer: true,
            message: "WEAR HELMET"
        };

    }


    // -----------------------------------------------
    // 2. ALCOHOL
    // -----------------------------------------------

    if (alcohol) {

        return {
            status: "ALCOHOL",
            motor: false,
            buzzer: true,
            message: "ALCOHOL DETECTED"
        };

    }


    // -----------------------------------------------
    // 3. DROWSINESS
    // -----------------------------------------------

    if (drowsy) {

        return {
            status: "DROWSY",
            motor: false,
            buzzer: true,
            message: "WAKE UP!"
        };

    }


    // -----------------------------------------------
    // 4. CAMERA
    // -----------------------------------------------

    if (!cameraSafe) {

        return {
            status: "CAMERA_UNSAFE",
            motor: false,
            buzzer: true,
            message: "SAFETY WARNING"
        };

    }


    // -----------------------------------------------
    // 5. SAFE
    // -----------------------------------------------

    return {
        status: "SAFE",
        motor: true,
        buzzer: false,
        message: "HELMET OK"
    };

}


// =====================================================
// SEND COMMAND TO NODEMCU
// =====================================================

function sendMotorCommand(
    helmetId,
    decision
) {

    const helmet = helmets.get(helmetId);

    if (!helmet) {

        console.log(
            "Helmet not registered:",
            helmetId
        );

        return;

    }


    const node = helmet.nodemcu;


    if (
        node &&
        node.readyState === WebSocket.OPEN
    ) {

        const command = {

            type: "motor_command",

            deviceId: helmetId,

            status: decision.status,

            motor: decision.motor,

            buzzer: decision.buzzer,

            message: decision.message

        };


        node.send(
            JSON.stringify(command)
        );


        console.log(
            "COMMAND → NODEMCU:",
            command
        );

    }
    else {

        console.log(
            "NodeMCU not connected:",
            helmetId
        );

    }

}


// =====================================================
// WEBSOCKET
// =====================================================

wss.on(
    "connection",
    (ws) => {

        console.log(
            "New WebSocket connection"
        );


        ws.deviceType = null;
        ws.deviceId = null;
        ws.isAlive = true;


        // ---------------------------------------------
        // PONG
        // ---------------------------------------------

        ws.on(
            "pong",
            () => {

                ws.isAlive = true;

            }
        );


        // ---------------------------------------------
        // MESSAGE
        // ---------------------------------------------

        ws.on(
            "message",
            (message) => {

                try {

                    const data =
                        JSON.parse(
                            message.toString()
                        );


                    console.log(
                        "RECEIVED:",
                        data
                    );


                    // =================================
                    // REGISTER
                    // =================================

                    if (
                        data.type === "register"
                    ) {

                        const deviceType =
                            data.deviceType;

                        const deviceId =
                            data.deviceId;


                        if (
                            deviceType !==
                                "raspberrypi" &&
                            deviceType !==
                                "nodemcu"
                        ) {

                            ws.send(
                                JSON.stringify({
                                    type: "error",
                                    message:
                                        "Invalid deviceType"
                                })
                            );

                            return;

                        }


                        if (!deviceId) {

                            ws.send(
                                JSON.stringify({
                                    type: "error",
                                    message:
                                        "deviceId required"
                                })
                            );

                            return;

                        }


                        const helmet =
                            getHelmet(deviceId);


                        // --------------------------------
                        // Remove old connection
                        // --------------------------------

                        if (
                            helmet[deviceType] &&
                            helmet[deviceType] !== ws
                        ) {

                            try {

                                helmet[
                                    deviceType
                                ].terminate();

                            }
                            catch (e) {}

                        }


                        helmet[deviceType] =
                            ws;


                        ws.deviceType =
                            deviceType;

                        ws.deviceId =
                            deviceId;


                        console.log(
                            `REGISTERED ${deviceType}: ${deviceId}`
                        );


                        ws.send(
                            JSON.stringify({

                                type:
                                    "registered",

                                deviceId:
                                    deviceId,

                                deviceType:
                                    deviceType

                            })
                        );


                        return;

                    }


                    // =================================
                    // SENSOR DATA FROM PI
                    // =================================

                    if (
                        data.type ===
                        "sensor_data"
                    ) {

                        if (
                            ws.deviceType !==
                            "raspberrypi"
                        ) {

                            console.log(
                                "Rejected sensor data"
                            );

                            return;

                        }


                        const helmetId =
                            data.deviceId;


                        if (
                            !helmetId
                        ) {

                            return;

                        }


                        const decision =
                            calculateSafety(
                                data
                            );


                        console.log(
                            `DECISION ${helmetId}: ${decision.status}`
                        );


                        // Send to NodeMCU

                        sendMotorCommand(
                            helmetId,
                            decision
                        );


                        return;

                    }


                    // =================================
                    // PING
                    // =================================

                    if (
                        data.type === "ping"
                    ) {

                        ws.send(
                            JSON.stringify({

                                type:
                                    "pong",

                                time:
                                    new Date().toISOString()

                            })
                        );


                        return;

                    }


                    // =================================
                    // UNKNOWN
                    // =================================

                    ws.send(
                        JSON.stringify({

                            type:
                                "error",

                            message:
                                "Unknown message type"

                        })
                    );

                }

                catch (error) {

                    console.error(
                        "MESSAGE ERROR:",
                        error
                    );


                    try {

                        ws.send(
                            JSON.stringify({

                                type:
                                    "error",

                                message:
                                    "Invalid JSON"

                            })
                        );

                    }
                    catch (e) {}

                }

            }
        );


        // ---------------------------------------------
        // CLOSE
        // ---------------------------------------------

        ws.on(
            "close",
            () => {

                console.log(
                    `DISCONNECTED: ${ws.deviceId || "unknown"}`
                );


                if (
                    ws.deviceId &&
                    ws.deviceType
                ) {

                    const helmet =
                        helmets.get(
                            ws.deviceId
                        );


                    if (
                        helmet &&
                        helmet[
                            ws.deviceType
                        ] === ws
                    ) {

                        helmet[
                            ws.deviceType
                        ] = null;

                    }

                }

            }
        );


        // ---------------------------------------------
        // ERROR
        // ---------------------------------------------

        ws.on(
            "error",
            (error) => {

                console.error(
                    "WebSocket error:",
                    error
                );

            }
        );

    }
);


// =====================================================
// SERVER HEARTBEAT
// =====================================================

setInterval(
    () => {

        wss.clients.forEach(
            (ws) => {

                if (
                    ws.isAlive === false
                ) {

                    console.log(
                        "Removing dead connection"
                    );

                    ws.terminate();

                    return;

                }


                ws.isAlive = false;

                ws.ping();

            }
        );

    },
    30000
);


// =====================================================
// START
// =====================================================

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Smart Helmet Server running on port ${PORT}`
        );

    }
);