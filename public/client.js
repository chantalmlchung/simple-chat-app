$(function() {
    var FADE_TIME = 150;
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
    var $userID = $('.userID');
    var $chatPage = $('.chat.page'); // The chatroom page
    var username;
    var usernameColor;
    var connected = false;
    var $currentInput = $inputMessage.focus();
    var usernames = [];

    var socket = io();
    

    // Cookies
    // Set cookie
    function setCookie(field, value) {
      document.cookie = field + "=" + value + ";max-age=3600";
    }
    // Get cookie
    function getCookie(field) {
      var name = field + "=";
      var decodedCookie = decodeURIComponent(document.cookie);
      var ca = decodedCookie.split(';');
      for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
          c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
          return c.substring(name.length, c.length);
        }
      }
      return "";
    }

    // Change the client's username
    function changeUsername (name) {
      if (usernames.includes(name.trim())) {
        log('Failed to change username. Already exists.');
        return;
      }
      new_name = cleanInput(name);
      // Tell the server your username
      socket.emit('new username', new_name);
      socket.emit('update chat names', {
        old_username: username,
        new_username: new_name,
        color: usernameColor
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

    function checkUsername() {
      name = getCookie('username');
      if (name !== "") {
        socket.emit("check username", name.trim());
      }
      else {
        socket.emit('get username');
      }
      connected = true;
      $chatPage.show();
    }
    checkUsername();


    // Get a random username or use existing one if cookie exists
    // function getUsername() {
        // Check if cookie exists for the user
        // name = getCookie('username');
        // if (name !== "") {
        //   if (!usernames.includes(name.trim())) {
        //     username = name;
        //   }
        //   else {
        //     socket.emit('get username');
        //   }
        //   color = getCookie('color');
        //   if (color !== ""){
        //     usernameColor = color;
        //   }
        //   else {
        //     usernameColor = getUsernameColor(username);
        //   }
        //   socket.emit('returning user', {
        //     username: username,
        //     color: usernameColor
        //   });
        //   addUserToList(username);
        //   $userID.empty();
        //   $userID.text(username).css('color', usernameColor);
        // }
        // else {
        // socket.emit('get username');
        // }
    //     connected = true;
    //     $chatPage.show();
    // }
    // getUsername();
  
    // Sends a chat message
    function sendMessage () {
      var message = $inputMessage.val();
      $inputMessage.val('');
      // Prevent markup from being injected into the message
      message = cleanInput(message);
      // if there is a non-empty message and a socket connection
      if (message && connected) {
        if (message.includes('/nickcolor')) {
          let new_color = message.slice('/nickcolor'.length, message.length);
          // Check for valid username color
          let hex_val = '#' + new_color.trim();
          let re = /^#[0-9A-Fa-f]{6}$/i;
          if (!re.test(hex_val)) {
            log('Invalid hex color. Please try again.')
            return;
          }
          usernameColor = hex_val;
          socket.emit('change user color', {
            username: username,
            color: usernameColor
          });
          socket.emit('update chat colors', {
            username: username,
            color: usernameColor
          });
          setCookie('color', usernameColor);
          $userID.empty();
          $userID.text(username).css('color', usernameColor);
        }
        else if (message.includes('/nick')) {
          old_username = username;
          new_name = message.slice('/nick'.length, message.length);
          changeUsername(new_name);
        }
        else if (message.includes('/')) {
          log('Bad command. Please try again.');
        }
        else {
          // tell server to execute 'new message' and send along one parameter
          socket.emit('new message', {
            username: username,
            color: usernameColor,
            data: message
          });
        }
      }
    }
  
    // Log a message
    function log (message, options) {
      var $el = $('<li>').addClass('log').text(message);
      addMessageElement($el, options);
    }

    // Convert ms to HH:MM
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
      input = input.toString().trim();
      return $('<div/>').text(input).text();
    }
  
    // Gets the color of a username through a hash function
    function getUsernameColor (user, color=null) {
      // If the user already has a color, return the color
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
    $window.keydown((event) => {
      // Auto-focus the current input when a key is typed
      if (!(event.ctrlKey || event.metaKey || event.altKey)) {
        $currentInput.focus();
      }
      // When ENTER button pressed
      if (event.which === 13) {
          sendMessage();
      }
    });
  
    // Click events
    // Focus input when clicking on the message input's border
    $inputMessage.click (() => {
      $inputMessage.focus();
    });
  
    // Socket events
    // Receive rnadom username from server
    socket.on('generate username', (name) => {
      // Generate new name until unique name obtained
      while (usernames.includes(name.trim())) {
        getUsername();
      }
      username = name;
      usernameColor = getUsernameColor(username);
      socket.emit('set user color', usernameColor);
      addUserToList(username);
      $userID.empty();
      $userID.text(username).css('color', usernameColor);
      setCookie('username', username);
      setCookie('color', usernameColor);
    });

    socket.on('set name', (name) => {
      username = name;
      color = getCookie('color');
      if (color !== ""){
        usernameColor = color;
      }
      else {
        usernameColor = getUsernameColor(username);
      }
      socket.emit('returning user', {
        username: username,
        color: usernameColor
      });
      addUserToList(username);
      $userID.empty();
      $userID.text(username).css('color', usernameColor);
    });

    // Receive all users from server
    socket.on('all users', (users) => {
      names = Object.keys(users);
      for (name of names) {
        if (usernames.includes(name.trim())) {
          continue;
        }
        usernames.push(name);
      }
      // Clear existing user list
      $userList.empty();
      for (name of usernames) {
        $userList.append('<li>' + name + '</li>');
      }
    });

    // Receive new user list from server
    socket.on('new user list', (users) => {
      names = Object.keys(users);
      usernames = new Array();
      $userList.empty();
      for (name of names) {
        usernames.push(name);
        $userList.append('<li>' + name + '</li>');
      }
    });

    // Receive new user list from server
    socket.on('new list - sender', (data) => {
      names = Object.keys(data.user_list);
      username = data.username;
      usernames = new Array();
      $userID.empty();
      $userID.text(username).css('color', usernameColor);
      $userList.empty();
      for (name of names) {
        usernames.push(name);
        $userList.append('<li>' + name + '</li>');
      }
      setCookie('username', username);
    });
  
    // Update chat body when new message received from server
    socket.on('new message', (data) => {
      if (data.username === username && data.color === usernameColor) {
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
        if (message.username.trim() === username && message.color === usernameColor) {
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
  
    // Log user joined events from server
    socket.on('user joined', (name) => {
      log(name + ' joined');
      addUserToList(name)
    });
  
    // Log user left events from server
    socket.on('user left', (name) => {
      log(name + ' left');
      removeUserFromList(name);
    });
  });