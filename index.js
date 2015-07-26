var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var NodeRSA = require('node-rsa');
var key = new NodeRSA({b: 512});

var serverKey = key.exportKey('public');

app.set('port', (process.env.PORT || 3000));


http.listen(app.get('port'), function(req,res) {
  console.log('listening');
});

app.get('/key', function(req, res) {
  res.send(serverKey);
});

io.on('connection', function(socket){

  //handshake
  socket.on('join room', function(data) {

    //add socket into the room
    socket.join(data.sessionId);

    socket['sessionId'] = data.sessionId;
    socket['publicKey'] = data.publicKey;

    //log
    console.log(socket.id + " has joined the room " + socket['sessionId']);

    var room = io.sockets.adapter.rooms[data.sessionId];
    //the number of sockets in the room
    var roomSize = Object.keys(room).length;
    //if it's not the only one in the room, then sync
    if(Object.keys(room).length > 1) {
        //generate random number between 1 and the size of the room - 1
        var random = Math.floor((Math.random() * (roomSize-1)) + 1);;
        var index = 1;
        for(var clientId in room) {
          //check if is the random pick
          if(index == random) {
            //pick this socket
            //request emit
            var clientSocket = io.sockets.connected[clientId];
            clientSocket.emit('request init');
            clientSocket.on('init', function(data) {
              var text = key.decrypt(data, 'utf8');
              console.log('received: ' + text);
              //key.importKey(clientSocket['publicKey'], 'public');
              //encrypt the data with the clien's public key
              //var encrypted = key.encrypt(text, 'base64');
              //import back the server's key
              //key.importKey(serverKey, 'public');
              socket.emit('init', text);

            })
            break;
          }


          index++;

        }
    }


  });

  socket.on('message', function(data) {

    var decrypted = key.decrypt(data, 'utf8');
    var clients = io.sockets.adapter.rooms[socket['sessionId']];
     for (var clientId in clients) {
      var clientSocket = io.sockets.connected[clientId];
      //import public key
      key.importKey(clientSocket['publicKey'], 'public');
      //encrypt the data with the clien's public key
      var encrypted = key.encrypt(decrypted, 'base64');
      //import back the server's key
      key.importKey(serverKey, 'public');
      //check if it is not the same socket
      if(clientSocket.id != socket.id)
        clientSocket.emit('message', encrypted);

    }

  });

  socket.on('disconnect', function () {
    console.log('user disconnected');
    //then leave the room
    socket.leave(socket['sessionId']);
  });

  socket.on('init', function(data) {

  })

});
