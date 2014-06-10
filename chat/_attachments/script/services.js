'use strict';

/* Services */

//TODO pass actual error messages to defer.reject

var mgChatCouchdbServices = angular.module('mgChat.couchdbServices', []);
  
mgChatCouchdbServices.value(
  'path',{
    pathArray: unescape(document.location.pathname).split('/'),
    design: unescape(document.location.pathname).split('/')[3],
    dir: getParameterByName("dir")
  })
  .factory('db',['path',function(path) { return $.couch.db(path.pathArray[1]); }])
  //get user session from couchdb, usually after login
  .factory(
    'getSession',['$rootScope','$q', function($rootScope,$q) {
    return function(user) {
      var deferred = $q.defer();
      $.couch.session({
	success: function(resp) {
	  console.log('successfully got session');
	  if (resp.userCtx.name) {
	    user.username = resp.userCtx.name;
	    user.state.registered = true;
	  }
	  user.state.hasSession = true;
	  $rootScope.$apply(function(){
	    deferred.resolve(user);
	  });
	},
	error: function(err) {
	  console.log('error getting session');
	  $rootScope.$apply(function(){
	    deferred.reject('Error getting session!');
	  });
	}
      });
      return deferred.promise;
    };
  }]);
//login to couchdb with username and password
mgChatCouchdbServices.factory(
  'login',['$rootScope','$q', function($rootScope,$q) {
    return function(user) {
      console.log('login');
      var deferred = $q.defer();
      $.couch.login({
	      name: user.username,
	      password: user.password,
	      success: function() {
		console.log('logged in');
		user.state.registered = true;
		$rootScope.$apply(function(){
		  deferred.resolve(user);
		});
	      },
              error: function() {
		console.log('failed to log in');
                $rootScope.$apply(function(){
		  deferred.reject({user:user,msg:'Error logging in, try again'});
		});
              }
	    });
      return deferred.promise;
    };
  }]);

//register a new user, and log in with that user if success.
mgChatCouchdbServices.factory(
  'register',['$rootScope','$q', function($rootScope,$q) {
    return function(user) {
      console.log('register');
      var deferred = $q.defer();
      var userdoc = {
	name: user.username,
	password: user.password,
	roles: [],
	type: "user",
	_id: "org.couchdb.user:" + user.username
      };
      $.couch.userDb(function(user_db) {
	user_db.saveDoc(userdoc, {
	  success: function(resp) {
	    console.log('registered new user');
	    $.couch.login({
	      name: user.username,
	      password: user.password,
	      success: function() {
		console.log('logged in');
		user.state.registered = true;
		$rootScope.$apply(function(){
		  deferred.resolve(user);
		});
	      },
              error: function() {
		console.log('failed to log in');
                $rootScope.$apply(function(){
		  deferred.reject({user:user,msg:'Error logging in, try again'});
		});
              }
	    });
	  },
	  error: function() { 
	    console.log('username taken');
	    user.username = '';
	    user.state.registered = false;
	    $rootScope.$apply(function(){
	      deferred.reject({user:user,msg:'Username taken, try again'});
	    });
	  }
	});
      });
      return deferred.promise;
    };
  }]);
//get a user's document by username
mgChatCouchdbServices.factory(
  'getUserDoc',['$rootScope','db','$q',function($rootScope,db,$q) {
    return function(user,async) {
      async = typeof(async) == 'undefined' ? true : async;
      console.log('getUserDoc');
      var deferred = $q.defer();
      db.openDoc(user.username, {
	success: function(user_doc) {
	  console.log('got user doc');
	  $rootScope.$apply(function(){
	    deferred.resolve(user_doc);
	  });
	},
	error: function(err) {
	  console.log('failed to get user doc');
	  $rootScope.$apply(function(){
	    deferred.reject('Error getting user document!');
	  });
	}
      }, {
	async: async
      });
      return deferred.promise;
    };
  }]);
// retrieve a user's document and update it with a new one. if failed, then create a new one.
mgChatCouchdbServices.factory(
  'updateUserDoc',['$rootScope','db','getUserDoc','$q',function($rootScope,db,getUserDoc,$q) {
    return function(user) {
      console.log('updateUserDoc');
      var user_doc, deferred = $q.defer();
      getUserDoc(user).then(function(doc) {
	console.log('got user doc, updating it');
	user_doc = doc;
	if (user_doc.rooms.indexOf(user.room) === -1)
	  user_doc.rooms.push(user.room);
	if (user_doc.left.indexOf(user.room) !== -1)
	  user_doc.left.splice(user_doc.left.indexOf(user.room),1);
	user_doc.key = user.pubkey;
	saveUserDoc();
      }, function() {
	console.log('failed to get user doc, creating one');
	user_doc = {
	  _id: user.username,
	  type: "USER",
	  rooms: [user.room],
	  left: [],
	  key: user.pubkey
	};
	saveUserDoc();
      });
      function saveUserDoc() {
        db.saveDoc(user_doc, {
	  success: function(resp) {
	    console.log('saved user doc');
	    $rootScope.$apply(deferred.resolve);
	  },
	  error: function(err) {
	    console.log('failed to save user doc');
	    $rootScope.$apply(function(){
	      deferred.reject('error updating user document!');
	    });
	  }
        });
      }
      return deferred.promise;
    };
  }]);

mgChatCouchdbServices.value('msgQueue',[]);
//get message of the day.
mgChatCouchdbServices.factory(
  'getMOTD',['$rootScope','db','$q',function($rootScope,db,$q) {
    return function() {
      var deferred = $q.defer();
      db.openDoc("motd", {
	success: function(resp) {
	  $rootScope.$apply(function(){
	    $deferred.resolve(resp.motd);
	  });
	}
      });
      return deferred.promise;
    };
  }]);
//get message list for username in room, from firstMsg to lastMsg
mgChatCouchdbServices.factory(
  'getMsgs',['$rootScope','db','path','$q',function($rootScope,db,path,$q) {
    // TODO: pass list of blocked users to server, so don't receive msgs from blocked users
    return function(room,username,firstMsg,lastMsg) {
      var deferred = $q.defer();
      db.view(path.design + '/msgs', {
	startkey: [username,room,firstMsg],
	endkey: [username,room,lastMsg],
	success: function(resp) {
	  $rootScope.$apply(function() {
	    deferred.resolve(resp);
	  });
	},
	error: function(err) {
	  $rootScope.$apply(function(){
	    deferred.reject(err);
	  });
	}
      });
      return deferred.promise;
    };
  }]);
//queue messages to send.
mgChatCouchdbServices.factory(
  'queueMsg',['msgQueue','postQueue',function(msgQueue,postQueue) {
    return function(plaintext,recipients,username,room,priority) {
      var doc, to = username, msg = {};
      angular.forEach(recipients, function(user, name) {
	  if (!room && name != username)
	    to = name;
	  if (!user.blocksend) {
	    var crypt = Crypto.AES.encrypt(plaintext,
	      Crypto.util.hexToBytes(user.seckey.substring(0, 64)), {
		mode: new Crypto.mode.CBC(Crypto.pad.iso10126)
	      });
	    msg[name] = {
	      msg: crypt,
	      hmac: Crypto.HMAC(Whirlpool, crypt, user.seckey.substring(64, 128))
	    };
	  }
	});
      if (!room) {
	doc = {
	  type: 'IM',
	  from: username,
	  to: to,
	  message: msg
	};
      } else {
	doc = {
	  type: 'MSG',
	  room: room,
	  nick: username,
	  message: msg
	};
      }
      if (priority) {
	postMsg(doc,false);
      } else {
        msgQueue.push(doc);
        postQueue.post();
      }
    };
  }]);
//post message to couchdb server.
mgChatCouchdbServices.factory(
  'postMsg',['path','$q','$rootScope',function(path,$q,$rootScope) {
    return function(msg,async) {
      var deferred = $q.defer();
      async = typeof(async) == 'undefined' ? true : async;
      $.ajax({
	url: '//' + document.location.host + '/' + path.pathArray[1] + '/_design/' + path.design + '/_update/chatitem',
	type: 'POST',
	data: JSON.stringify(msg),
	async: async,
	success: function() {
	  $rootScope.$apply(deferred.resolve);
	},
	error: function() {
	  $rootScope.$apply(deferred.reject);
	}
      });
      return deferred.promise;
    };
  }]);

//post first message of message queue
mgChatCouchdbServices.factory(
  'postQueue',['msgQueue','postMsg',function(msgQueue,postMsg) {
    return {
      post: function() {
        postMsg(msgQueue[0]).then(function() {
	  msgQueue.splice(0, 1);
	  if (msgQueue[0])
	    this.post();
	}, function() {
	  $timeout(this.postQueue,1000);
	});
      }
    };
  }]);
//logout from couchdb
mgChatCouchdbServices.factory(
  'logout',['db','getUserDoc',function(db,getUserDoc) {
    return function(user,recipients,room, callback) {
      if (user.state.upToDate) {
	db.openDoc(user.username, {
	  success: function(user_doc) {
	    user_doc.rooms.splice(user_doc.rooms.indexOf(room),1);
	    user_doc.left.push(room);
	    db.saveDoc(user_doc, {
	      success: function() {
		typeof callback == "function" && callback();
	      }
	    });
	  }
	}, {
	  async:false
        });
      }
    };
  }]);

/* TODO: 
	hide messages from blocked users
      */