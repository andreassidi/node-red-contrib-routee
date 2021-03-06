const base64 = require('nodejs-base64-encode');
const httpRequest = require('https');
var bearer = '0';

module.exports = (RED) => {

    RED.httpNode.post('/routee/send_sms', async (req, res) => {
        try {

            let payload_rte = req.body,
                routee_authorization_code = payload_rte["authorizationCode"],
                routee_from = payload_rte["from"],
                routee_to = payload_rte["to"],
                routee_message = payload_rte["message"];
            //node.status({ fill: "orange", shape: "dot", text: "Pending.." });

            let routee_bearer = await routeeGetBearer(routee_authorization_code),
                SMSresponse = await sendSMS(routee_bearer, routee_from, routee_to, routee_message);
            if (SMSresponse[1] == 200) {
               // node.status({ fill: "green", shape: "dot", text: "successfully sent message" });
                res.send('done');
            }else{
               // node.status({ fill: "red", shape: "dot", text: "Error!" });
               res.send('something went wrong');
            }
        } catch (error) {
            //node.status({ fill: "red", shape: "dot", text: "Check the payload" });
            res.send('Payload must be in JSON format. Special characters are not allowed');
        }
        //setTimeout(() => { node.status({ fill: "grey", shape: "dot", text: "stand by" }) }, 10000);
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
            if ('token' in msg.payload && typeof msg.payload.token==='string') { token = msg.payload.token.trim(); }
            else {
                if (tokenValueUI != '') { token = tokenValueUI.trim(); }
                //else{ console.log('You need to fill in the Token property');return 0;} 
            }
            if ('secret' in msg.payload && typeof msg.payload.secret==='string') { secret = msg.payload.secret.trim(); }
            else {
                if (secretValueUI != '') { secret = secretValueUI.trim(); }
                //else{ console.log('You need to fill in the Secret property');return 0;} 
            }
            if ('bearer' in msg.payload && typeof msg.payload.bearer==='string') { bearer = msg.payload.bearer.trim(); }
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
            if ('from' in msg.payload && typeof msg.payload.from==='string') { from = msg.payload.from.trim(); }
            else {
                if (fromValueUI != ' ') { from = fromValueUI.trim(); }
                //else{ console.log('You need to fill in the From property');return 0;} 
            }
            if ('to' in msg.payload && typeof msg.payload.to==='string') { to = msg.payload.to.trim(); }
            else {
                if (toValueUI != ' ') { to = toValueUI.trim(); }
                //else{ console.log('You need to fill in the To property');return 0;} 
            }
            if ('message' in msg.payload && typeof msg.payload.message==='string') { message = msg.payload.message.trim(); }
            else {
                if (messageValueUI != ' ') { message = messageValueUI.trim(); }
                //else{ console.log('You need to fill in the Message property');return 0;} 
            }
            //end of variables initialize
            let response = await sendSMS(bearer, from, to, message);
            if (response[1] == 401) {
                authorization_code = await getAuthorizationCode(token, secret);
                bearer = await routeeGetBearer(authorization_code);
                response = await sendSMS(bearer, from, to, message);
                if (response[1] == 401) {
                    node.status({ fill: "red", shape: "dot", text: "an error has occurred" });
                    console.log('Something went wrong');
                    return 0;
                }
            } else if (response[1] == 200){
                console.log('Message sent successfully');
                node.status({ fill: "green", shape: "dot", text: "successfully sent message" });
                setTimeout(() => { node.status({ fill: "grey", shape: "dot", text: "stand by" }) }, 10000);
            }else{
                console.log('Something went wrong.');
                node.status({ fill: "red", shape: "dot", text: "Error!" });
                setTimeout(() => { node.status({ fill: "grey", shape: "dot", text: "stand by" }) }, 10000);
            }

            msg.payload = { responseBody: response[0], responseStatusCode: response[1] }
            node.send(msg);
        });
        node.on('end', () => { });
    }
    RED.nodes.registerType("routeeSMS", routeeSMS);
}

async function sendSMS(bearer, from, to, message) {
    let form = { "from": from.toString(), "to": to.toString(), "body": message.toString() };
 
    let formData = JSON.stringify(form);
    let optionsToSendSMS = {
        'headers': {
            //'Content-Length': formData.toString.length,
            'Authorization': 'Bearer ' + bearer.toString(),
            'Content-Type': 'application/json'
        },
        'hostname': 'connect.routee.net',
        'port': 443,
        'path': '/sms',
        'method': 'POST'
    };

    let response = await request(optionsToSendSMS, formData);
    return response;
};

async function request(options, postData) {
    return new Promise((resolve, reject) => {
        let req = httpRequest.request(options, async (res) => {
            let chunks=[];
            res.on("data", (chunk)=> {
                chunks.push(chunk);
              });
            res.on("end",  (chunk)=> {
                var body = Buffer.concat(chunks);
                resolve([body.toString(),res.statusCode]);
             });
            res.on("error", (error)=> {
                console.error(error);
              });
        });
        req.write(postData);
        req.on('error', (e) => {
            console.error(e);
        });
        req.end();
    });
}

async function routeeGetBearer(authorization_code) {
    let form = 'grant_type=client_credentials';

    let optionsToGetBearer = {
        'headers': {
            //'Content-Length': formData.toString.length,
            'Authorization': 'Basic ' + authorization_code.toString(),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        'hostname': 'auth.routee.net',
        'path': '/oauth/token',
        'port': 443,
        'method': 'POST'
    };
    let response = await request(optionsToGetBearer,form);
  
    if (response[1] == 400 || response[1] == 401) {
        console.log('Something went wrong! Please check Token and Secret');
        return 0;
    }
    let parsedResponse = JSON.parse(response[0]),
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
