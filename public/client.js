$(function() {
    var FADE_TIME = 150; // ms
    var TYPING_TIMER_LENGTH = 400; // ms
    var COLORS = [
      '#e21400', '#91580f', '#f8a700', '#f78b00',
      '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
      '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];
  
    // Initialize variables
    var $window = $(window);
    var $messages = $('.messages'); // Messages area
    var $inputMessage = $('.inputMessage'); // Input message input box
    var $userList = $('.users');
    var $userIdentity = $('.user-identification');
  
    var $chatPage = $('.chat.page'); // The chatroom page
  
    var username;
    var usernameColor;
    var connected = false;
    var $currentInput = $inputMessage.focus();
    var usernames = [];
  
    var socket = io();
    
    // Sets the client's username
    function changeUsername (name) {
      if (usernames.includes(name)) {
        log('Failed to change username. Already exists.');
        return;
      }
      new_name = cleanInput(name);
      // Tell the server your username
      socket.emit('new username', new_name);
      socket.emit('update chat names', {
        old_username: username,
        new_username: name
      });
    }

    // Get list of connected users
    function getAllUsers() {
      socket.emit('get users');
    }
    getAllUsers();

    // Get message history
    function getChatHistory() {
      socket.emit('get chat history');
    }
    getChatHistory();

    // Get a random username
    function getUsername() {
        socket.emit('get username');
        connected = true;
        $chatPage.show();
    }
    getUsername();
  
    // Sends a chat message
    function sendMessage () {
      var message = $inputMessage.val();
      $inputMessage.val('');
      // Prevent markup from being injected into the message
      message = cleanInput(message);
      // if there is a non-empty message and a socket connection
      if (message && connected) {
        if (message.includes('/nick')) {
          old_username = username;
          new_name = message.slice('/nick'.length, message.length);
          changeUsername(new_name);
        }
        else {
          // tell server to execute 'new message' and send along one parameter
          socket.emit('new message', message);
        }
      }
    }
  
    // Log a message
    function log (message, options) {
      var $el = $('<li>').addClass('log').text(message);
      addMessageElement($el, options);
    }

    function msToTime(ms) {
      var date = new Date(ms);
      let hours = date.getHours();
      let minutes = date.getMinutes();
      if (hours.toString().length === 1) {
        hours = '0' + hours;
      }
      if (minutes.toString().length === 1) {
        minutes = '0' + minutes;
      }

      return hours + ":" + minutes;
    }

    // Add 
  
    // Adds the visual chat message to the message list
    function addChatMessage (data, options) {
      // options = options || {};

      var $timeDiv = $('<br><span class="timestamp"/>')
        .text(msToTime(data.timestamp));
      var $usernameDiv = $('<span class="username"/>')
        .text(data.username)
        .css('color', getUsernameColor(data.username, data.color));
      var $messageBodyDiv = $('<span class="' + options.message + '">')
        .text(data.message)

      var $messageDiv = $('<li class="' + options.allign + '"/>')
        .data('username', data.username)
        .append($usernameDiv, $messageBodyDiv, $timeDiv);
      
      addMessageElement($messageDiv, options);
    }
  
    // Adds a message element to the messages and scrolls to the bottom
    // el - The element to add as a message
    // options.fade - If the element should fade-in (default = true)
    // options.prepend - If the element should prepend
    //   all other messages (default = false)
    function addMessageElement (el, options) {
      var $el = $(el);
  
      // Setup default options
      if (!options) {
        options = {};
      }
      if (typeof options.fade === 'undefined') {
        options.fade = true;
      }
      if (typeof options.prepend === 'undefined') {
        options.prepend = false;
      }
  
      // Apply options
      if (options.fade) {
        $el.hide().fadeIn(FADE_TIME);
      }
      if (options.prepend) {
        $messages.prepend($el);
      } else {
        $messages.append($el);
      }
      // Automatically scroll to last message
      $messages[0].scrollTop = $messages[0].scrollHeight;
    }
  
    // Prevents input from having injected markup
    function cleanInput (input) {
      return $('<div/>').text(input).text();
    }
  
    // Gets the color of a username through our hash function
    function getUsernameColor (user, color=null) {
      if (color) {
        return color;
      }
      // Compute hash code
      var hash = 7;
      for (var i = 0; i < user.length; i++) {
         hash = user.charCodeAt(i) + (hash << 5) - hash;
      }
      // Calculate color
      var index = Math.abs(hash % COLORS.length);
      return COLORS[index];
    }

    // Add users to the user list
    function addUserToList(name) {
      usernames.push(name);
      $userList.append('<li>' + name + '</li>');
    }

    // Remove users from the user list
    function removeUserFromList(name) {
      index = usernames.indexOf(name);
      if (index > -1) {
        usernames.splice(index, 1);
      }
      // Clear existing html list
      $userList.empty();
      for (name of usernames) {
        $userList.append('<li>' + name + '</li>');
      }
    }
  
    // Keyboard events
  
    $window.keydown(function (event) {
      // Auto-focus the current input when a key is typed
      if (!(event.ctrlKey || event.metaKey || event.altKey)) {
        $currentInput.focus();
      }
      // When the client hits ENTER on their keyboard
      if (event.which === 13) {
          sendMessage();
      }
    });
  
    // Click events
  
    // Focus input when clicking on the message input's border
    $inputMessage.click(function () {
      $inputMessage.focus();
    });
  
    // Socket events
    socket.on('generate username', (name) => {
      // Generate new name until unique name obtained
      while (usernames.includes(name)) {
        getUsername();
      }
      username = name;
      usernameColor = getUsernameColor(username);
      socket.emit('set user color', usernameColor);
      addUserToList(username);
      $userIdentity.html('Your Identity is: ' + username);
    });

    socket.on('all users', (users) => {
      names = Object.keys(users);
      for (name of names) {
        if (usernames.includes(name)) {
          continue;
        }
        usernames.push(name);
      }
      // Clear existing html list
      $userList.empty();
      for (name of usernames) {
        $userList.append('<li>' + name + '</li>');
      }
    });

    // Whenever the server emits 'login', log the login message
    socket.on('new user list', function (users) {
      names = Object.keys(users);
      usernames = new Array();
      $userList.empty();
      for (name of names) {
        usernames.push(name);
        $userList.append('<li>' + name + '</li>');
      }
    });

    socket.on('new list - sender', (data) => {
      console.log(data.user_list);
      names = Object.keys(data.user_list);
      username = data.username;
      usernames = new Array();
      $userIdentity.html('Your Identity is: ' + username);
      $userList.empty();
      for (name of names) {
        usernames.push(name);
        $userList.append('<li>' + name + '</li>');
      }
    });
  
    // Whenever the server emits 'new message', update the chat body
    socket.on('new message', function (data) {
      if (data.username === username) {
        addChatMessage(data, {
          message: 'message-mine',
          allign: 'li-mine'
        });
      }
      else {
        addChatMessage(data, {
          message: 'message-theirs',
          allign: 'li-theirs'
        });
      }
    });

    // Load in message list
    socket.on('chat history', (message_list) => {
      // Clear chat history first
      $messages.empty();
      for (message of message_list) {
        if (message.username === username) {
          addChatMessage(message, {
            message: 'message-mine',
            allign: 'li-mine'
          });
        }
        else {
          addChatMessage(message, {
            message: 'message-theirs',
            allign: 'li-theirs'
          });
        }
      }
    });
  
    // Whenever the server emits 'user joined', log it in the chat body
    socket.on('user joined', function (name) {
      log(name + ' joined');
      addUserToList(name)
    });
  
    // Whenever the server emits 'user left', log it in the chat body
    socket.on('user left', function (name) {
      log(name + ' left');
      removeUserFromList(name);
    });
  });