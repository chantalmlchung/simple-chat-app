// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
const {uniqueNamesGenerator, animals} = require('unique-names-generator');

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

// usernames which are currently connected to the chat
var usernames = {};
var message_list = [];

io.on('connection', function (socket) {
  	var addedUser = false;
	// Generate name for user
	socket.on('get username', () => {
		let username = uniqueNamesGenerator({
			dictionaries: [animals],
			length: 1
		});
		username = 'Anonymous ' + username.charAt(0).toUpperCase() + username.substring(1);
		socket.username = username;
		addedUser = true;
		socket.emit('generate username', socket.username);
		socket.broadcast.emit('user joined', socket.username);
	});

	socket.on('set user color', (color) => {
		usernames[socket.username] = color;
	})
	
	socket.on('get users', () => {
		socket.emit('all users', usernames);
	});

	// send client chat message history
	socket.on('get chat history', () => {
		socket.emit('chat history', message_list);
	})

	// Update chat when user changes their name
	socket.on('update chat names', (data) => {
		for (message of message_list) {
			if (message.username === data.old_username) {
				message.username = data.new_username;
			}
		}
		socket.emit('chat history', message_list);
		socket.broadcast.emit('chat history', message_list);
	});

	// when the client emits 'new message', this listens and executes
	socket.on('new message', function (data) {
		let timestamp = new Date().getTime();
		// we tell the client to execute 'new message'
		socket.broadcast.emit('new message', {
			username: socket.username,
			color: usernames[socket.username],
			message: data,
			timestamp: timestamp
		});
		socket.emit('new message', {
			username: socket.username,
			color: usernames[socket.username],
			message: data,
			timestamp: timestamp
		});
		if (message_list.length === 200) {
			// Remove earliest message
			message_list.shift();
		}
		message_list.push({
			username: socket.username,
			color: usernames[socket.username],
			message: data,
			timestamp: timestamp
		});
	});

	// when the client emits 'add user', this listens and executes
	socket.on('new username', (username) => {
		// Set old username to the new username
		old_username = socket.username;
		user_color = usernames[old_username];
		delete usernames[socket.username];
		socket.username = username;
		usernames[socket.username] = user_color;
		socket.broadcast.emit('new user list', usernames);
		socket.emit('new list - sender', {
			user_list: usernames,
			username: username
		});
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function () {
		// remove the username from global usernames list
		if (addedUser) {
			// echo globally that this client has left
			socket.broadcast.emit('user left', socket.username);
			delete usernames[socket.username];
		}
	});
});