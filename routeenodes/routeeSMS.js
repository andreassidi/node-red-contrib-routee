const request = require('../common/request.js');
const nodeStatus = require('../common/utils.js');
const routeeAuthorization = require('../common/bearerAuthorization.js');

module.exports = (RED) => {

    /*  
        Endpoint that is used from UI. Is triggered when user clicks button from UI
    */

    RED.httpNode.post('/routee/sendSms', async (request, response) => {

        let body = request.body;
        let bearerToken = String('');
        let authorizationSpace = request.body.authSpace || 'common';

        try {

            await routeeAuthorization.requestAndSetRouteeBearer(body.authorizationCode, authorizationSpace);

            bearerToken = routeeAuthorization.getRouteeBearer(authorizationSpace);

            const smsResponse = await sendSMS(
                bearerToken,
                body.from,
                body.to,
                body.message
            );

            if (smsResponse[1] === 200) {
                response.status(200).send('SMS sent successfully');
            } else {
                response.status(422).send(`Someting went wrong! Routee SMS response status code: ${smsResponse[1]}`);
            }

        } catch (error) {
            response.status(422).send({
                message: 'An error has occurred. Check the reasons  1) Payload must be in JSON format. Special characters are not allowed. 2) Token and secret are valid.'
            });
        }
    });

    /*
        routeeSMS is used when there is an input in the node SMS
    */
    function routeeSMS(config) {

        RED.nodes.createNode(this, config);

        let node = this;

        nodeStatus(node, 'standby');

        node.on('input', async (msg) => {

            /*
                config argument holds data from UI inputs
                msg.payload object holds data from input node
            */

            let payloadSMS = {
                from: undefined,
                to: undefined,
                message: undefined,
                secret: undefined,
                token: undefined,
                authSpace: undefined
            };
            let payloadFromInputNode = setPayloadFromInput(msg.payload);
            let payloadFromNodeUI = setPayloadFromUI(config);
            let areInputNodeDataPrioritized = config.dataFromInputNode;
            let isCommonAuthSpaceInUse = config.isCommonAuthSpaceInUse;

            if (areInputNodeDataPrioritized) {
                payloadSMS = setSMSBodyProperties(payloadSMS, payloadFromInputNode, payloadFromNodeUI);
            } else {
                payloadSMS = setSMSBodyProperties(payloadSMS, payloadFromNodeUI, payloadFromInputNode);
            }

            if (isCommonAuthSpaceInUse) {
                payloadSMS.authSpace = 'common';
            }

            if (routeeAuthorization.authorizationSpaces[payloadSMS.authSpace] === undefined) {
                routeeAuthorization.createNewSpace(payloadSMS.authSpace);
            }

            await setBearer(payloadSMS, msg.payload, areInputNodeDataPrioritized);

            const response = await sendSMS(
                routeeAuthorization.getRouteeBearer(payloadSMS.authSpace),
                payloadSMS.from,
                payloadSMS.to,
                payloadSMS.message
            );
            onResponseChangeNodeStatus(node, response[1]);

            msg.payload = {
                responseBody: response[0],
                responseStatusCode: response[1]
            };
            node.send(msg);
        });
        node.on('end', () => { });
    }
    RED.nodes.registerType('routeeSMS', routeeSMS);
};

function onResponseChangeNodeStatus(node, response) {

    if (response === 200) {
        nodeStatus(node, 'delivered', 5000);
    } else {
        nodeStatus(node, 'failed', 5000);
    }
}

async function setBearer(payloadSMS, msgPayload, areInputNodeDataPrioritized) {

    if ('bearer' in msgPayload && typeof msgPayload.bearer === 'string' && areInputNodeDataPrioritized) {
        let bearer = {
            token: msgPayload.bearer.trim(),
            expiresIn: msgPayload.expiresIn || 60
        };
        routeeAuthorization.setRouteeBearer(bearer, payloadSMS.authSpace);
    } else {
        await routeeAuthorization.fullAuthorizationProcess(payloadSMS.token, payloadSMS.secret, payloadSMS.authSpace);
    }
}

/*
    The function setSMSBodyProperties replaces all properties exists inside payload with mainProperties arg.
    If mainProperties arg is undefined it gets values from fallbackProperties.
    Payload, mainProperties and fallbackProperties must have same length and same properties 
*/
function setSMSBodyProperties(payload, mainProperties, fallbackProperties) {

    let objectLength1 = Object.keys(payload).length === Object.keys(mainProperties).length;
    let objectLength2 = Object.keys(payload).length === Object.keys(fallbackProperties).length;

    if (!(objectLength1 && objectLength2)) {
        return {};
    }

    for (let key in payload) {
        payload[key] = mainProperties[key] || fallbackProperties[key];
        if (payload[key] !== undefined) {
            payload[key] = payload[key].trim();
        }
    }

    return payload;
}

function setPayloadFromInput(payload) {

    return {
        from: payload.from || undefined,
        to: payload.to || undefined,
        message: payload.message || undefined,
        token: payload.token || undefined,
        secret: payload.secret || undefined,
        authSpace: payload.authSpace || undefined,
    };
}

function setPayloadFromUI(payload) {

    return {
        from: payload.routeeFrom || undefined,
        to: payload.routeeTo || undefined,
        message: payload.routeeMessage || undefined,
        token: payload.routeeToken || undefined,
        secret: payload.routeeSecret || undefined,
        authSpace: payload.authSpace || undefined,
    };
}

async function sendSMS(bearer, from, to, message) {

    let response = String('');
    let form = {
        'from': from.toString(),
        'to': to.toString(),
        'body': message.toString()
    };
    let formData = JSON.stringify(form);
    let optionsToSendSMS = {
        'headers': {
            'Authorization': 'Bearer ' + bearer.toString(),
            'Content-Type': 'application/json'
        },
        'hostname': 'connect.routee.net',
        'port': 443,
        'path': '/sms',
        'method': 'POST'
    };

    response = await request(optionsToSendSMS, formData);

    return response;
};

