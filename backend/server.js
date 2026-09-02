// const express = require("express");
// const http = require("http");
// const WebSocket = require("ws");

// const app = express();

// app.use(express.json());

// const PORT = process.env.PORT || 10000;

// const server = http.createServer(app);

// const wss = new WebSocket.Server({
//     server
// });


// // =====================================================
// // DEVICES
// // =====================================================

// const helmets = new Map();


// // =====================================================
// // GET HELMET
// // =====================================================

// function getHelmet(deviceId) {

//     if (!helmets.has(deviceId)) {

//         helmets.set(deviceId, {
//             raspberrypi: null,
//             nodemcu: null
//         });

//     }

//     return helmets.get(deviceId);
// }


// // =====================================================
// // HOME
// // =====================================================

// app.get("/", (req, res) => {

//     res.status(200).json({
//         status: "online",
//         service: "Smart Helmet Server",
//         time: new Date().toISOString()
//     });

// });


// // =====================================================
// // HEALTH
// // =====================================================

// app.get("/health", (req, res) => {

//     res.status(200).json({
//         status: "healthy",
//         service: "smart-helmet",
//         uptime: process.uptime(),
//         devices: helmets.size,
//         time: new Date().toISOString()
//     });

// });


// // =====================================================
// // SAFETY DECISION
// // =====================================================

// function calculateSafety(data) {

//     const helmetWorn =
//         data.helmetWorn === true;

//     const alcohol =
//         data.alcohol === true;

//     const drowsy =
//         data.drowsy === true;

//     const cameraSafe =
//         data.cameraSafe === true;


//     // -----------------------------------------------
//     // 1. HELMET
//     // -----------------------------------------------

//     if (!helmetWorn) {

//         return {
//             status: "WEAR_HELMET",
//             motor: false,
//             buzzer: true,
//             message: "WEAR HELMET"
//         };

//     }


//     // -----------------------------------------------
//     // 2. ALCOHOL
//     // -----------------------------------------------

//     if (alcohol) {

//         return {
//             status: "ALCOHOL",
//             motor: false,
//             buzzer: true,
//             message: "ALCOHOL DETECTED"
//         };

//     }


//     // -----------------------------------------------
//     // 3. DROWSINESS
//     // -----------------------------------------------

//     if (drowsy) {

//         return {
//             status: "DROWSY",
//             motor: false,
//             buzzer: true,
//             message: "WAKE UP!"
//         };

//     }


//     // -----------------------------------------------
//     // 4. CAMERA
//     // -----------------------------------------------

//     if (!cameraSafe) {

//         return {
//             status: "CAMERA_UNSAFE",
//             motor: false,
//             buzzer: true,
//             message: "SAFETY WARNING"
//         };

//     }


//     // -----------------------------------------------
//     // 5. SAFE
//     // -----------------------------------------------

//     return {
//         status: "SAFE",
//         motor: true,
//         buzzer: false,
//         message: "HELMET OK"
//     };

// }


// // =====================================================
// // SEND COMMAND TO NODEMCU
// // =====================================================

// function sendMotorCommand(
//     helmetId,
//     decision
// ) {

//     const helmet = helmets.get(helmetId);

//     if (!helmet) {

//         console.log(
//             "Helmet not registered:",
//             helmetId
//         );

//         return;

//     }


//     const node = helmet.nodemcu;


//     if (
//         node &&
//         node.readyState === WebSocket.OPEN
//     ) {

//         const command = {

//             type: "motor_command",

//             deviceId: helmetId,

//             status: decision.status,

//             motor: decision.motor,

//             buzzer: decision.buzzer,

//             message: decision.message

//         };


//         node.send(
//             JSON.stringify(command)
//         );


//         console.log(
//             "COMMAND → NODEMCU:",
//             command
//         );

//     }
//     else {

//         console.log(
//             "NodeMCU not connected:",
//             helmetId
//         );

//     }

// }


// // =====================================================
// // WEBSOCKET
// // =====================================================

// wss.on(
//     "connection",
//     (ws) => {

//         console.log(
//             "New WebSocket connection"
//         );


//         ws.deviceType = null;
//         ws.deviceId = null;
//         ws.isAlive = true;


//         // ---------------------------------------------
//         // PONG
//         // ---------------------------------------------

//         ws.on(
//             "pong",
//             () => {

//                 ws.isAlive = true;

//             }
//         );


//         // ---------------------------------------------
//         // MESSAGE
//         // ---------------------------------------------

//         ws.on(
//             "message",
//             (message) => {

//                 try {

//                     const data =
//                         JSON.parse(
//                             message.toString()
//                         );


//                     console.log(
//                         "RECEIVED:",
//                         data
//                     );


//                     // =================================
//                     // REGISTER
//                     // =================================

//                     if (
//                         data.type === "register"
//                     ) {

//                         const deviceType =
//                             data.deviceType;

//                         const deviceId =
//                             data.deviceId;


//                         if (
//                             deviceType !==
//                                 "raspberrypi" &&
//                             deviceType !==
//                                 "nodemcu"
//                         ) {

//                             ws.send(
//                                 JSON.stringify({
//                                     type: "error",
//                                     message:
//                                         "Invalid deviceType"
//                                 })
//                             );

//                             return;

//                         }


//                         if (!deviceId) {

//                             ws.send(
//                                 JSON.stringify({
//                                     type: "error",
//                                     message:
//                                         "deviceId required"
//                                 })
//                             );

//                             return;

//                         }


//                         const helmet =
//                             getHelmet(deviceId);


//                         // --------------------------------
//                         // Remove old connection
//                         // --------------------------------

//                         if (
//                             helmet[deviceType] &&
//                             helmet[deviceType] !== ws
//                         ) {

//                             try {

//                                 helmet[
//                                     deviceType
//                                 ].terminate();

//                             }
//                             catch (e) {}

//                         }


//                         helmet[deviceType] =
//                             ws;


//                         ws.deviceType =
//                             deviceType;

//                         ws.deviceId =
//                             deviceId;


//                         console.log(
//                             `REGISTERED ${deviceType}: ${deviceId}`
//                         );


//                         ws.send(
//                             JSON.stringify({

//                                 type:
//                                     "registered",

//                                 deviceId:
//                                     deviceId,

//                                 deviceType:
//                                     deviceType

//                             })
//                         );


//                         return;

//                     }


//                     // =================================
//                     // SENSOR DATA FROM PI
//                     // =================================

//                     if (
//                         data.type ===
//                         "sensor_data"
//                     ) {

//                         if (
//                             ws.deviceType !==
//                             "raspberrypi"
//                         ) {

//                             console.log(
//                                 "Rejected sensor data"
//                             );

//                             return;

//                         }


//                         const helmetId =
//                             data.deviceId;


//                         if (
//                             !helmetId
//                         ) {

//                             return;

//                         }


//                         const decision =
//                             calculateSafety(
//                                 data
//                             );


//                         console.log(
//                             `DECISION ${helmetId}: ${decision.status}`
//                         );


//                         // Send to NodeMCU

//                         sendMotorCommand(
//                             helmetId,
//                             decision
//                         );


//                         return;

//                     }


//                     // =================================
//                     // PING
//                     // =================================

//                     if (
//                         data.type === "ping"
//                     ) {

//                         ws.send(
//                             JSON.stringify({

//                                 type:
//                                     "pong",

//                                 time:
//                                     new Date().toISOString()

//                             })
//                         );


//                         return;

//                     }


//                     // =================================
//                     // UNKNOWN
//                     // =================================

//                     ws.send(
//                         JSON.stringify({

//                             type:
//                                 "error",

//                             message:
//                                 "Unknown message type"

//                         })
//                     );

//                 }

//                 catch (error) {

//                     console.error(
//                         "MESSAGE ERROR:",
//                         error
//                     );


//                     try {

//                         ws.send(
//                             JSON.stringify({

//                                 type:
//                                     "error",

//                                 message:
//                                     "Invalid JSON"

//                             })
//                         );

//                     }
//                     catch (e) {}

//                 }

//             }
//         );


//         // ---------------------------------------------
//         // CLOSE
//         // ---------------------------------------------

//         ws.on(
//             "close",
//             () => {

//                 console.log(
//                     `DISCONNECTED: ${ws.deviceId || "unknown"}`
//                 );


//                 if (
//                     ws.deviceId &&
//                     ws.deviceType
//                 ) {

//                     const helmet =
//                         helmets.get(
//                             ws.deviceId
//                         );


//                     if (
//                         helmet &&
//                         helmet[
//                             ws.deviceType
//                         ] === ws
//                     ) {

//                         helmet[
//                             ws.deviceType
//                         ] = null;

//                     }

//                 }

//             }
//         );


//         // ---------------------------------------------
//         // ERROR
//         // ---------------------------------------------

//         ws.on(
//             "error",
//             (error) => {

//                 console.error(
//                     "WebSocket error:",
//                     error
//                 );

//             }
//         );

//     }
// );


// // =====================================================
// // SERVER HEARTBEAT
// // =====================================================

// setInterval(
//     () => {

//         wss.clients.forEach(
//             (ws) => {

//                 if (
//                     ws.isAlive === false
//                 ) {

//                     console.log(
//                         "Removing dead connection"
//                     );

//                     ws.terminate();

//                     return;

//                 }


//                 ws.isAlive = false;

//                 ws.ping();

//             }
//         );

//     },
//     30000
// );


// // =====================================================
// // START
// // =====================================================

// server.listen(
//     PORT,
//     "0.0.0.0",
//     () => {

//         console.log(
//             `Smart Helmet Server running on port ${PORT}`
//         );

//     }
// );


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
// IS SOCKET OPEN
// =====================================================

function isOpen(ws) {

    return Boolean(ws) &&
        ws.readyState === WebSocket.OPEN;
}


// =====================================================
// DESCRIBE HELMETS
// =====================================================

function describeHelmets() {

    const out = {};

    for (const [id, helmet] of helmets.entries()) {

        out[id] = {
            raspberrypi: isOpen(helmet.raspberrypi),
            nodemcu: isOpen(helmet.nodemcu)
        };

    }

    return out;
}


// =====================================================
// SAFE SEND
// =====================================================

function sendJSON(ws, payload) {

    if (!isOpen(ws)) {

        return false;

    }

    try {

        ws.send(
            JSON.stringify(payload)
        );

        return true;

    }
    catch (e) {

        console.error(
            "SEND ERROR:",
            e.message
        );

        return false;

    }

}


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {

    res.status(200).json({
        status: "online",
        service: "Smart Helmet Server",
        helmets: describeHelmets(),
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
        helmets: describeHelmets(),
        time: new Date().toISOString()
    });

});


// =====================================================
// GPS
// =====================================================

app.get("/gps", (req, res) => {

    const lat = Number((30.7680 + (Math.random() - 0.5) * 0.02).toFixed(6));
    const lng = Number((76.5750 + (Math.random() - 0.5) * 0.02).toFixed(6));

    res.status(200).json({
        name: "Chandigarh University",
        location: "Chandigarh University",
        latitude: lat,
        longitude: lng,
        lat: lat,
        lng: lng,
        time: new Date().toISOString()
    });

});


// =====================================================
// SAFETY DECISION
// =====================================================
//
// Only used for the legacy "sensor_data" path, where the
// server decides. The Pi currently decides for itself and
// sends "motor_command", which bypasses this function.
//
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

    const pothole =
        data.pothole === true;


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
    // 4. POTHOLE
    // -----------------------------------------------

    if (pothole) {

        return {
            status: "POTHOLE",
            motor: false,
            buzzer: true,
            message: "POTHOLE AHEAD"
        };

    }


    // -----------------------------------------------
    // 5. CAMERA
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
    // 6. SAFE
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
    decision,
    sender
) {

    const helmet = helmets.get(helmetId);


    if (!helmet) {

        console.log(
            "Helmet not registered:",
            helmetId
        );


        sendJSON(sender, {
            type: "error",
            message: "HELMET NOT REGISTERED"
        });

        return false;

    }


    const node = helmet.nodemcu;


    if (!isOpen(node)) {

        console.log(
            "NodeMCU not connected:",
            helmetId
        );


        sendJSON(sender, {
            type: "error",
            message: "NODEMCU OFFLINE"
        });

        return false;

    }


    const command = {

        type: "motor_command",

        deviceId: helmetId,

        status: decision.status,

        motor: decision.motor,

        buzzer: decision.buzzer,

        message: decision.message

    };


    const sent = sendJSON(node, command);


    if (sent) {

        console.log(
            `RELAY ${helmetId}: ${command.status} motor=${command.motor} buzzer=${command.buzzer}`
        );

    }

    return sent;

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


                    // Motor commands arrive several times
                    // a second, so they are logged inside
                    // the relay function instead of here.

                    if (
                        data.type !== "motor_command"
                    ) {

                        console.log(
                            "RECEIVED:",
                            data
                        );

                    }


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

                            sendJSON(ws, {
                                type: "error",
                                message:
                                    "Invalid deviceType"
                            });

                            return;

                        }


                        if (!deviceId) {

                            sendJSON(ws, {
                                type: "error",
                                message:
                                    "deviceId required"
                            });

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

                            console.log(
                                "Replacing stale socket for",
                                deviceId,
                                deviceType
                            );


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

                        console.log(
                            "SLOTS:",
                            JSON.stringify(
                                describeHelmets()
                            )
                        );


                        sendJSON(ws, {

                            type:
                                "registered",

                            deviceId:
                                deviceId,

                            deviceType:
                                deviceType

                        });


                        return;

                    }


                    // =================================
                    // MOTOR COMMAND FROM PI
                    // =================================
                    //
                    // The Pi makes its own safety
                    // decision and sends the result.
                    // The server relays it to the
                    // NodeMCU for that helmet.
                    //
                    // =================================

                    if (
                        data.type ===
                        "motor_command"
                    ) {

                        if (
                            ws.deviceType !==
                            "raspberrypi"
                        ) {

                            console.log(
                                "Rejected motor_command from:",
                                ws.deviceType
                            );

                            return;

                        }


                        const helmetId =
                            data.deviceId ||
                            ws.deviceId;


                        if (!helmetId) {

                            return;

                        }


                        sendMotorCommand(
                            helmetId,
                            {
                                status:
                                    data.status ||
                                    "UNKNOWN",

                                motor:
                                    data.motor === true,

                                buzzer:
                                    data.buzzer === true,

                                message:
                                    data.message ||
                                    "UNKNOWN"
                            },
                            ws
                        );


                        return;

                    }


                    // =================================
                    // SENSOR DATA FROM PI
                    // =================================
                    //
                    // Legacy path: the server decides.
                    // Kept for compatibility.
                    //
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
                            data.deviceId ||
                            ws.deviceId;


                        if (!helmetId) {

                            return;

                        }


                        const decision =
                            calculateSafety(
                                data
                            );


                        console.log(
                            `DECISION ${helmetId}: ${decision.status}`
                        );


                        sendMotorCommand(
                            helmetId,
                            decision,
                            ws
                        );


                        return;

                    }


                    // =================================
                    // PING
                    // =================================

                    if (
                        data.type === "ping"
                    ) {

                        sendJSON(ws, {

                            type:
                                "pong",

                            time:
                                new Date().toISOString()

                        });


                        return;

                    }


                    // =================================
                    // UNKNOWN
                    // =================================

                    console.log(
                        "Unknown message type:",
                        data.type
                    );


                    sendJSON(ws, {

                        type:
                            "error",

                        message:
                            "Unknown message type"

                    });

                }

                catch (error) {

                    console.error(
                        "MESSAGE ERROR:",
                        error.message
                    );


                    sendJSON(ws, {

                        type:
                            "error",

                        message:
                            "Invalid JSON"

                    });

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
                    `DISCONNECTED: ${ws.deviceId || "unknown"} (${ws.deviceType || "unknown"})`
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


                        // Tell the Pi its actuator went
                        // away, so it is not sending
                        // commands into a void.

                        if (
                            ws.deviceType ===
                            "nodemcu"
                        ) {

                            sendJSON(
                                helmet.raspberrypi,
                                {
                                    type: "error",
                                    message:
                                        "NODEMCU DISCONNECTED"
                                }
                            );

                        }

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
                    error.message
                );

            }
        );

    }
);


// =====================================================
// SERVER HEARTBEAT
// =====================================================
//
// 20 s keeps the socket inside Render's proxy idle
// timeout and matches the 15 s NodeMCU heartbeat.
//
// =====================================================

setInterval(
    () => {

        wss.clients.forEach(
            (ws) => {

                if (
                    ws.isAlive === false
                ) {

                    console.log(
                        "Removing dead connection:",
                        ws.deviceType || "unknown"
                    );

                    ws.terminate();

                    return;

                }


                ws.isAlive = false;


                try {

                    ws.ping();

                }
                catch (e) {}

            }
        );

    },
    20000
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