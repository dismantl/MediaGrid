var username;
var room = "default";
var tag = 0;
var queue = [];
var postreq = 0;
var getreq = 0;
var users = [];
var lastmsg = 0;

startup();

function startup() {
	$.ajax({
		url: window.location,
		type: "POST",
		data: "startup=",
		success: function (response) {
			if (response === 'notregistered') {
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
			} else {
				$('#popup').show();
				users = response['users'];
				lastmsg = response['time'];
				username = response['username'];
				$.each(users, function (i, val) {
					$('<p>' + val + '</p>').appendTo('#users').addClass(val);
					if (val == username) {
						$('.' + val).addClass('myname');
					}
				});
				$('#inputbox').focus();
				getMsg(); //let's get jiggy with it
			}
		},
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			setTimeout('startup();', 1000);
		}
	});
}

function register() {
	if (!$('#name').val().match(/^[0-9a-z]+$/)) {
		$('#name').val('letters & numbers only!');
		$('#name').focus().select();
	} else {
		//send username to server
		$.ajax({
			url: window.location,
			type: "POST",
			data: "t=register&username=" + $('#name').val(), // + "&room=" + room,
			success: function (response) {
				if (response === "inuse") {
					$('#name').val('Username taken, try again').select();
				} else {
					username = $('#name').val();
					$('#name, #okay').off();
					$('#fullscreen').fadeOut('fast', function () {
						$(this).removeClass('register');
					});
					$('#inputbox').focus();
					$('#users').show(0);
					$('#messages').css('width', '500px');
					users = response['users'];
					$.each(users, function (i, val) {
						$('<p>' + val + '</p>').appendTo('#users').addClass(val);
					});
					lastmsg = response['time'];
					getMsg(); //let's get jiggy with it

				}
			}
		});
	}
}

//long-poll for messages
function getMsg() {
	getreq = $.ajax({
		type: "POST",
		url: window.location,
		data: 'msgtime=' + lastmsg + '&room=' + room,
		async: true,
		//timeout: 30000,
		success: function (msgs) {
			$.each(msgs, function (i, val) {
				if ('join' in val) {
					users.push(val['join']);
					addLine(ich.newuser(val));
					$('<p>' + val['join'] + '</p>').appendTo('#users').addClass(val['join']);
					if (val['join'] === username) {
						$('.' + username).addClass('myname');
					}
				} else if ('left' in val) {
					users.splice(users.indexOf(val['left']), 1);
					addLine(ich.userleft(val));
					$('.' + val['left']).remove();
				} else if ('nick' in val) {
					users.splice(users.indexOf(val['old']), 1);
					$('.' + val['old']).remove();
					users.push(val['nick']);
					addLine(ich.newnick(val));
					$('<p>' + val['nick'] + '</p>').appendTo('#users').addClass(val['nick']);
					if (val['old'] === username) {
						username = val['nick'];
						$('.' + username).addClass('myname');
					}
				} else if ('motd' in val) {
					addLine('<div class="line">Announcement: ' + val['motd'] + '</div>');
				} else {
					addLine(ich.chatline(val));
				}
				$('#messages').animate({
					scrollTop: document.getElementById('messages').scrollHeight + 20
				}, 600);
			});
			lastmsg = msgs[msgs.length - 1]["epoch"];
			getMsg();
		},
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			setTimeout('getMsg();', 1000);
		},
	});
}

function queueMsg(msg) {
	$('#inputbox').val('').focus();
	msg = msg.replace(/;/g, '%3B').replace(/\&/g, '%26');
	if (msg !== '') {
		if (users.length != 1) {
			queue.push(msg);
			if (!postreq) {
				postreq = 1;
				postMsg();
			}
		} else {
			//if no other users in room, append message to list without sending to server (lonely, isn't it?)
			msg = {
				epoch: '',
				time: new Date().toTimeString().substr(0, 8),
				user: username,
				text: msg
			}
			addLine(ich.chatline(msg));
			$('#messages').animate({
				scrollTop: document.getElementById('messages').scrollHeight + 20
			}, 600);
		}
	}
}

function postMsg() {
	$.ajax({
		url: window.location,
		type: "POST",
		//data: 'username=' + username + '&room=' + room + '&msg=' + queue[0],
		data: 'room=' + room + '&msg=' + queue[0],
		success: function (response) {
			queue.splice(0, 1);
			if (queue[0]) {
				postMsg();
			} else {
				postreq = 0;
			}
		},
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			setTimeout('postMsg();', 1000);
		}
	});
}

function joinRoom() {
	var tojoin = $('#name').val();
	$.ajax({
		url: window.location,
		type: 'POST',
		async: true,
		//data: 't=join&new=' + tojoin + '&username=' + username + '&room=' + room,
		data: 't=join&new=' + tojoin + '&room=' + room,
		success: function (response) {
			$('#messages').empty();
			$('#users').empty();
			room = tojoin;
			$('#name, #okay, #cancel').off();
			$('#fullscreen').fadeOut('fast', function () {
				$(this).removeClass('joinroom');
			});
			$('#inputbox').focus();
			addLine('<div class="line">Joined room: ' + room + '</div>');
			users = response['users'];
			$.each(users, function (i, val) {
				$('<p>' + val + '</p>').appendTo('#users').addClass(val);
				if (val == username) {
					$('.' + val).addClass('myname');
				}
			});
			lastmsg = response['time'];
			getreq.abort();
		},
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			$('#name').val('Error joining room, try again.').select();
		}
	});
}

function newRoom() {
	$.ajax({
		url: window.location,
		type: 'POST',
		async: true,
		//data: 't=mkdir&username=' + username + '&room=' + room,
		data: 't=mkdir&room=' + room,
		success: function (response) {
			$('#menu').hide();
			$('#messages').empty();
			$('#users').empty();
			room = response['room'];
			addLine('<div class="line">Joined room: ' + room + '</div>');
			$('#fullscreen').addClass('newroom');
			$('#name').val(room);
			$('#popupmsg').html('Give this room ID to others to allow them to join:');
			$('#fullscreen').fadeIn('fast', function () {
				$('#name').focus().select();
			});
			$('#okay').click(function () {
				$('#fullscreen').fadeOut('fast', function () {
					$('#fullscreen').removeClass('newroom');
					$('#inputbox').focus();
				});
			});
			lastmsg = response['time'];
			getreq.abort();
		},
		error: function (XMLHttpRequest, textStatus, errorThrown) {
			$('#menu').hide();
			errorPopup('Error creating new room: ' + errorThrown, 'newroom');
		}
	});
}

function changeNick() {
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
}

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

function logout() {
	getreq.abort();
	$.ajax({
		url: window.location,
		type: 'POST',
		async: false,
		//data: 't=logout&username=' + username + '&room=' + room,
		data: 't=logout&room=' + room,
		/*success: function(response) {
		    document.cookie = 'TWISTED_SESSION=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
		}*/
	});
}

function addLine(line) {
	if (tag === 'line-odd') {
		tag = 'line-even';
	} else {
		tag = 'line-odd';
	}
	$(line).appendTo('#messages').addClass(tag);
}


$('#inputbox').keyup(function (e) {
	if (e.keyCode == 13) {
		queueMsg($.trim($(this).val()));
	}
});

$('#send').click(function () {
	queueMsg($.trim($('#inputbox').val()));
});


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


$('#changename').click(function () {
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
});

$('#newroom').click(function () {
	newRoom();
});

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


$(window).unload(logout);


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

function tagify(line) {
	var mime = new RegExp('(data:(application\/((x-compressed)|(x-zip-compressed)|(zip)))|(multipart\/x-zip))\;base64,(\\w|\\/|\\+|\\=|\\s)*');
	line = line.replace(/</g,'&lt;').replace(/>/g,'&gt;');
	if ((match = line.match(/((mailto\:|(news|(ht|f)tp(s?))\:\/\/){1}\S+)/gi)) && genurl) {
		for (mc = 0; mc <= match.length - 1; mc++) {
			var sanitize = match[mc].split('');
			for (ii = 0; ii <= sanitize.length-1; ii++) {
				if (!sanitize[ii].match(/\w|\d|\:|\/|\?|\=|\#|\+|\,|\.|\&|\;|\%/)) {
					sanitize[ii] = encodeURIComponent(sanitize[ii]);
				}
			}
			sanitize = sanitize.join('');
			line = line.replace(sanitize, '<a target="_blank" href="' + '?redirect=' + escape(sanitize) + '">' + match[mc] + '</a>');
		}
	}
	else {
		line = line.replace(/(\s|^)(:|=)-?3(?=(\s|$))/gi, ' <div class="emoticon" id="e_cat">$&</div> ');
		line = line.replace(/(\s|^)(:|=)-?'\((?=(\s|$))/gi, ' <div class="emoticon" id="e_cry">$&</div> ');
		line = line.replace(/(\s|^)(:|=)-?o(?=(\s|$))/gi, ' <div class="emoticon" id="e_gasp">$&</div> ');
		line = line.replace(/(\s|^)(:|=)-?D(?=(\s|$))/gi, ' <div class="emoticon" id="e_grin">$&</div> ');
		line = line.replace(/(\s|^)(:|=)-?\((?=(\s|$))/gi, ' <div class="emoticon" id="e_sad">$&</div> ');
		line = line.replace(/(\s|^)(:|=)-?\)(?=(\s|$))/gi, ' <div class="emoticon" id="e_smile">$&</div> ');
		line = line.replace(/(\s|^)-_-(?=(\s|$))/gi, ' <div class="emoticon" id="e_squint">$&</div> ');
		line = line.replace(/(\s|^)(:|=)-?p(?=(\s|$))/gi, ' <div class="emoticon" id="e_tongue">$&</div> ');
		line = line.replace(/(\s|^)(:|=)-?(\/|s)(?=(\s|$))/gi, ' <div class="emoticon" id="e_unsure">$&</div> ');
		line = line.replace(/(\s|^);-?\)(?=(\s|$))/gi, ' <div class="emoticon" id="e_wink">$&</div> ');
		line = line.replace(/(\s|^);-?\p(?=(\s|$))/gi, ' <div class="emoticon" id="e_winktongue">$&</div> ');
		line = line.replace(/(\s|^)\^(_|\.)?\^(?=(\s|$))/gi, ' <div class="emoticon" id="e_yay">$&</div> ');
		line = line.replace(/(\s|^)(:|=)-?x\b(?=(\s|$))/gi, ' <div class="emoticon" id="e_shut">$&</div> ');
		line = line.replace(/(\s|^)\&lt\;3\b(?=(\s|$))/g, ' <span class="monospace">&#9829;</span> ');
	}
	thisnick = line.match(/^[a-z]{1,12}/).toString();
	if (match = line.match(/^[a-z]{1,12}/)) {
		var atmatch = line.match(/^[a-z]{1,12}:\s\@[a-z]{1,12}/);
		if (atmatch && jQuery.inArray(atmatch.toString().substring(thisnick.length + 3), names) >= 0 &&
		(atmatch.toString().substring(thisnick.length + 3) === nick || thisnick === nick)) {
			line = line.replace(/^[a-z]{1,12}\:\s\@[a-z]{1,12}/, '<span class="nick">' + thisnick + ' <span class="blue">&gt;</span> ' +
			atmatch.toString().substring(thisnick.length + 3) + '</span>');  
			if (match = line.match(/data:image\/\w+\;base64,(\w|\\|\/|\+|\=)*$/)) {
				line = line.replace(/data:image\/\w+\;base64,(\w|\\|\/|\+|\=)*/, '<a onclick="display(\'' + match[0] + '\', \'' + getstamp(5) + '\', 1)">view encrypted image</a>');
			}
			else if (match = line.match(mime)) {
				line = line.replace(mime, '<a onclick="display(\'' + match[0] + '\', \'' + getstamp(5) + '\', 0)">download encrypted .zip file</a>');
			}
		}
		else {
			var stamp = getstamp(match[0]);
			line = line.replace(/^[a-z]{1,12}:/, '<span class="nick" onmouseover="this.innerHTML = \'' +
			stamp + '\';" onmouseout="this.innerHTML = \'' + match[0] + '\';">' + match[0] + '</span>');
		}
	}
	return line;
}

function process(line, sentid) {
	if (line) {
		if (sentid) {
			line = tagify(line);
			pushline(line, sentid);
			return;
		}
		else if (match = line.match(/^[a-z]{1,12}\:\s\[:3\](\w|\/|\+|\?|\=)*\|(\d|a|b|c|d|e|f){128}\[:3\]$/)) {
			thisnick = $.trim(match[0].match(/^[a-z]{1,12}/));
			match = line.match(/\[:3\](.*)\|/);
			match = match[0].substring(4, match[0].length - 1);
			var hmac = line.match(/\|\w{128}/);
			hmac = hmac[0].substring(1);
			line = line.replace(/\|\w{128}/, '');
			if ((Crypto.HMAC(Whirlpool, match, seckeys[thisnick].substring(64, 128) + seq_r[thisnick]) !== hmac)) {
				if (jQuery.inArray(thisnick, inblocked) < 0) {
					line = line.replace(/\[:3\](.*)\[:3\]/, '<span class="diffkey">Error: message authentication failure.</span>');
					pushline(line, pos);
					$('#' + pos).css('background-image', 'url("img/error.png")');
				}
			}
			else {
				seq_r[thisnick]++;
				match = Crypto.AES.decrypt(match, Crypto.util.hexToBytes(seckeys[thisnick].substring(0, 64)), {
					mode: new Crypto.mode.CBC(Crypto.pad.iso10126)
				});
				if (jQuery.inArray(thisnick, inblocked) < 0) {
					line = line.replace(/\[:3\](.*)\[:3\]/, match);
					line = tagify(line);
					pushline(line, pos);
					if (sound) {
						soundPlay('snd/msg_get.webm');
					}
					if ($("#" + pos).html().match(/data:(\w|\\|\/|\,|\;|\+|\=)*\<\/a\>\<\/div\>$/)) {
						$("#" + pos).css('background-image', 'url("img/fileb.png")');
					}
				}
				return [thisnick, line.match(/<\/span>.+$/).toString().substring(8)];
			}
		}
		else if (match = line.match(/^(\&gt\;|\&lt\;)\s[a-z]{1,12}\s(has arrived|has left)$/)) {
			getkeys(true);
			if (sound) {
				if (line.match(/^(\&gt\;|\&lt\;)\s[a-z]{1,12}\shas arrived$/)) {
					soundPlay('snd/user_join.webm');
				}
				else if (line.match(/^(\&gt\;|\&lt\;)\s[a-z]{1,12}\shas left$/)) {
					soundPlay('snd/user_leave.webm');
				}
			}
			line = '<span class="nick">' + match[0] + '</span>';
			pushline(line, pos);
			$("#" + pos).css('background-image', 'url("img/user.png")');
			line = match[0].toString().substring(5);
			return [line.match(/^\w+/).toString(), line];
		}
		else {
			thisnick = $.trim(match[0].match(/^[a-z]{1,12}/));
			if (jQuery.inArray(thisnick, inblocked) < 0) {
				line = '<span class="diffkey">Error: invalid message received.</span>';
				pushline(line, pos);
				$('#' + pos).css('background-image', 'url("img/error.png")');
			}
		}
	}
	return;
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
//touchscreen slide for messagebox scrolling in mobile client (so no need for scrollbars)
//ideas:
//only one AJAX request at a time (like cryptocat)
//get message posting confirmation from server
//add anchors to links in messages