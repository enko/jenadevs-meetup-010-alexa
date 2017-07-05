
// require http module to send GET, POST requests
const request = require("request")

// app id of current app
const APP_ID = undefined; // TODO replace with your app ID (OPTIONAL).

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        // logging start of lambda function
		console.log("event.session.application.applicationId=" + event.session.application.applicationId);

		// filter out other apps
		// if (event.session.application.applicationId !== APP_ID) {
		//     context.fail("Invalid Application ID");
		//  }

        // routing intents
		if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

		// handle launch
        if (event.request.type === "LaunchRequest") {
            onLaunch(
				event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            /**
			 * handle all Intent requests in seperate function
			 * handover request and session
			 * handover callback that suceeds the context, important for asynch calls e.g. POST, GET REST calls
			**/
			handleIntentRequest(
				event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                }
			);
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
		// handle invalid requests
		context.fail("Exception: " + e);
    }
};

/**
 * called when the session starts
 **/
function onSessionStarted(sessionStartedRequest, session) {
    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 **/
function onLaunch(launchRequest, session, callback) {
    getWelcomeResponse(callback)
}

/**
 * handle/route all intent requests
 * callbacks should contain context.succeed(...) method for asynch calls
 */
function handleIntentRequest(intentRequest, session, callback) {

    // get intent info
	var intent = intentRequest.intent
    var intentName = intentRequest.intent.name;

    // check for intent types
    if (intentName == "WikiIntent") {
        handleWikiIntent(intent, session, callback)
    } else {
        // handle invalid Intents
		throw "Invalid intent " + intentName
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
	// nothing to do atm
}

/**
 * skill intent handle functions
 **/
function getWelcomeResponse(callback) {
    var speechOutput = "Willkommen bei der Softwerkskammer Jena"
    var reprompt = "Du kannst aktuell zum Beispiel fragen wie viele Wikipedia Einträge zu 'Batman' existieren"
    var header = "Get Info"
    var shouldEndSession = false

    var sessionAttributes = {
        "speechOutput" : speechOutput,
        "repromptText" : reprompt
    }

    callback(sessionAttributes, buildSpeechletResponse(header, speechOutput, reprompt, shouldEndSession))

}

/**
 * handle the wiki intent request
 *
 **/
function handleWikiIntent(intent, session, callback) {

	// get info from intent
	//const wikiSlot = intent.slots.WikiSearch;
	const wikiSlot = intent.slots.WikiSearch;
    let wikiSearch;
    if (wikiSlot && wikiSlot.value) {
        wikiSearch = wikiSlot.value.toLowerCase();
    }

    // get http response
	getHTTPResponse(urlOptionsWiki(wikiSearch),function(jsonResponse) {

		var speechOutput = "Es gab leider einen Fehler"
		// get total hits from result
		var result = jsonResponse.query.searchinfo.totalhits;

		// check result
		if (result > 0) {
            var speechOutput = wikiSearch + " hat insgesamt: " + result + " Einträge in Wikipedia";
        }

		// callback build speech out
        callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, "", true))
    })

}

/**
 * build wikipedia url
 *
 **/
function urlOptionsWiki(searchString) {

	// prepare search string
	searchString.split(' ').join('+');

    // return wikipedia api url options
	return "http://de.wikipedia.org/w/api.php?action=query&format=json&list=search&utf8=1&srsearch=" + searchString.split(' ').join('+');
}

/**
 * TODO: try to make an https url for a rest call
function urlOptions....() {
    return {
        url: "https://api.xxx.com/.../.../vX/....json",
        qs: {
            "api-key" : "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            "pram" : "value"
        }
		//TODO: find out how to create Authentication
    }
}
**/

/**
 * handle http request
 **/
function getHTTPResponse(urlOptions,callback) {
    // http request
    request.get(urlOptions, function(error, response, body) {
        var jsonBody = JSON.parse(body);
        callback(jsonBody);
    })
}

/**
 * response helper functions
 *
 **/
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}