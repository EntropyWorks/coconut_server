var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var NodeRSA = require('node-rsa');
var key = new NodeRSA({b: 512});

var serverKey = key.exportKey('public');


http.listen(3000, function(req,res) {
  console.log('listening');
});

app.get('/key', function(req, res) {
  res.send(serverKey);
});

io.on('connection', function(socket){
  socket.on('join room', function(data) {
    socket.join(data.sessionId);
    socket['sessionId'] = data.sessionId;
    socket['publicKey'] = data.publicKey;
  });

  socket.on('message', function(data) {

    var messageDecrypted = key.decrypt(data.message, 'utf8');


    var clients = io.sockets.adapter.rooms[data.sessionId];
     for (var clientId in clients) {

      var clientSocket = io.sockets.connected[clientId];
      //import public key
      key.importKey(clientSocket['publicKey'], 'public');

      var object = {
        event : data.event,
        message: key.encrypt(messageDecrypted, 'base64')
      };
      //import back the server's key
      key.importKey(serverKey, 'public');
      //check if it is not the same socket
      if(clientSocket.id != socket.id)
        clientSocket.emit('message', object);

    }

  });

});
