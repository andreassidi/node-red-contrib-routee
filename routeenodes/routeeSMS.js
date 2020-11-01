const base64 = require('nodejs-base64-encode');
const querystring = require('querystring');
const httpRequest = require('request');
var bearer = '0';

module.exports = (RED) => {

    RED.httpNode.post('/routee/send_sms', async (req, res) => {
        try {

            let payload_rte = req.body,
                routee_authorization_code = payload_rte["authorizationCode"],
                routee_from = payload_rte["from"],
                routee_to = payload_rte["to"],
                routee_message = payload_rte["message"];


            let routee_bearer = await routeeGetBearer(routee_authorization_code),
                SMSresponse = await sendSMS(routee_bearer, routee_from, routee_to, routee_message);
            if (SMSresponse.statusCode == 200) {
                res.send('done');
            }

        } catch (error) {
            res.send('Payload must be in JSON format. Special characters are not allowed');
        }
    });

    function routeeSMS(config) {

        RED.nodes.createNode(this, config);
        var node = this;

        node.status({ fill: "grey", shape: "dot", text: "stand by" });

        node.on('input', async (msg) => {
            let token,
                secret,
                tokenValueUI = config.routeetoken,
                secretValueUI = config.routeesecret,
                authorization_code = '';
            node.status({ fill: "grey", shape: "dot", text: "stand by" });
            if ('token' in msg.payload) { token = msg.payload.token; }
            else {
                if (tokenValueUI != '') { token = tokenValueUI; }
                //else{ console.log('You need to fill in the Token property');return 0;} 
            }
            if ('secret' in msg.payload) { secret = msg.payload.secret; }
            else {
                if (secretValueUI != '') { secret = secretValueUI; }
                //else{ console.log('You need to fill in the Secret property');return 0;} 
            }
            if ('bearer' in msg.payload) { bearer = msg.payload.bearer; }
            else {
                if (bearer == '0') {
                    authorization_code = await getAuthorizationCode(token, secret);
                    bearer = await routeeGetBearer(authorization_code);
                }
            }

            let from,
                to,
                message,
                fromValueUI = config.routeefrom,
                toValueUI = config.routeeto,
                messageValueUI = config.routeemessage;
            if ('from' in msg.payload) { from = msg.payload.from; }
            else {
                if (fromValueUI != '') { from = fromValueUI; }
                //else{ console.log('You need to fill in the From property');return 0;} 
            }
            if ('to' in msg.payload) { to = msg.payload.to; }
            else {
                if (toValueUI != '') { to = toValueUI; }
                //else{ console.log('You need to fill in the To property');return 0;} 
            }
            if ('message' in msg.payload) { message = msg.payload.message; }
            else {
                if (messageValueUI != '') { message = messageValueUI; }
                //else{ console.log('You need to fill in the Message property');return 0;} 
            }
            //end of variables initialize
            let response = await sendSMS(bearer, from, to, message);
            if (response.statusCode == 401) {
                authorization_code = await getAuthorizationCode(token, secret);
                bearer = await routeeGetBearer(authorization_code);
                response = await sendSMS(bearer, from, to, message);
                if (response.statusCode == 401) {
                    node.status({ fill: "red", shape: "dot", text: "an error has occurred" });
                    console.log('Something went wrong');
                    return 0;
                }
            } else {
                console.log('Message sent successfully');
                node.status({ fill: "green", shape: "dot", text: "successfully sent message" });
                setTimeout(() => { node.status({ fill: "grey", shape: "dot", text: "stand by" }) }, 10000);
            }

            msg.payload = { responseBody: response.body, responseStatusCode: response.statusCode }
            node.send(msg);
        });
        node.on('end', () => { });
    }
    RED.nodes.registerType("routeeSMS", routeeSMS);
}

async function sendSMS(bearer, from, to, message) {
    let form = { from: from, to: to, body: message };

    let formData = JSON.stringify(form);
    let optionsToSendSMS = {
        'headers': {
            'Content-Length': formData.length,
            'Authorization': 'Bearer ' + bearer,
            'Content-Type': 'application/json'
        },
        'uri': 'https://connect.routee.net/sms',
        'body': formData,
        'method': 'POST'
    }
    let response = await request(optionsToSendSMS);

    return response;
};

async function request(options) {
    return new Promise((resolve, reject) => {
        httpRequest(options, async (err, res) => {
            if (err) reject('error');
            // let responseArray = JSON.parse(res.body);
            resolve(res);
        });
    });
}

async function routeeGetBearer(authorization_code) {
    let form = { grant_type: 'client_credentials' },
        formData = querystring.stringify(form);

    let optionsToGetBearer = {
        headers: {
            'Content-Length': formData.length,
            'Authorization': 'Basic ' + authorization_code,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        uri: 'https://auth.routee.net/oauth/token',
        body: formData,
        method: 'POST'
    };
    let response = await request(optionsToGetBearer);
    console.log(response.body);
    if (response.statusCode == 400 || response.statusCode == 401) {
        console.log('Something went wrong! Please check Token and Secret');
        return 0;
    }
    let parsedResponse = JSON.parse(response.body),
        accessToken = parsedResponse["access_token"];

    return accessToken;
}

async function getAuthorizationCode(token_rte, secret_rte) {

    let regexRule = new RegExp(/[.*#<>+\-?^${}()|[\]\\]/g);

    if (token_rte.length > 64 || secret_rte.length > 64) {
        console.log('Token or Secret is too long');
        return 0;
    }
    if (regexRule.test(token_rte) || regexRule.test(secret_rte)) {
        console.log('Special characters are not allowed');
        return 0;
    }
    let stringBeforeBase64Encode = token_rte + ':' + secret_rte,
        stringAfterBase64Encode = base64.encode(stringBeforeBase64Encode, 'base64');

    return stringAfterBase64Encode;
}
