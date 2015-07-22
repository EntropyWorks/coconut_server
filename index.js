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
    socket.join(data.sessionId);
    socket['sessionId'] = data.sessionId;
    socket['publicKey'] = data.publicKey;

    console.log(socket.id + " has joined the room " + socket['sessionId']);
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

});
