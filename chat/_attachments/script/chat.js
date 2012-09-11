$(function() {   

var shift = true,
  changesRunning = false,
  allSet = false,
  username,
  password = "",
  tag = 0,
  queue = [],
  users = {},
  msg_map = {},
  lastmsg = 0,
  motd,
  maxinput = 256,
  seed = Math.seedrandom(),
  z = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4096, 0],
  prikey = pubkey = 0;

var path = unescape(document.location.pathname).split('/'),
        design = path[3],
        db = $.couch.db(path[1]),
	room = getParameterByName("room") || "default",
	enc = (room === "default") ? false : true;

$.couch.session({
  success: function(resp) {
    if (resp.userCtx.name) {
      //already registered
      username = resp.userCtx.name;
      db.openDoc(username, {
	success: function(user_doc) {
	  if (enc && !user_doc.pubkey) {
	    createUserDoc(username);
	    return;
	  }
	  if (user_doc.rooms.indexOf(room) === -1) {
	    user_doc.rooms.push(room);
	    db.saveDoc(user_doc, {
	      error: function() {
		alert('Error registering room!');
	      },
	      success: function() {
		getStarted();
	      }
	    });
	  } else {
	    getStarted();
	  }
	},
	error: function() {
	  createUserDoc();
	}
      });
    } else {
      //need to register
      $('#messages').css('width', '600px');
      $('#users').hide();
      $('#fullscreen').show().addClass('register');
      $('#popup').fadeIn('slow', function () {
	$('#name').attr('maxLength', 10).focus().select();
      });
      $('#name').keyup(function (e) {
	if (e.keyCode == 13) {
	  register();
	}
      });
      $('#okay').click(register);
    }
  }
});

function register() {
	//create random password. for native clients, this will be be kept in persistent storage.
	//password = $.couch.newUUID();  <-- uncomment this for native apps
	if (!$('#name').val().match(/^[0-9a-z]+$/)) {
		$('#name').val('letters & numbers only!');
		$('#name').focus().select();
	} else {
		//send username to server
		var name = $('#name').val();
		var user = {
		  name: name,
		  password: password,
		  roles: [],
		  type: "user",
		  _id: "org.couchdb.user:" + name
		};
		$.couch.userDb(function(user_db) {
		  user_db.saveDoc(user, {
		    success: function(resp) {
		      createUserDoc(name);
		    },
		    error: function() { 
		      $('#name').val('Username taken, try again').select();
		    }
		  });
		});
	}
}

function createUserDoc(name) {
  name = name || username;
  if (!enc) {
    console.log('no encryption, skipping key creation');
    sendUserDoc(name);
    return;
  }
  //create personal keys		      
  $('#name, #okay').off();
  $('#fullscreen').fadeOut('fast', function () {
    $(this).removeClass('register');
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
      $('#popupmsg').html('Type on your keyboard as randomly as possible for a few seconds:' + 
      '<br /><input type="password" id="keytropy" />');
    }
    $('#fullscreen').addClass('keygen').fadeIn('fast', function() {
      if (Crypto.Fortuna.Ready()) {
	seeded();
      } else {
	var down, up, e;
	$('#keytropy').focus();
	$('#keytropy').keydown(function(event) {
	  if (Crypto.Fortuna.Ready() === 0) {
	    e = String.fromCharCode(event.keyCode);
	    var d = new Date();
	    down = d.getTime();
	  }
	});
	$('#keytropy').keyup(function() {
	  if (Crypto.Fortuna.Ready() === 0) {
	    var d = new Date();
	    up = d.getTime();
	    Crypto.Fortuna.AddRandomEvent(e + (up - down));
	  } else {
	    seeded();
	  }
	});
      }
    });  
  });
  
  function seeded() {
	$('#popupmsg').css('margin-top', '-=6px');
	$('#popupmsg').html("<br />Checking integrity");
	if (integritycheck()) {
		$('#popupmsg').html($('#popupmsg').html() + 
		'  &#160;<span class="blue">OK</span>' + '<br />Generating keys');
		prikey = gen(32, 0, 1).toString();
		pubkey = bigInt2str(ecDH(prikey), 64);
		$('#popupmsg').html($('#popupmsg').html() + ' &#160; &#160; ' + 
		'<span class="blue">OK</span><br />Communicating');
		sendUserDoc(name);
	}
	else {
		$('#popupmsg').html('<span class="red">Integrity check failed. Cryptocat cannot proceed safely.</span>');
	}
  }
  
}

function sendUserDoc(name) {
  name = name || username;
  var user_doc = {
    _id: name,
    type: "USER",
    rooms: [room]
  };
  if (enc) {
    user_doc.key = pubkey;
  }
  db.openDoc(name, {
    success: function(resp) {
      user_doc._rev = resp._rev;
      user_doc.rooms = resp.rooms;
      if (user_doc.rooms.indexOf(room) === -1) user_doc.rooms.push(room);
      save_doc();
    },
    error: function() {
      save_doc();
    }
  });
  
  function save_doc() {
    db.saveDoc(user_doc, {
      success: function(resp) {
	$.couch.login({
	  name: name,
	  password: password,
	  success: function() {
	    username = name;
	    $('#name').off();
	    $('#fullscreen').fadeOut('fast', function () {
	      $(this).removeClass('keygen');
	    });
	    $('#inputbox').focus();
	    $('#users').show(0);
	    $('#messages').css('width', '500px');
	    getStarted();
	  },
	  error: function() {
	    alert('Error logging in, try again');
	  }
	});
      },
      error: function() {
	alert('Error registering, try again');
      }
    });
  }
}

function getStarted() {
  textcounter();
  getUsers();
  checkUsers();
  function checkUsers() {
    if (users[username]) {
      queueMsg('* ' + username + ' has arrived');
      db.view(design + "/chatitems", {
	startkey: [room,"a"],
	endkey: [room,0],
	descending: true,
	success: function(resp) {
	  lastmsg = (resp.rows[0] === undefined) ? 0 : resp.rows[0].key[1];
	  $('#inputbox').focus();
	  allSet = true;
	  db.openDoc("motd", {
	    success: function(resp) {
	      motd = resp.motd;
	      getMsg();
	    },
	    error: getMsg
	  });
	},
	error: function() {
	  alert('error getting number of messages!');
	}
      });		
    } else {
      setTimeout(checkUsers,10);
    }
  }
}

function getUsers() {
  db.view(design + "/users", {
    key: room,
    success: function(resp) {
      var oldusers = jQuery.extend(true, {}, users); // deep copy the users object
      var userlines = [];
      var names = [];
      $.each(resp.rows, function (i, user) {
	var nick = user.value.nick;
	names.push(nick);
	if (!users[nick]) {
	  users[nick] = {
	    key: user.value.key,
	    seckey: (enc) ? Whirlpool(ecDH(prikey, str2bigInt(user.value.key, 64))) : 0
	  };
	}
	if (enc) {
	  var big = str2bigInt(users[nick].key, 64);
	  if ((equals(big, p25519) || greater(big, p25519) || greater(z, big)) || 
	  (users[nick].key !== user.value.key)) {
	    users[nick].fingerprint = '<span class="red">DANGER: This user is using suspicious keys.' + 
	    ' Communicating with this user is strongly not recommended.</span>';
	    alert('WARNING: ' + nick + ' sent a sketchy encryption key! Communicating with them is not recommended.');
	  } else {
	    users[nick].fingerprint = Whirlpool(nick + users[nick].key).substring(0, 22);
	    users[nick].fingerprint = bubbleBabble(Crypto.util.hexToBytes(users[nick].fingerprint));
	  }
	}
	user.value.class = (user.value.nick === username) ? user.value.nick + " myname" : user.value.nick;
	userlines.push(user.value);
      });
      $.each(oldusers, function(olduser, val) {
	if (names.indexOf(olduser) === -1) {
	  delete users[olduser];
	}
      });
      var them = $.mustache($("#user").html(), {
	users: userlines
      });
      $("#users").html(them);
    }
  });
}

function setupChanges(since) {
  if (!changesRunning) {
    var changeHandler = db.changes(since);
    changesRunning = true;
    changeHandler.onChange(getMsg);
  }
}

function msgDecrypt(sender, recv) {
  if (recv[username]) {
    var msg = recv[username].msg;
    var hmac = recv[username].hmac;
    if (Crypto.HMAC(Whirlpool, msg, users[sender].seckey.substring(64, 128)) === hmac) {
      if (msg.match(/^(\w|\/|\+|\?|\=)*$/) && hmac.match(/^(\d|a|b|c|d|e|f){128}$/)) {
	msg = Crypto.AES.decrypt(msg, Crypto.util.hexToBytes(users[sender].seckey.substring(0, 64)), {
	  mode: new Crypto.mode.CBC(Crypto.pad.iso10126)
	});
	return msg;
      }
    }
  }
  alert('error decrypting message!');
  return '';
}

function getMsg() {
  var startkey, endkey, viewname;
  if (enc) {
    viewname = "/privchat";
    startkey = [room,username,lastmsg];
    endkey = [room,username,"a"];
  } else {
    viewname = "/chatitems";
    startkey = [room,lastmsg];
    endkey = [room,"a"];
  }
  db.view(design + viewname, {
    startkey: startkey,
    endkey: endkey,
    update_seq: true,
    success: function(resp) {
      setupChanges(resp.update_seq);
      if (resp.rows.length === 1) {
	shift = false;
      }
      if (shift) { resp.rows.shift(); }
      var getusers = false;
      $.each(resp.rows, function(i, val) {
	if (enc) {
	  if (msg_map[val.value.message[username].msg]) {
	    val.value.message = msg_map[val.value.message[username].msg];
	  } else {
	    var cipher_text = val.value.message[username].msg;
	    val.value.message = msgDecrypt(val.value.nick, val.value.message);
	    msg_map[cipher_text] = val.value.message;
	  }
	}
	if (val.value.message.match(/^\*\s[a-z]{1,12}\s(has arrived|has left)$/)) {
	  getusers = true;
	  val.value.nick = '';
	  val.value.created_at = '';
	} else if (val.value.message.match(/^\*\s[a-z]{1,12}\sis now known as$/)) {
	  getusers = true;
	  val.value.nick = '';
	  val.value.created_at = '';
	} else {
	  val.value.nick = '&lt;' + val.value.nick + '&gt;';
	  val.value.created_at = new Date(val.value.created_at).toTimeString().substr(0, 8);
	}
      });
      if (getusers) getUsers();
      var data = resp.rows.map(function(r) {return r.value;});
      data.unshift({message: motd});
      var them = $.mustache($("#message").html(), {
	items : data
      });
      $("#messages").html(them);
      $("#messages div.line:nth-child(odd)").addClass("line-odd");
      $('#messages').animate({
	scrollTop: document.getElementById('messages').scrollHeight + 20
      }, 600);
    },
    error: function() {
      setTimeout(getMsg,1000);
    }
  });
}

function queueMsg(msg, encrypt, priority, async) {
  priority = priority || false;
  async = async || true;
  encrypt = (encrypt === undefined) ? enc : encrypt;
  $('#inputbox').val('').focus();
  textcounter();
  if (msg !== '') {
    if (encrypt) {
      var plaintext = msg;
      var msg = {};
      $.each(users, function(name, user) {
	var crypt = Crypto.AES.encrypt(plaintext,
	  Crypto.util.hexToBytes(user.seckey.substring(0, 64)), {
	    mode: new Crypto.mode.CBC(Crypto.pad.iso10126)
	  });
	msg[name] = {
	  msg: crypt,
	  hmac: Crypto.HMAC(Whirlpool, crypt, user.seckey.substring(64, 128))
	};
      });
    }
    var doc = {
      type: 'MSG',
      room: room,
      nick: username,
      created_at: new Date().getTime(),
      message: msg
    };
    if (priority) {
      queue.unshift(doc);
    } else {
      queue.push(doc);
    }
    postMsg(async);
  }
}

function postMsg(async) {
  async = async || true;
  db.saveDoc(queue[0], {
    async: async,
    success: function() {
      queue.splice(0, 1);
      if (queue[0]) {
	postMsg();
      }
    },
    error: function() {
      setTimeout(postMsg, 1000);
    }
  });
}

window.onbeforeunload = logout;
//$(window).unload(logout);  <-- chrome doesn't like this...

function logout() {
  if (allSet) {
    queueMsg('* ' + username + ' has left',enc,true,false);
    db.openDoc(username, {
      success: function(user_doc) {
	if (user_doc.rooms.length === 1) {
	  db.removeDoc(user_doc, {async: false});
	} else {
	  user_doc.rooms.splice(user_doc.rooms.indexOf(room),1);
	  db.saveDoc(user_doc, {async: false});
	}
      }
    }, {
      async: false
    });
  }
  return username;
}

function joinRoom() {
	var tojoin = $('#name').val();
	window.location = window.location.pathname + "?room=" + tojoin;
}

/*function changeNick() {
	var nick = $('#name').val();
	if (!$('#name').val().match(/^[0-9a-z]+$/)) {
		$('#name').val('letters & numbers only!');
		$('#name').focus().select();
	} else {
		$.ajax({
			url: window.location,
			type: 'POST',
			async: true,
			//data: 't=newnick&username=' + username + '&room=' + room + '&newnick=' + nick,
			data: 't=newnick&room=' + room + '&newnick=' + nick,
			success: function (response) {
				if (response === 'inuse') {
					$('#name').val('Username taken, try again').select();
				} else {
					username = nick;
					$('#name, #okay, #cancel').off();
					$('#fullscreen').fadeOut('fast', function () {
						$(this).removeClass('changename');
					});
					$('#inputbox').focus();
				}
			},
			error: function (XMLHttpRequest, textStatus, errorThrown) {
				errorPopup('Error changing username: ' + errorThrown, 'changename');
			}
		});
	}
}*/

function errorPopup(msg, type) {
	$('#popupmsg').html(msg);
	$('#fullscreen').removeClass(type).addClass('alert').fadeIn('fast');
	$('#okay').off().click(function () {
		$('#okay').off();
		$('#fullscreen').fadeOut('fast', function () {
			$(this).removeClass('alert');
		});
		$('#inputbox').focus();
	});
}

$('#inputbox').keydown(function (e) {
	textcounter();
	if (e.keyCode == 13) {
		queueMsg($.trim($(this).val()));
	}
});

$('#send').click(function () {
	queueMsg($.trim($('#inputbox').val()));
});

$('#send').mouseout(textcounter);


$('#send').mouseover(function(){
	$('#send').html('Send');
});

function textcounter() {
	var field = $("#inputbox");
	if ($(field).val().length > maxinput) {
		$(field).val($(field).val().substring(0, maxinput));
	}
	else {
		$("#send").html(maxinput - $(field).val().length);
	}
}

$('#joinroom').click(function () {
	$('#menu').hide();
	$('#name').val('');
	$('#popupmsg').html('Enter room ID to join:');
	$('#fullscreen').addClass('joinroom').fadeIn('fast', function () {
		$('#name').focus().select().attr('maxLength', '100');
	});
	$('#okay').click(function () {
		joinRoom();
	});
	$('#name').keyup(function (e) {
		if (e.keyCode == 13) {
			joinRoom();
		}
	});
	$('#cancel').click(function () {
		$('#name, #okay, #cancel').off();
		$('#fullscreen').fadeOut('fast', function () {
			$(this).removeClass('joinroom');
		});
		$('#inputbox').focus();
	});
});

/*$('#changename').click(function () {
	$('#menu').hide();
	$('#name').val(username);
	$('#popupmsg').html('Enter new username:');
	$('#fullscreen').addClass('changename').fadeIn('fast', function () {
		$('#name').focus().select().attr('maxLength', '10');;
	});
	$('#okay').click(function () {
		changeNick();
	});
	$('#name').keyup(function (e) {
		if (e.keyCode == 13) {
			changeNick();
		}
	});
	$('#cancel').click(function () {
		$('#name, #okay, #cancel').off();
		$('#fullscreen').fadeOut('fast', function () {
			$(this).removeClass('changename');
		});
		$('#inputbox').focus();
	});
});*/

$('#options').click(function () {
	$('#menu').css({
		'right': 0,
		'bottom': $('#options').height()
	}).show('slide', {
		direction: 'down'
	}, 'fast');
});

$('html').click(function (event) {
	if (!$(event.target).is('#options')) {
		$('#menu').hide();
	}
});

$('#menu').click(function (event) {
	event.stopPropagation();
});

function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)')
		    .exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

// CRYPTOCAT FUNCTIONS:
function integritycheck() {
	Math.seedrandom(str2bigInt(Crypto.HMAC(Whirlpool, Whirlpool('TaTWU55cBtxn65IP8KLD3GQjbrdQbhEo'), Whirlpool('UQ4rRqtvnFjoAQySIvoIMNLNpKeiW6fi')), 16).join(''));
	var testkey = Crypto.util.hexToBytes('744177635650617268753643526a6774775a3445353256584d72756d76725433');
	var testclear = 'A1695BD7CE297A4B8D84BD183A6F0C26F1D56BD12F025B3A07EB25AE60512F9A3A214130843C9479DBFD62E99D4BC151854D5C4A1C1603CCD889F618C0D2B096';
	var testbigint = bigInt2str(str2bigInt('2XQLlNpYbwIus4lHWwRmmcyTLhqIy2Mpe7woMkO54lcZeXGJ24F9Hvs=rYwPrBmL65JLnA71O3pDY9zXZ0qh2M', 64), 16);
	var testencrypt = Crypto.AES.encrypt(Whirlpool('TDqIfHBOvxoPGCRbbJAIqV3GoftvPZ2s'), Crypto.charenc.Binary.stringToBytes(gen(32, 1, 0)), {
		mode: new Crypto.mode.CBC(Crypto.pad.iso10126)});
	var testdecrypt = Crypto.AES.decrypt(testencrypt, testkey, {
		mode: new Crypto.mode.CBC(Crypto.pad.iso10126)});
	if (testdecrypt === testclear && testclear === testbigint) {
		Math.seedrandom(Crypto.Fortuna.RandomData(512) + Whirlpool(seed));
		return 1;
	}
	return 0;
}

function gen(size, extra, s) {
	if (s) {
		Math.seedrandom(Crypto.Fortuna.RandomData(512) + Whirlpool(seed));
	}
	var str = '';
	var charset = '123456789';
	if (extra) {
		charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	}
	str += charset.charAt(Math.floor(Math.random() * charset.length));
	charset += '0';
	while (str.length < size) {
		str += charset.charAt(Math.floor(Math.random() * charset.length));
	}
	return str;
}

function bubbleBabble(input) {
	var result = '';
	for (var i=0; i!=input.length; i++) {
		result += String.fromCharCode(input[i]);
	}
	input = result;
	var result = 'x';
	var consonants = 'bcdfghklmnprstvzx';
	var vowels = 'aeiouy';
	var babble = 1;
  	for (i=0;;i+=2) {
		if (i >= input.length) {
			result += vowels.charAt(Math.floor(babble%6)) + consonants.charAt(16) + vowels.charAt(Math.floor(babble/6));
			break;
		}
    	byte1 = input.charCodeAt(i);
    	result += vowels.charAt((((byte1>>6)&3)+babble)%6) + consonants.charAt((byte1>>2)&15) + vowels.charAt(((byte1&3) + (babble/6))%6);
		if (i+1 >= input.length) {
			break;
		}
		byte2 = input.charCodeAt(i+1);
		result += consonants.charAt((byte2>>4)&15) + '-' + consonants.charAt(byte2&15);
		babble = (babble*5+byte1*7+byte2) % 36;
	}
	result += 'x';
	return result;
}


//TODO:
//user info dialog box
//touchscreen slide for messagebox scrolling in mobile client (so no need for scrollbars)
//block communication to chosen users
//IM
//send encrypted files
//automatic links in messages
//only update last 10 messages when getMsg()
//use doc update handler to use server-size created_at timestamps, add pubkey when missing
});