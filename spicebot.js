//TODO:
// check edited messages
// count instances
// modify tracking list


var Discord = require("discord.js");
var request = require("request");
var mongodb = require("mongodb");
var async = require("async");
var fs = require("fs");

var bot = new Discord.Client();
var MongoClient = mongodb.MongoClient;

var dburl = "mongodb://localhost:27017/spicebot";
var token = "MjQ5ODUxODE0ODY5MDczOTIx.CxXKZg.YTjQJzRNgrM5EaRh8zISc8zPHdo";//fs.readFileSync("token.txt", "utf-8");

var period = "\\.";
var dollar = "\\$";


var words = [];

var foundWord = "";

bot.on("message", msg => {
    var reactionEmoji = "%F0%9F%8D%86";
    var found = false;

    MongoClient.connect(dburl, function(error, db) {
        var wordCollection = db.collection("words");

        var wordList = wordCollection.find().toArray(function(err, result) {
            if(!err && result) {
                words = result;
                if(msg.content.startsWith("!spice") && (msg.author.username != "spicebot" || msg.author.username != "spicebotTEST")) {

                    var argv = msg.content.replace(".", period).replace("$", dollar).split(" ");
                    console.log(argv);

                    var command = argv[1];

                    if(command == "add") {
                        //add
                        console.log(" add.");
                        var toAdd = [...argv];
                        toAdd = getWordFromCommand(...toAdd);

                        MongoClient.connect(dburl, function(error, db) {
                            if(error) {
                                console.log("Connection error: ", error);
                            } else {
                                console.log("Connection successful: ", dburl);
                                var wordCollection = db.collection("words");
                                wordCollection.updateOne({word: toAdd}, {$set: {tracked:msg.author.username}}, {upsert: true}, function(error, results) {
                                    msg.channel.sendMessage(toAdd + " is now a meme...");
                                    console.log("Added word to count.");
                                    db.close();
                                });
                            }
                        });
                    } else if(command == "remove") {
                        console.log("remove");
                        var toRemove = [...argv];
                        toRemove = getWordFromCommand(...toRemove);
                        MongoClient.connect(dburl, function(error, db) {
                            if(error) {
                                console.log("Connection error: ", error);
                            } else {
                                console.log("Connection successful: ", dburl);
                                var wordCollection = db.collection("words");
                                wordCollection.deleteOne({word: toRemove}, function(error, results) {
                                    msg.channel.sendMessage(toRemove + " is no longer a meme...");
                                    console.log("Removed word: ", results.result);
                                    db.close();
                                });
                            }
                        });
                    } else if(command == "list") {
                        console.log("list");
                        console.log(words);
                        var listStr = "Memes: \n\n";
                        for(var i=0; i < words.length; i++) {
                            console.log("word " + i + " = " + words[i].word);
                            listStr = listStr.concat("    - " + words[i].word + " (added by " + words[i].tracked + ")" + "\n");
                            console.log(listStr);
                        };
                        msg.channel.sendMessage(listStr);
                    } else if(command == "rank") {
                        console.log("rank");
                        var toRank = [...argv];
                        toRank = getWordFromCommand(...toRank);

                        console.log("toRank = " + toRank);
                        var exists = false;
                        for(var i=0; i < words.length && !exists; i++) {
                            if(words[i].word == toRank) {
                                exists = true;
                            }
                        }

                        if(exists) {
                            MongoClient.connect(dburl, function(error, db) {
                                if(error) {
                                    console.log("Connection error: ", dburl);
                                } else {
                                    console.log("Connection successful: ", dburl);
                                    var collection = db.collection("users");

                                    var result = collection.find({[toRank] : {$exists:true}}, function(error, result) {
                                        if(!error) {
                                            result = result.sort({[toRank]:-1});
                                            console.log("callback of sorts");
                                            console.log("found and sorted");
                                            var rankStr = "who's the most " + toRank + "\n\n";
                                            var list = result.toArray(function(error, result) {
                                                for(var i=0; i < result.length; i++) {
                                                    rankStr = rankStr.concat("  " + i + ". " + result[i].name + " - " + result[i][toRank] + "\n");
                                                    console.log(rankStr);
                                                }
                                                msg.channel.sendMessage(rankStr);
                                                db.close();
                                            });
                                        }
                                    });
                                }
                            })
                        }

                    } else if(command == "" || command == null) {
                        console.log("null");
                        var helpStr = "add [meme] - adds meme to be tracked \n \n"
                                    + "remove [meme] - removes meme \n \n"
                                    + "list - prints list of memes \n \n"
                                    + "rank [meme] - shows who is the most [meme]";
                        msg.channel.sendMessage(helpStr);
                    }

                } else {
                    for(var i=0; i < words.length && !found; i++) {
                        if(msg.content.toLowerCase().includes(words[i].word)) {
                            found = true;
                            foundWord = words[i].word;
                        }
                    }
                }

                if(found && (msg.author.username != "spicebot" && msg.author.username != "spicebotTEST")) {
                    console.log("msgauthoerusername " + msg.author.username);
                    var user = {
                        name: msg.author.username
                    };

                    MongoClient.connect(dburl, function(error, db) {
                        if(error) {
                            console.log("Connection error: ", error);
                        } else {
                            console.log("Connection successful: ", dburl);

                            var collection = db.collection("users");

                            //check if user already exists
                            console.log("user:", user.name);
                            console.log("collection:", collection.s.name);

                            var cursor = collection.findOne(
                                {
                                    name: user.name
                                },

                                function(err, doc) {
                                    checkIfUserExists(foundWord, doc, collection, user, function() {
                                        request({
                                            url: "https://discordapp.com/api/channels/" + msg.channel.id + "/messages/" + msg.id + "/reactions/"+ reactionEmoji +"/@me",
                                            method: "PUT",
                                            headers: {
                                                "Authorization": "Bot " + token,
                                                "User-Agent": "DiscordBot Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36"
                                            },
                                            json: true,
                                            body: ""
                                        }, function(error, response, body) {
                                            console.log(body);
                                        });
                                        db.close();
                                    });
                                }
                            );
                        }
                    });

                }
            }
        });
    });

});

bot.on("ready", () => {
    console.log("ready");
});

bot.login(token);

var checkIfUserExists = function(word, doc, collection, user, callback) {
    if(doc) {
        console.log("cursor is not null");
        console.log("User exists: ", doc.name);
        collection.updateOne(
            {
                name: user.name
            },
            {
                $inc:
                    {
                        [word.replace(".", period).replace("$", dollar)]: 1
                    }
            },
            function(err, result) {
                if(!err) {
                    console.log(result.result);
                    callback();
                } else {
                    console.log("Error incrementing count: ", err);
                }
            }
        );

    } else {
        console.log("User does not exist.");
        collection.insertOne(user, function(err, result) {
            if(!err) {
                console.log("Insert successful: ", result.result);
        		checkIfUserExists(word, doc, collection, user, function() {
    				request({
    				    url: "https://discordapp.com/api/channels/" + msg.channel.id + "/messages/" + msg.id + "/reactions/"+ reactionEmoji +"/@me",
    				    method: "PUT",
    				    headers: {
    					"Authorization": "Bot " + token,
    					"User-Agent": "DiscordBot Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36"
    				    },
    				    json: true,
    				    body: ""
    				}, function(error, response, body) {
    				    console.log(body);
    				});

    				db.close();
			    });
		    }
		});
		console.log("Inserted user: ", user);
        callback();
    };
};

var getUser = function(collection, user, callback) {
    collection.findOne( {name: user.name}, function(err, result) {
        if(!err) {
            callback(result);
        }
    })
}

var getWordFromCommand = function(spice, command, ...word) {
    var retval = "";
    for (var i = 0; i < word.length; i++) {
        retval = retval.concat(word[i]);
        if(i != word.length - 1) {
            retval = retval.concat(" ");
        }
    }
    console.log(retval);
    return retval;
}
