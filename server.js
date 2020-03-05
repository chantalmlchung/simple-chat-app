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

// usernames which are currently connected to the chat
var usernames = {};
var message_list = [];

function generateUsername() {
	let username = uniqueNamesGenerator({
		dictionaries: [animals],
		length: 1
	});
	username = 'Anonymous ' + username.charAt(0).toUpperCase() + username.substring(1);
	return username;
}


io.on('connection', function (socket) {
  	var addedUser = false;
	// Generate name for user
	socket.on('get username', () => {
		socket.username = generateUsername();
		addedUser = true;
		socket.emit('generate username', socket.username);
		socket.broadcast.emit('user joined', socket.username);
	});
	
	// Returning user
	socket.on('returning user', (data) => {
		socket.username = data.username;
		usernames[socket.username] = data.color;
		addedUser = true;
		socket.broadcast.emit('user joined', socket.username);
	});

	socket.on('check username', (name) => {
		if (name in usernames) {
			new_name = generateUsername();
			socket.emit('set name', new_name);
		}
		else {
			socket.emit('set name', name);
		}
	});

	// Set username color
	socket.on('set user color', (color) => {
		usernames[socket.username] = color;
	});

	// Change username color
	socket.on('change user color', (data) => {
		usernames[data.username] = data.color;
	});
	
	// Get all users currently connected
	socket.on('get users', () => {
		socket.emit('all users', usernames);
	});

	// Send client chat message history
	socket.on('get chat history', () => {
		socket.emit('chat history', message_list);
	})

	// Update user chat colors
	socket.on('update chat colors', (data) => {
		for (message of message_list) {
			if (message.username.trim() === data.username.trim()) {
				message.color = data.color;
			}
		}
		socket.emit('chat history', message_list);
		socket.broadcast.emit('chat history', message_list);
	});

	// Update chat when user changes their name
	socket.on('update chat names', (data) => {
		for (message of message_list) {
			if (message.username === data.old_username) {
				message.username = data.new_username;
				message.color = data.color;
			}
		}
		socket.emit('chat history', message_list);
		socket.broadcast.emit('chat history', message_list);
	});

	// Send new message from user to all connected users
	socket.on('new message', (data) => {
		let timestamp = new Date().getTime();
		// we tell the client to execute 'new message'
		socket.broadcast.emit('new message', {
			username: data.username,
			color: data.color,
			message: data.data,
			timestamp: timestamp
		});
		socket.emit('new message', {
			username: data.username,
			color: data.color,
			message: data.data,
			timestamp: timestamp
		});
		if (message_list.length === 200) {
			// Remove earliest message
			message_list.shift();
		}
		message_list.push({
			username: data.username,
			color: data.usernameColor,
			message: data.data,
			timestamp: timestamp
		});
	});

	// Send updated user list to all connected clients
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

	// Let all connected users know that a user has left
	socket.on('disconnect', function () {
		// remove the username from global usernames list
		if (addedUser) {
			delete usernames[socket.username];
			// echo globally that this client has left
			socket.broadcast.emit('user left', socket.username);
		}
	});
});