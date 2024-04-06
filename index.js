const fs = require('fs')
require("dotenv").config()
const OpenAI = require("openai")
const openai = new OpenAI({"apiKey":process.env.OPENAIKEY});
const readline = require('node:readline');

var colors = require('colors');

var Roll = require('roll'),
  roll = new Roll();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to wait for user to press Enter
const waitForEnter = () => {
  return new Promise((resolve) => {
    rl.question('Press Enter to continue...', (answer) => {
      resolve();
    });
  });
};

const level = JSON.parse(fs.readFileSync('./level.json'))
const level_context = `Rumors tell of robed cultists filing into the ruined castle of King Charon, the despot who employed foul magics to oppress his people long ago. Now, a demon has attacked the Hierophant, and it is clear infernal dealings are afoot. You have come to the ruins, hoping to investigate whether the rumors are true, and, if so, to put a stop to the cultists before even worse demons are unleashed upon the world.`
let index = 0

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

async function describe_challenge(challenge,history) {
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

async function describe_what_happened(character, player_intent, player_trait, challenge,result,history) {
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
	]}//await create_player(fs.readFileSync('./pike.txt','utf-8'))
	character.description = fs.readFileSync('./pike.txt','utf-8')
	character.name = "Pike"
	character.resolve = 30
	
	let history = []
	
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


main().catch(console.error)