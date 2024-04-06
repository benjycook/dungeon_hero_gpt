const fs = require('fs')
require("dotenv").config()
const OpenAI = require("openai")
const openai = new OpenAI({"apiKey":process.env.OPENAIKEY});

var colors = require('colors');

var Roll = require('roll'),
  roll = new Roll();


// init project
var express = require('express');
var app = express();

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use(express.json());


async function create_player(description) {
	const completion = await openai.chat.completions.create({
		messages: [
		  {
			role: "system",
			content: `You are a helpful assistant designed to output JSON. 
			Your task is to convert the given character description into a list of traits. 
			Create 8 traits and assign a modifier to each of them: +5, +4, +3, +2, +1, +1, -1, -2.
			The higher the die size, the better the trait. 
			Traits which seem to be a major part of the character's description should be higher than others.
			Traits which seem to be a character flaw should be the negative ones.
			Traits can be anything definitive about the character. 
			For example, they can be: 
			• Racial/cultural (elf, barbarian) 
			• Capabilities (stealthy, wizardry) 
			• Equipment (chainmail, axe, rope)
			The structure of the output should be in the form of:
			[{name:"Longbow",modifier:"+5"},{name:"Elf",modifier:"+4"},{name:"Reckless",modifier:"-2"}]
			`,
		  },
		  { role: "user", content: description },
		],
		model: "gpt-3.5-turbo-0125",
		response_format: { type: "json_object" },
	});
	return JSON.parse(completion.choices[0].message.content);
}

async function describe_challenge(challenge,history,level_context) {
	const completion = await openai.chat.completions.create({
		messages: [
		  {
			role: "system",
			content: `In the context of a roleplaying game master, describe the given challenge which lies ahead of the player. 
			The higher the difficulty dice the more challenging the description should seem like.
			The setting for the challenge is: ${level_context}
			The latest things that have occurred before this are: ${history.reverse().slice(0,2)}
			Describe the challenge succinctly in around 100 words.
			Don't use terms like player or their name. Just use "You" or speak in the second person.
			`,
		  },
		  { role: "user", content: JSON.stringify(challenge) },
		],
		model: "gpt-3.5-turbo"
	});
	return completion.choices[0].message.content;
}

async function choose_trait(challenge, answer, character) {
	const completion = await openai.chat.completions.create({
		messages: [
		  {
			role: "system",
			content: `You are a helpful assistant designed to output JSON. 
			Your task is to interpret an answer given by a player, choosing the most appropriate trait relevant from their list of traits based on what they said.
			Only if there is no trait which would be even somewhat relevant, return with a new trait with best name you can for that answer and a modifier of 0 for the dice amount.
			You will be given in JSON format the challenge, their answer and their character.
			The structure of your response should always be in the form of:
			{name:"Longbow", modifier: "+2"}
			`,
		  },
		  { role: "user", content: JSON.stringify({challenge,answer,traits:character.traits}) },
		],
		model: "gpt-3.5-turbo-0125",
		response_format: { type: "json_object" },
	});
	return JSON.parse(completion.choices[0].message.content);
}

async function choose_dc(challenge, answer, character) {
	const completion = await openai.chat.completions.create({
		messages: [
		  {
			role: "system",
			content: `You are a helpful assistant designed to output JSON. 
			Your task is to set a DC in the D&D 5E style.
			You will be given the challenge in question, the character trying to overcome it and the action they are doing to overcome the challenge.
			If the action they are doing is completely unsuitable, makes no sense or does not suit their character at all, set a very high DC like 50.
			If the action they are doing is actually quite cool, very clever and fitting their character, set a lower DC, like 10.
			For example:
			If a character who is not technically proficient tries to construct rocket boots to jump over something, the DC should be 40.
			If a character who is technically proficient tries to construct rocket boots to jump over something, the DC should be 12.
			The structure of your response should always be in the form of:
			{"DC":10, "reasoning":"Because the character, who is a very talented wizard, could easily cast such a spell to light the book on fire."}
			`,
		  },
		  { role: "user", content: JSON.stringify({challenge,action:answer,character}) },
		],
		model: "gpt-3.5-turbo-0125",
		response_format: { type: "json_object" },
	});
	return JSON.parse(completion.choices[0].message.content);
}

async function describe_what_happened(character, player_intent, player_trait, challenge,result,history,level_context) {
	const completion = await openai.chat.completions.create({
		messages: [
		  {
			role: "system",
			content: `In the context of a roleplaying game master.
			Your task is to describe in a colorful way what just happened.
			You will be given the player character, what they tried to do, the relevant trait for that action, the challenge facing them and the result of their action.
			In terms of the result you are given: Success means they overcame the challenge. Failure means they overcame it, but their have lost some of their resolve in the process (i.e. got hurt, are psychologically scarred, got scared, etc.).
			The setting for the challenge is: ${level_context}
			The latest things that have occurred before this are: ${history.reverse().slice(0,2)}
			Describe the challenge succinctly in around 100 words.
			
			Don't use terms like player or their name. Just use "You" or speak in the second person.
			`,
		  },
		  { role: "user", content: JSON.stringify({character, player_intent, player_trait, challenge,result}) },
		],
		model: "gpt-3.5-turbo"
	});
	return completion.choices[0].message.content;
}



/*
const completion = await openai.chat.completions.create({
	messages,
	model: player_model,
});
// format the conversation into chatgpt and get a response from player
conversation.push({"speaker":player,"content":completion.choices[0].message.content})
	
*/

async function main() {
	
	
	console.log("Welcome. Green texts are for debug only.")
	console.log("For this demo, you will play as Pike Trickfoot".yellow)
	console.log(`Traits: \n ${JSON.stringify(character.traits)}`.green)
	console.log("------- SO IT BEGINS -------")
	// main loop
	while(true) {
		if(index > level.length) {
			console.log("The level is complete. YOU WON!")
			break
		}
		
		if(character.resolve <= 0) {
			console.log("You have lost your resolve. GAME OVER.")
			break
		}
		
		let challenge = level[index]
		
		if(challenge.type=="plot") { 
			console.log(challenge.description)
			history.push(challenge.description)
		}
		
		if(challenge.type=="enemy") { 
			
		
			index = index + 1
			continue; // TODO: Enemies
		}
		
		if(challenge.type=="challenge") { 
			let description = await describe_challenge(challenge, history);
			console.log(description)
			let player_intent = await new Promise((resolve) => {
				rl.question('What do you do?\n\n', (answer) => {
				  resolve(answer);
				});
			});
			let player_trait = await choose_trait(challenge, player_intent, character)
			
			console.log(`PLAYER USED ${player_trait.name} ${player_trait.modifier}`.green)
			
			let player_roll = roll.roll("d20").result
			
			let player_result = player_roll+parseInt(player_trait.modifier,10);
			
			// TODO: challenge difficulty should be determined by bot
			let dc_response = (await choose_dc(challenge, player_intent, character))
			let dc = dc_response.DC
			console.log(`Bot chose DC ${dc}. Reasoning: ${dc_response.reasoning}`.green)
			let challenge_result = dc //roll.roll().result;
			
			console.log(`Player got ${player_result} (${player_roll} ${player_trait.modifier}), Challenge got ${challenge_result}`.green)
			
			if(player_result >= challenge_result) {
				let result_description = await describe_what_happened(character, player_intent, player_trait, challenge, "success", history)
				console.log(result_description)
				history.push(result_description)
			}
			
			if(player_result < challenge_result) {
				let result_description = await describe_what_happened(character, player_intent, player_trait, challenge, "failure", history)
				character.resolve = character.resolve - (challenge_result - player_result)
				console.log(result_description)
				history.push(result_description)
				console.log(`You lose ${(challenge_result - player_result)} resolve. You are at ${character.resolve}`)
			}
		}
		
		await waitForEnter()
		index = index + 1
	}
}

let sessions = {};

// http://expressjs.com/en/starter/basic-routing.html
app.post('/new_session', function(request, response) {
  	let username = request.body.username;
  	sessions[username] = {};
  	let character = {traits: [
		{"name":"Acrobatics","modifier":0},
		{"name":"Animal Handling","modifier":4},
		{"name":"Arcana","modifier":1},
		{"name":"Athletics","modifier":5},
		{"name":"Deception","modifier":2},
		{"name":"History","modifier":1},
		{"name":"Insight","modifier":4},
		{"name":"Intimidation","modifier":2},
		{"name":"Investigation","modifier":1},
		{"name":"Medicine","modifier":4},
		{"name":"Nature","modifier":1},
		{"name":"Perception","modifier":8},
		{"name":"Performance","modifier":2},
		{"name":"Religion","modifier":5},
		{"name":"Sleight of Hand","modifier":0},
		{"name":"Stealth","modifier":0},
		{"name":"Survival","modifier":4},
		{"name":"Combat","modifier":5}
	]}
	//await create_player(fs.readFileSync('./pike.txt','utf-8'))
	character.description = fs.readFileSync('./pike.txt','utf-8')
	character.name = "Pike"
	character.resolve = 30

	let history = []
	
	const level = JSON.parse(fs.readFileSync('./level.json'))
	const level_context = `Rumors tell of robed cultists filing into the ruined castle of King Charon, the despot who employed foul magics to oppress his people long ago. Now, a demon has attacked the Hierophant, and it is clear infernal dealings are afoot. You have come to the ruins, hoping to investigate whether the rumors are true, and, if so, to put a stop to the cultists before even worse demons are unleashed upon the world.`
	let index = 0
	
	sessions[username] = {character, history, level, level_context, index}
  	
  	response.json({"status":"success","session":username, history})
});

async function progress(session) {
	let index = session.index;
	let level = session.level
	let character = session.character
	if(index > level.length) {
		return {text:"The level is complete. YOU WON!"};
	}
	
	if(character.resolve <= 0) {
		return {text:"You have lost your resolve. GAME OVER."}
	}
	
	let challenge = session.level[session.index]
	
	if(challenge.type=="plot") { 
		session.history.push(challenge.description)
		index = index + 1
		session.index = index
		return {text: challenge.description, session}
	}
	
	if(challenge.type=="enemy") { 
		//TODO: Enemies
	
		index = index + 1
		session.index = index
		return {text: "Continue (nothing here because of TODO: Enemies)", session}
	}
	
	if(challenge.type=="challenge") { 
		let description = await describe_challenge(challenge, session.history, session.level_context);
		return {text: description, query:'What do you do?', session}
	}
	
	session.index = index
	return session
}

async function process_response(session, player_intent) {
	let our_response = {
		debug:"",
		text: ""
	}
	
	let challenge = session.level[session.index]
	let character = session.character
	let history = session.history;
	let level_context = session.level_context
	
	let player_trait = await choose_trait(challenge, player_intent, character)
	
	our_response.debug += `PLAYER USED ${player_trait.name} ${player_trait.modifier}\n`
	
	let player_roll = roll.roll("d20").result
	
	let player_result = player_roll+parseInt(player_trait.modifier,10);
	
	// TODO: challenge difficulty should be determined by bot
	let dc_response = (await choose_dc(challenge, player_intent, character))
	let dc = dc_response.DC
	our_response.debug +=  `Bot chose DC ${dc}. Reasoning: ${dc_response.reasoning}\n`
	let challenge_result = dc //roll.roll().result;
	
	our_response.debug +=  `Player got ${player_result} (${player_roll} ${player_trait.modifier}), Challenge got ${challenge_result}\n`
	
	if(player_result >= challenge_result) {
		let result_description = await describe_what_happened(character, player_intent, player_trait, challenge, "success", history,level_context)
		our_response.text = result_description
		history.push(result_description)
	}
	
	if(player_result < challenge_result) {
		let result_description = await describe_what_happened(character, player_intent, player_trait, challenge, "failure", history,level_context)
		character.resolve = character.resolve - (challenge_result - player_result)
		our_response.text = result_description
		history.push(result_description)
		
		our_response.debug += `You lose ${(challenge_result - player_result)} resolve. You are at ${character.resolve}\n`	
	}
	
	session.history = history;
	session.character = character;
	session.index = session.index + 1 // TODO:Enemies! 
	return {session, our_response}
}

app.post('/progress', async function(request, response) {
	let session = sessions[request.body.username];
	let result = await (progress(session))
	sessions[request.body.username] = result.session
	return response.json(result)
})

app.post('/user_response', async function(request, response) {
	let session = sessions[request.body.username];
	let player_intent = request.body.user_response;
	
	let result = await process_response(session, player_intent);
	sessions[request.body.username] = result.session;
	return response.json(result.our_response);
})

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

//main().catch(console.error)