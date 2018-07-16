const State = function(){
    if (!(this instanceof State)) {
        return new State();
    }
    this.names = ['Odelia', 'Isaiah', 'Angela'],
    this.lastTurn = null
}

State.prototype.getLastTurn = function() {
    return this.lastTurn
}

State.prototype.setLastTurn = function(lastTurn) {
    this.lastTurn = lastTurn
}

State.prototype.getRandomName = function(lastTurn) {
    let names = this.names.slice(0)
    if (lastTurn) {
        names = names.filter(name=> name !== lastTurn)
    }
    const index = getRandomNumber(names.length)
    return names[index]
}

function getRandomNumber(max, min) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

const state = new State();

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Tell me whose turn was it last time, by saying' +
    'Last time it was Isaiah\'s turn';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Please tell me whose turn was it last time by saying, ' +
        'It was Isaiah\'s turn last time';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Don\'t forget to do you chores!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function createLastTurnAttribute(lastTurn) {
    state.setLastTurn(lastTurn)
    return {
        lastTurn: state.getLastTurn(),
    };
}

/**
 * Sets the color in the session and prepares the speech to reply to the user.
 */
function setLastTurnInSession(intent, session, callback) {
    const cardTitle = intent.name;
    const lastTurnSlot = intent.slots.Name;
    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';

    if (lastTurnSlot) {
        const lastTurn = lastTurnSlot.value;
        sessionAttributes = createLastTurnAttribute(lastTurn);
        speechOutput = `Ok, so it was ${lastTurn}\'s turn last time. You can ask me ` +
            "to tell you whose turn is next by saying, " +
            "Whose turn is it next?";
        repromptText = "You can ask me who's next by saying, Who has the next turn?";
    } else {
        speechOutput = "I'm not sure whose turn it was last. Please try again.";
        repromptText = "I'm not sure who had the last turn. You can tell me " +
            'who it was by saying, Isaiah took the last turn';
    }

    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getLastTurnFromSession(intent, session, callback) {
    let lastTurn;
    const repromptText = null;
    const sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = '';

    if (session.attributes) {
        lastTurn = session.attributes.lastTurn;
    }
    const nextTurn = state.getRandomName(lastTurn)
    state.setLastTurn(nextTurn)
    if (lastTurn) {
        speechOutput = `It was ${lastTurn}\'s turn last time. ` +
        `Now it is ${nextTurn}'s turn!`;
        shouldEndSession = true;
    } else {
        speechOutput = "I'm not sure who had last turn, so I'll just randomly pick who goes next" , + `Now it is ${nextTurn}'s turn!`;
        shouldEndSession = true;
    }

    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    callback(sessionAttributes,
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}


// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'LastTurnWasIntent') {
        setLastTurnInSession(intent, session, callback);
    } else if (intentName === 'WhoseTurnIsItIntent') {
        getLastTurnFromSession(intent, session, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};