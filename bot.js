
//Error handling function
function error(err, optionalMessage) {
	if(optionalMessage == undefined || debug == true)
		console.error(err);
	if(optionalMessage != undefined) 
		console.log(optionalMessage);
	process.exit();
}

//Function used to determine facebook username
//TODO make it better
function senderName(info, sender, friends) {
	if(info.nicknames != undefined && info.nicknames[sender] != undefined) return info.nicknames[sender];
	for (i = 0; i < friends.length; i++) {
		if(friends[i].userID == sender) return friends[i].fullName;
	}
	if(sender == chat_id) return info.name;
	return sender;
}

irc = require('irc');
login = require("facebook-chat-api");
readline = require('readline-sync');
Getopt = require("node-getopt");

getopt = new Getopt([
	["i", "id=", "id of messenger conversation (REQUIRED)"],
	["s", "server=", "irc server (REQUIRED)"],
	["c", "channel=", "irc channel (REQUIRED) REMEMBER TO PUT IT IN THE QUOTATION MARK - # is interpreted by bash as begining of a comment"],
	["n", "nick=", "bots nick on irc"],
	["p", "password", "authenticate on irc channel using password"],
	["S", "self-listen", "self listen on messenger"],
	["P", "prefix=", "prefix in messages on irc that has to be send to messenger (by default all messages are send)"],
	["m", "message=", "tittle of message from IRC in messenger e.g. \"%s: \" (%s is replaced by sender name)"],
	["d", "debug"],
	["h", "help"]
]);
opt = getopt.bindHelp().parseSystem();

//Necessary options
if(opt.options["id"] != undefined && opt.options['server'] != undefined && opt.options['channel'] != undefined){
	var chat_id = opt.options['id'];
	var irc_server = opt.options['server'];
	var irc_channel = opt.options['channel'];
}
else {
	getopt.showHelp();
	process.exit();
}

//Additional options
if(opt.options['password'] == true) var irc_password = readline.question("IRC channel password: ", {hideEchoBack: true});
if(opt.options['prefix'] != undefined) var prefix = opt.options['prefix'];
if(opt.options['debug'] == true) var debug = true;
else debug = false;
if(opt.options['self-listen'] == true) var selfListen = true;
else selfListen = false;
if(opt.options['message'] != undefined) var beforeMessage = opt.options['message'];
else var beforeMessage = "";
if(opt.options['nick'] != undefined) var nick = opt.options['nick'];
else var nick = "messenger-bot";

var fb_mail = readline.question("Facebook email: ");
var fb_pass = readline.question("Facebook password: ", {hideEchoBack: true});

channelAuth = irc_channel;
if(irc_password != undefined) {
	channelAuth += " "+irc_password;
}
var ircClient = new irc.Client(irc_server, nick, {channels: [channelAuth]});

login({email: fb_mail, password: fb_pass}, function callback(err, api){
	if(err) error(err, "Cannot authenticate to facebook");
	api.setOptions({selfListen: selfListen});

	//Variables for senderName function
	var chat_info;
	var friends;
	api.getThreadInfo(chat_id, function(error, info){
		if(err) error(err, "Wrong conversation id");
		chat_info = info;
	});
	api.getFriendsList(function(err, data) {
		if(err) error(err);
		friends = data;
	});

	api.listen(function(err, event){
		if(err) error(err);
		if(event.threadID == chat_id){
			if (event.type == "message" && event.body != undefined){
				ircClient.say(irc_channel, senderName(chat_info, event.senderID, friends)+": "+event.body);
			}
			if(event.attachments != undefined) {
				for(i = 0; i < event.attachments.length; i++) {
					var attachment = event.attachments[i];
					var url;
					if(attachment.url != undefined) {
						url = attachment.url;
					}
					else if(attachment.hiresUrl != undefined) {
						url = attachment.hiresUrl;
					}
					else if(attachment.previewUrl != undefined) {
						url = attachment.previewUrl;
					}
					else if(attachment.facebookUrl != undefined) {
						url = attachment.facebookUrl;
						if(url.indexOf('https://') == -1 && url.indexOf('http://') == -1)
							url = "https://facebook.com"+url;
					}
					else {
						continue;
					}
					ircClient.say(irc_channel, senderName(chat_info, event.senderID, friends)+" send an attachment: "+url);
				}
			}
		}
	});

	try {
		ircClient.addListener('message', function (from, to, message){
			if(prefix == undefined){
				api.sendMessage(beforeMessage.replace("%s", from)+message, chat_id);
			}
			else if (message.indexOf(prefix) == 0) {
				api.sendMessage(beforeMessage.replace("%s", from)+message.substring(prefix.length, message.length).trim(), chat_id);
			}
		});
	}
	catch(err) {
		error(err, "Cannot connect to irc")
	}
});
