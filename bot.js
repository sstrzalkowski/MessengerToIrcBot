
Getopt = require("node-getopt");
getopt = new Getopt([
	["s", "=", "irc server"],
	["c", "=", "irc channel"],
	["p", "=", "irc channel password (optional)"],
	["S", "=", "self listen on messenger"],
]);


// TODO traditional parameters parsing
var irc_channel = process.argv[2];
var chat_id = process.argv[3];
if(process.argv.length > 4)
	var irc_password = process.argv[4];
readline = require('readline-sync');
var fb_mail = readline.question("Facebook email: ");
var fb_pass = readline.question("Facebook password: ", {hideEchoBack: true});


function senderName(info, sender, friends){
	if(info.nicknames != undefined && info.nicknames[sender] != undefined) return info.nicknames[sender];
	for (i = 0; i < friends.length; i++) {
		if(friends[i].userID == sender) return friends[i].fullName;
	}
	console.log(sender+" not found in friends");
	if(info.participantIDs.indexOf(sender) != -1) return info.name;
	return sender;
}

var irc = require('irc');
// TODO other servers
if(irc_password != undefined)
	var client = new irc.Client('localhost', 'messenger-bot', {channels: [irc_channel+" "+irc_password]});
else
	var client = new irc.Client('localhost', 'messenger-bot', {channels: [irc_channel]});
var login = require("facebook-chat-api");
login({email: fb_mail, password: fb_pass}, function callback(err, api){
	if(err) return console.error(err);
	api.setOptions({listenEvents: true, selfListen: true}); // TODO selfListen as optional
	var chat_info;
	var friends;
	api.getThreadInfo(chat_id, function(error, info){
		if(err) return console.error(err);
		chat_info = info;
	});
	api.getFriendsList(function(err, data) {
		if(err) return console.error(err);
		friends = data;
	});
	api.listen(function(err, event){
		if(err) return console.error(err);
		switch(event.type){
			case "message":
				if (event.threadID == chat_id && event.body.indexOf(" on irc:\n") == -1) client.say(irc_channel, senderName(chat_info, event.senderID, friends)+": "+event.body); // TODO on irc:
				break;
			// TODO add more
		};
	});
	client.addListener('message', function (from, to, message){
		if(message.indexOf("fb>") == 0){
			// TODO "from on irc:" as optionally text
			api.sendMessage(from+" on irc:\n"+message.substring(3, message.length).trim(), chat_id);
		}
	});
});
