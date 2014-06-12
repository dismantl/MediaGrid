'use strict';

/* Controllers */

var mgChatControllers = angular.module('mgChat.controllers',['mgChat.couchdbServices'])

//initialize user control 
mgChatControllers.controller('mgChat.userCtrl', 
			     ['$scope','getSession','updateUserDoc','$modal',
			     function($scope,getSession,updateUserDoc,$modal) {
  $scope.user = {
    username: '',
    // TODO in native clients, password will be randomized and stored
    password: '',
    pubkey: 0,
    prikey: 0,
    room: getParameterByName("room") || "General",
    state: { hasSession: false,
             registered: false,
             upToDate: false
    }
  };
  //set watch for session state, if unregistered, then show dialog to get username, and register user
  $scope.$watch('user.state.hasSession',function(newVal,oldVal) {
    if (newVal !== oldVal) {
      console.log('user.state.hasSession == true');
      if (!$scope.user.state.registered) {
	// popup to get username, registers user
	$modal.open({
	  templateUrl: "popupTemplate",
	  controller: usernameModalCtrl,
	  backdrop: 'static',
	  keyboard: false,
	  resolve: {
	    user: function(){
	      return $scope.user;
	    }
	  }
	});
      }
    }
  });
  //set watch for registered, and show key dialog to generate keys for user, and update to couchdb.
  $scope.$watch('user.state.registered',function(newVal,oldVal) {
    if (newVal !== oldVal) {
      console.log('user.state.registered == true');
      
      if (!$scope.user.pubkey) {
	console.log('no pubkey');
	if (typeof window.crypto != 'undefined') {
	  if (typeof window.crypto.getRandomValues === 'function') {
	    var buf = new Uint8Array(512);
	    window.crypto.getRandomValues(buf);
	    for (var i=0; i<buf.byteLength; i++) {
	      Crypto.Fortuna.AddRandomEvent(String.fromCharCode(buf[i]));
	    }
	  }
	}
	if (Crypto.Fortuna.Ready() === 0) {
	  console.log('creating keys');
	  var popup = $modal.open({
	    templateUrl: "popupTemplate",
	    controller: keyModalCtrl,
	    backdrop: 'static',
	    keyboard: false,
	    resolve: {
	      user: function(){
	        return $scope.user;
	      }
	    }
	  });
	  popup.result.then(seeded);
	} else
	  seeded();
      } else
	doUpdate();
    }
  });

  function seeded() {
    console.log('seeded');
    if (integritycheck()) {
      $scope.user.prikey = gen(32, 0, 1).toString();
      $scope.user.pubkey = bigInt2str(ecDH($scope.user.prikey), 64);
      doUpdate();
    } else {
      alert('Integrity check failed. MediaGrid cannot proceed safely.');
    }
  }
  
  function doUpdate() {
    updateUserDoc($scope.user).then(function() {
      $scope.user.state.upToDate = true;
    }, function(err) {
      alert(err);
    });
  }
  // entry point, getsession from couchdb.
  // entry point
  getSession($scope.user).then(function(user) {
    $scope.user = user;
  }, function(err) {
    alert(err);
  });
}]);


//user name dialog controller. Enter a new username to get registered, or choose an existing username to login.
function usernameModalCtrl($scope,$modalInstance,register,login,user) {
  $scope.header = "Pick a username";
  $scope.input = {txt:user.username,maxlength:12};
  $scope.placeholder = "Username here";
  $scope.requiredMsg = "Please choose a username";
  $scope.buttons = {ok:true,reset:true};
  $scope.storedUsers = [];
  //retrive users from localStorage
  if(window.localStorage){
	  if(localStorage.credentials){
		$scope.storedUsers=JSON.parse(localStorage.credentials);
	  }
  }
  $scope.onLogin = function(username,password){
	$scope.input.txt = "";
	user.username=username;
	user.password=password;
	login(user).then(function(retUser){
		user = retUser;
		$modalInstance.close(user);
	},function(err) {
      if (err.user.username == '') {
	$scope.reset();
	$scope.placeholder = "Login failed, try again";
      } else
	alert(err.msg);
    });
  };
  $scope.onOk = function() {
    var password = gen(10,true,false);//T random generated password.
    user.password = password;
    user.username = $scope.input.txt;
    register(user).then(function(retUser) {
      //store user credential into localStorage
      if(window.localStorage){
		  if(!localStorage.credentials){
			localStorage.credentials="[]";
		  }
		  var credentials=JSON.parse(localStorage.credentials);
		  credentials.push({username:user.username,password:user.password})
	      localStorage.credentials=JSON.stringify(credentials);
	  }
      user = retUser;
      $modalInstance.close(user);
    },function(err) {
      if (err.user.username == '') {
	$scope.reset();
	$scope.placeholder = "Username taken, try again";
      } else
	alert(err.msg);
    });
  };
  $scope.reset = function() {
    $scope.input.txt = "";
  }
}
usernameModalCtrl.$inject = ['$scope','$modalInstance','register','login','user'];

//dialog to generate entropy for crypto key generation
function keyModalCtrl($scope,$modalInstance,user,$timeout) {
  $scope.header = "Generating keys...";
  $scope.input = {txt:''};
  $scope.msg = "Type on your keyboard as randomly as possible for a few seconds:";
  $scope.buttons = {noButtons:true};
  $timeout(function(){
    if (Crypto.Fortuna.Ready()) {
      $modalInstance.close();
    } else {
      var down, up, e;
      $('#popupInput').focus();
      $('#popupInput').keydown(function(event) {
        if (Crypto.Fortuna.Ready() === 0) {
	  e = String.fromCharCode(event.keyCode);
	  var d = new Date();
	  down = d.getTime();
        }
      });
      $('#popupInput').keyup(function() {
        if (Crypto.Fortuna.Ready() === 0) {
	  var d = new Date();
	  up = d.getTime();
	  Crypto.Fortuna.AddRandomEvent(e + (up - down));
        } else {
	  $modalInstance.close();
	  $scope.$apply();
        }
      });
    }
  });
}
keyModalCtrl.$inject = ['$scope','$modalInstance','user','$timeout'];

// TODO: don't allow updating user key in validate_doc_update.js
//TODO in validate_doc_update, don't allow users to post in a room that isn't in their rooms array
mgChatControllers.controller('mgChat.chatCtrl', 
			     ['$scope','$modal','getMOTD','db','getMsgs','queueMsg','logout','$window',
			     function($scope,$modal,getMOTD,db,getMsgs,queueMsg,logout,$window) {
  $scope.users = {};
  $scope.msg_list = [];
  $scope.chat = {msg:'',selected:$scope.user.room};
  var initialized = {};
  //set watch for upToDate, to update for user list ,chat message
  $scope.$watch('user.state.upToDate',function(newVal,oldVal) {
    if (newVal !== oldVal) {
      console.log('starting');
      db.changes(0, {filter: 'chat/user', include_docs: true, room: $scope.user.room}).onChange(updateUsers);
      db.changes(0, {filter: 'chat/chat', room: $scope.user.room}, true).onChange(getMessages);
      db.changes(0, {filter: 'chat/im', include_docs: true}, true).onChange(getInstMessages);
    }
  });
  //get MOTD, get message of the day
  // a message that you automatically receive whenever you join the room
  getMOTD().then(function(motd){
    $scope.motd = motd;
  });
  //update users
  function updateUsers(latest) {
    angular.forEach(latest.results,function(user,_) {
      var name = user.doc._id;
      if (user.doc.left.indexOf($scope.user.room) !== -1 && user.doc.rooms.indexOf($scope.user.room) === -1) {  
        delete $scope.users[name];
	if (initialized.users)
	  $scope.msg_list.push({value: {announcement:true, message: "* " + name + " has left"}});
      } else if(user.doc.left.indexOf($scope.user.room) === -1 && user.doc.rooms.indexOf($scope.user.room) !== -1) {
        if (!$scope.users[name]) {
          $scope.users[name] = {
	    key: user.doc.key,
	    seckey: Whirlpool(ecDH($scope.user.prikey, str2bigInt(user.doc.key, 64))),
	    messages: [],
	    name: name
          };
	  if (initialized.users || name == $scope.user.username)
	    $scope.msg_list.push({value: {announcement:true, message: "* " + name + " has arrived"}});
        }
        var big = str2bigInt($scope.users[name].key, 64);
        if ((equals(big, p25519) || greater(big, p25519) || greater(z, big)) || 
          ($scope.users[name].key !== user.doc.key)) {
	  // TODO handle this better
          $scope.users[name].fingerprint = 'DANGER: This user is using suspicious keys.' + 
            ' Communicating with this user is strongly not recommended.';
	  alert('WARNING: ' + name + ' sent a sketchy encryption key! Communicating with them is not recommended.');
	} else {
	  $scope.users[name].fingerprint = Whirlpool(name + $scope.users[name].key).substring(0, 22);
	  $scope.users[name].fingerprint = bubbleBabble(Crypto.util.hexToBytes($scope.users[name].fingerprint));
        }
      }
    });
    
    if (!initialized.users) initialized.users = true;
    $scope.$apply();    
  }
  //get list of chat room messages
  function getMessages(latest) {
    var firstMsg = latest.results[0].id;
    var lastMsg = latest.results[latest.results.length - 1].id;
    getMsgs($scope.user.room,$scope.user.username,firstMsg,lastMsg).then(function(resp) {
      $scope.msg_list = $scope.msg_list.concat(resp.rows);
    });
  }
  //get instant messages list from each user
  function getInstMessages(latest) {
    angular.forEach(latest.results,function(val,key) {
      $scope.users[val.doc.from == $scope.user.username ? val.doc.to : val.doc.from].messages.push(val.doc);
    });
    $scope.$apply();
  }
  //adds the outgoing message to a queue, which is
  //eventually posted to the couchDB server.
  $scope.submitMsg = function() {
    if ($scope.chat.selected !== $scope.user.room) {  // IM
      var recipients = {};
      recipients[$scope.user.username] = $scope.users[$scope.user.username];
      recipients[$scope.chat.selected] = $scope.users[$scope.chat.selected];
      queueMsg($scope.chat.msg,recipients,$scope.user.username);
    } else
      queueMsg($scope.chat.msg,$scope.users,$scope.user.username,$scope.user.room);
  };
  
  $window.onbeforeunload = function() {
    // TODO the callback function gets called in FF, not Chrome, before user decides to leave or not
    logout($scope.user,$scope.users,$scope.user.room/*,function() {
      updateUserDoc($scope.user);
    }*/);
    return "Are you sure you want to leave?";
  };
  
  $scope.logout = function() {
    window.location='/media/_design/media/index.html';
  };
  //switch room and redirect to it
  $scope.switchRoom = function() {
    $scope.modal = $modal.open({
      templateUrl: "popupTemplate",
      controller: roomModalCtrl,
      backdrop: true,
      keyboard: true,
      resolve: {
	user: function(){
	  return $scope.user;
	}
      }
    });
    $scope.modal.result.then(function() {
      $scope.modal = null;
    },function() {
      $scope.modal = null;
    });
  };
}]);
//room switch controller
function roomModalCtrl($scope,$modalInstance,user) {
  $scope.header = "Enter room name to join";
  $scope.input = {txt:user.room,maxlength:20};
  $scope.requiredMsg = "Please enter a room name";
  $scope.buttons = {ok:true,cancel:true};
  $scope.onOk = function() {
    window.location = window.location.pathname + "?room=" + $scope.input.txt;
  };
}
roomModalCtrl.$inject = ['$scope','$modalInstance','user'];