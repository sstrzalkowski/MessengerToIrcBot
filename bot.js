
function error(err){
	console.error(err);
	process.exit();
}

readline = require('readline-sync');
Getopt = require("node-getopt");
getopt = new Getopt([
	["i", "id=", "id of messenger conversation (REQUIRED)"],
	["s", "server=", "irc server (REQUIRED)"],
	["c", "channel=", "irc channel (REQUIRED) REMEMBER TO PUT IT IN THE QUOTATION MARK - # is interpreted by bash as begining of a comment"],
	["p", "password", "authenticate on irc chanell using password"],
	["S", "self-listen", "self listen on messenger"],
	["P", "prefix=", "prefix in messages on irc that has to be send to messenger (by default all messages are send)"],
	["m", "message=", "message send to messenger before message from IRC (%s is replaced by sender name)"],
	["h", "help", "show help"]
]);
opt = getopt.bindHelp().parseSystem();

if(opt.options["id"] != undefined && opt.options['server'] != undefined && opt.options['channel'] != undefined){
	var chat_id = opt.options['id'];
	var irc_server = opt.options['server'];
	var irc_channel = opt.options['channel'];
}
else {
	getopt.showHelp();
	process.exit();
}
if(opt.options['password'] == true) var irc_password = readline.question("IRC channel password: ", {hideEchoBack: true});
if(opt.options['self-listen'] == true) var selfListen = true;
else selfListen = false;
if(opt.options['prefix'] != undefined) var prefix = opt.options['prefix'];
if(opt.options['message'] != undefined) var beforeMessage = opt.options['message'];
else var beforeMessage = "";

var fb_mail = readline.question("Facebook email: ");
var fb_pass = readline.question("Facebook password: ", {hideEchoBack: true});



function senderName(info, sender, friends){
	if(info.nicknames != undefined && info.nicknames[sender] != undefined) return info.nicknames[sender];
	for (i = 0; i < friends.length; i++) {
		if(friends[i].userID == sender) return friends[i].fullName;
	}
	if(sender == chat_id) return info.name;
	return sender;
}

var irc = require('irc');

if(irc_password != undefined)
	var client = new irc.Client(irc_server, 'messenger-bot', {channels: [irc_channel+" "+irc_password]});
else
	var client = new irc.Client(irc_server, 'messenger-bot', {channels: [irc_channel]});


var login = require("facebook-chat-api");
login({email: fb_mail, password: fb_pass}, function callback(err, api){
	if(err) error(err);
	api.setOptions({selfListen: selfListen});
	var chat_info;
	var friends;
	api.getThreadInfo(chat_id, function(error, info){
		if(err) error(err);
		chat_info = info;
	});
	api.getFriendsList(function(err, data) {
		if(err) error(err);
		friends = data;
	});
	api.listen(function(err, event){
		if(err) error(err);
		if(event.threadID == chat_id){
			if (event.type == "message" && event.body != undefined)
				client.say(irc_channel, senderName(chat_info, event.senderID, friends)+": "+event.body);
			if(event.attachments != undefined) {
				for(i = 0; i < event.attachments.length; i++) {
					//if(event.attachments[i] == undefined) break; //don't know why but without it sometimes it was undefined. weird...
					var attachment = event.attachments[i];
					if(attachment.url != undefined) {
						client.say(irc_channel, senderName(chat_info, event.senderID, friends)+" send an attachment: "+attachment.url);
					}
					else if(attachment.hiresUrl != undefined) {
						client.say(irc_channel, senderName(chat_info, event.senderID, friends)+" send an attachment: "+attachment.hiresUrl);
					}
					else if(attachment.previewUrl != undefined) {
						client.say(irc_channel, senderName(chat_info, event.senderID, friends)+" send an attachment: "+attachment.previewUrl);
					}
					else if(attachment.facebookUrl != undefined) {
						var url = attachment.facebookUrl;
						if(url.indexOf('https://') == -1 && url.indexOf('http://') == -1)
							url = "https://facebook.com"+url;
						client.say(irc_channel, senderName(chat_info, event.senderID, friends)+" send an attachment: "+url);
					}
				}
			}
		}
	});
	client.addListener('message', function (from, to, message){
		if(prefix == undefined){
			api.sendMessage(beforeMessage.replace("%s", from)+message, chat_id);
		}
		else if (message.indexOf(prefix) == 0) {
			api.sendMessage(beforeMessage.replace("%s", from)+message.substring(prefix.length, message.length).trim(), chat_id);
		}
	});
});
