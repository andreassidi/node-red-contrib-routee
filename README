
# Node-Red Routee

node-red-contrib-routee is a node for node-red that uses *[Routee's open API](https://docs.routee.net/reference/authentication)* to send SMS messages.

The node can be used in different ways. It can be used by multiple accounts or by one. To send messages it is essential to have created an account on the *[Routee Platform](https://go.routee.net)*. You will need to provide the **app id** and **app secret** keys which you will find on the *[Routee Platform](https://go.routee.net)*.

## Installation

Required node modules 
- [nodejs-base64-encode](https://www.npmjs.com/package/nodejs-base64-encode)
- [https]()


Open terminal

Move to global **.node-red** directory

```
cd .node-red/node_modules
npm install https://github.com/andreassidi/node-red-contrib-routee
```

## How to use the node

You can either pass all the data as input to the node, in the format of the following payload, or fill out the UI form with the necessary information. There is also the option for hybrid use, i.e. some information to fill in the form, such as sender, app id and app secret, and some others to be provided as input to the node, such as recipient and message. If there are fields filled in the form but also as input to the node then the node will give priority to those that come as input and will consider them as the correct data. There is an option to disable this function and you can apply it by unchecking it.

> Note: You have to type the "from" and "to" addresses correctly, without any space. There is not any normallization process. Add country prefix code in the phone numbers.

> Note: All properties below are optional  

```
{
                "from":"string",  
                "to":"string",
                "message":"text", 
                "token":"string", 
                "secret":"string", 
                "authSpace":"string"
            }
```

- from: The sender's phone number
- to: The recipient's phone number
- message: The message the sender wants to send
- token: The app id from Routee Platform
- secret: The app secret from Routee Platform
- authSpace: For each different secret & token (in case of multiple accounts), you can create an authentication space with the name of your choice and that it is used when you want a message to be sent by that user. In case all your messages are sent from a secret & token, then authSpace will have a default value ('common' is the default value) and you don't need to pass it into the payload. 

## License

Apache 2.0