const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected devices
const devices = new Map();


// --------------------------------------------------
// HOME / HEALTH CHECK
// --------------------------------------------------

app.get("/", (req, res) => {
    res.json({
        status: "online",
        service: "Smart Helmet Server",
        time: new Date().toISOString()
    });
});


// --------------------------------------------------
// SAFETY DECISION
// --------------------------------------------------

function calculateSafety(data) {

    const helmetWorn = data.helmetWorn === true;
    const alcohol = data.alcohol === true;
    const drowsy = data.drowsy === true;
    const cameraSafe = data.cameraSafe === true;

    // Priority 1: Helmet
    if (!helmetWorn) {
        return {
            status: "WEAR_HELMET",
            motor: false,
            buzzer: true,
            message: "WEAR HELMET"
        };
    }

    // Priority 2: Alcohol
    if (alcohol) {
        return {
            status: "ALCOHOL",
            motor: false,
            buzzer: true,
            message: "ALCOHOL DETECTED"
        };
    }

    // Priority 3: Drowsiness
    if (drowsy) {
        return {
            status: "DROWSY",
            motor: false,
            buzzer: true,
            message: "WAKE UP!"
        };
    }

    // Priority 4: Camera
    if (!cameraSafe) {
        return {
            status: "CAMERA_UNSAFE",
            motor: false,
            buzzer: true,
            message: "SAFETY WARNING"
        };
    }

    // Everything is safe
    return {
        status: "SAFE",
        motor: true,
        buzzer: false,
        message: "HELMET OK"
    };
}


// --------------------------------------------------
// WEBSOCKET
// --------------------------------------------------

wss.on("connection", (ws) => {

    console.log("New WebSocket connection");

    ws.deviceType = null;
    ws.deviceId = null;

    ws.isAlive = true;

    ws.on("pong", () => {
        ws.isAlive = true;
    });


    ws.on("message", (message) => {

        try {

            const data = JSON.parse(message.toString());

            console.log("Received:", data);


            // --------------------------------------
            // DEVICE REGISTRATION
            // --------------------------------------

            if (data.type === "register") {

                ws.deviceType = data.deviceType;
                ws.deviceId = data.deviceId;

                devices.set(data.deviceId, ws);

                console.log(
                    `Registered ${data.deviceType}: ${data.deviceId}`
                );

                ws.send(JSON.stringify({
                    type: "registered",
                    deviceId: data.deviceId
                }));

                return;
            }


            // --------------------------------------
            // PI SENDS SENSOR DATA
            // --------------------------------------

            if (data.type === "sensor_data") {

                const helmetId = data.deviceId;

                const node = devices.get(helmetId);

                const decision = calculateSafety(data);

                console.log(
                    `Helmet ${helmetId}: ${decision.status}`
                );


                // Send decision to NodeMCU
                if (node && node.readyState === WebSocket.OPEN) {

                    node.send(JSON.stringify({
                        type: "motor_command",
                        ...decision
                    }));

                    console.log(
                        "Command sent to NodeMCU:",
                        decision
                    );

                } else {

                    console.log(
                        "NodeMCU not connected for:",
                        helmetId
                    );
                }

                return;
            }


            // --------------------------------------
            // PING FROM CLIENT
            // --------------------------------------

            if (data.type === "ping") {

                ws.send(JSON.stringify({
                    type: "pong"
                }));

                return;
            }


            ws.send(JSON.stringify({
                type: "error",
                message: "Unknown message type"
            }));

        }

        catch (error) {

            console.error("Message error:", error);

            ws.send(JSON.stringify({
                type: "error",
                message: "Invalid JSON"
            }));
        }

    });


    ws.on("close", () => {

        console.log(
            `Disconnected: ${ws.deviceId || "unknown"}`
        );

        if (ws.deviceId) {

            // Only delete if this is the same connection
            if (devices.get(ws.deviceId) === ws) {
                devices.delete(ws.deviceId);
            }
        }
    });


    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
    });

});


// --------------------------------------------------
// SERVER HEARTBEAT
// --------------------------------------------------

setInterval(() => {

    wss.clients.forEach((ws) => {

        if (ws.isAlive === false) {

            console.log("Terminating dead connection");

            return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();

    });

}, 30000);


// --------------------------------------------------
// START SERVER
// --------------------------------------------------

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Smart Helmet server running on port ${PORT}`
    );

});