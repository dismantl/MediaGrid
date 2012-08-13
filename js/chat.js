var username;
var room="default";
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
    success: function(response) {
	if (response === 'notregistered') {
	    $('#messages').css('width','600px');
	    $('#users').hide();
	    $('#fullscreen').show().addClass('register');
	    $('#popup').fadeIn('slow', function() {
		    $('#name').attr('maxLength',10).focus().select();
	    });
	    
	    $('#name').keyup(function(e) {
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
	    $.each(users, function(i, val) {
		$('<p>' + val + '</p>').appendTo('#users').addClass(val);
		if (val == username) {
		    $('.' + val).addClass('myname');
		}
	    });
	    $('#inputbox').focus();
	    getMsg(); //let's get jiggy with it
	}
    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
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
			data: "t=register&username=" + $('#name').val(),// + "&room=" + room,
			success: function(response) {
				if (response === "inuse") {
					$('#name').val('Username taken, try again').select();
				}
				else {
					username = $('#name').val();
					$('#name, #okay').off();
					$('#fullscreen').fadeOut('fast', function() {$(this).removeClass('register');});
					$('#inputbox').focus();
					$('#users').show(0);
					$('#messages').css('width','500px');
					users = response['users'];
					$.each(users, function(i, val) {
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
		data: 'msgtime='+lastmsg+'&room='+room,
		async: true,
		timeout:30000,
		success: function(msgs) {
			$.each(msgs, function(i, val) {			
				if ('join' in val) {
					users.push(val['join']);
					addLine(ich.newuser(val));
					$('<p>' + val['join'] + '</p>').appendTo('#users').addClass(val['join']);
					if (val['join'] === username) {
					    $('.' + username).addClass('myname');
					}
				} else if ('left' in val) {
					users.splice(users.indexOf(val['left']),1);
					addLine(ich.userleft(val));
					$('.' + val['left']).remove();
				} else if ('nick' in val) {
					users.splice(users.indexOf(val['old']),1);
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
				$('#messages').animate({scrollTop: document.getElementById('messages').scrollHeight + 20}, 600);
			});
			lastmsg = msgs[msgs.length-1]["epoch"];
			getMsg();
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
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
			msg = { epoch: '', time: new Date().toTimeString().substr(0,8), user: username, text: msg }
			addLine(ich.chatline(msg));
			$('#messages').animate({scrollTop: document.getElementById('messages').scrollHeight + 20}, 600);
		}
	}
}

function postMsg() {
	$.ajax({
		url: window.location,
		type: "POST",
		//data: 'username=' + username + '&room=' + room + '&msg=' + queue[0],
		data: 'room=' + room + '&msg=' + queue[0],
		success: function(response) {
			queue.splice(0, 1);
			if (queue[0]) { postMsg(); }
			else { postreq = 0; }
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
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
		success: function(response) {
			$('#messages').empty();
			$('#users').empty();
			room = tojoin;
			$('#name, #okay, #cancel').off();
			$('#fullscreen').fadeOut('fast', function() {$(this).removeClass('joinroom');});
			$('#inputbox').focus();
			addLine('<div class="line">Joined room: ' + room + '</div>');
			users = response['users'];
			$.each(users, function(i, val) {
				$('<p>' + val + '</p>').appendTo('#users').addClass(val);
				if (val == username) {
				    $('.' + val).addClass('myname');
				}
			});
			lastmsg = response['time'];
			getreq.abort();
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
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
		success: function(response) {
			$('#menu').hide();
			$('#messages').empty();
			$('#users').empty();
			room = response['room'];
			addLine('<div class="line">Joined room: ' + room + '</div>');
			$('#fullscreen').addClass('newroom');
			$('#name').val(room);
			$('#popupmsg').html('Give this room ID to others to allow them to join:');
			$('#fullscreen').fadeIn('fast', function() {
				$('#name').focus().select();
			});
			$('#okay').click(function() {
				$('#fullscreen').fadeOut('fast', function() {
					$('#fullscreen').removeClass('newroom');
					$('#inputbox').focus();
				});
			});
			lastmsg = response['time'];
			getreq.abort();
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
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
			success: function(response) {
				if (response === 'inuse') {
					$('#name').val('Username taken, try again').select();
				} else {
					username = nick;
					$('#name, #okay, #cancel').off();
					$('#fullscreen').fadeOut('fast', function() {$(this).removeClass('changename');});
					$('#inputbox').focus();
				}
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
				errorPopup('Error changing username: ' + errorThrown, 'changename');
			}
		});
	}
}

function errorPopup(msg, type) {
	$('#popupmsg').html(msg);
	$('#fullscreen').removeClass(type).addClass('alert').fadeIn('fast');
	$('#okay').off().click(function() {
		$('#okay').off();
		$('#fullscreen').fadeOut('fast', function() {$(this).removeClass('alert');});
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
	if (tag === 'line-odd') { tag = 'line-even'; } else { tag = 'line-odd'; }
	$(line).appendTo('#messages').addClass(tag);
}


$('#inputbox').keyup(function(e) {
        if (e.keyCode == 13) {
		queueMsg($.trim($(this).val()));
	}
});

$('#send').click(function() {
	queueMsg($.trim($('#inputbox').val()));
});


$('#joinroom').click(function() {
	$('#menu').hide();
	$('#name').val('');
	$('#popupmsg').html('Enter room ID to join:');
	$('#fullscreen').addClass('joinroom').fadeIn('fast', function() {
		$('#name').focus().select().attr('maxLength','100');
	});
	$('#okay').click(function() {
		joinRoom();
	});
	$('#name').keyup(function(e) {
        	if (e.keyCode == 13) {
			joinRoom();
		}
	});
	$('#cancel').click(function() {
		$('#name, #okay, #cancel').off();
		$('#fullscreen').fadeOut('fast', function() {$(this).removeClass('joinroom');});
		$('#inputbox').focus();
	});
});


$('#changename').click(function() {
	$('#menu').hide();
	$('#name').val(username);
	$('#popupmsg').html('Enter new username:');
	$('#fullscreen').addClass('changename').fadeIn('fast', function() {
		$('#name').focus().select().attr('maxLength','10');;
	});
	$('#okay').click(function() {
		changeNick();
	});
	$('#name').keyup(function(e) {
        	if (e.keyCode == 13) {
			changeNick();
		}
	});
	$('#cancel').click(function() {
		$('#name, #okay, #cancel').off();
		$('#fullscreen').fadeOut('fast', function() {$(this).removeClass('changename');});
		$('#inputbox').focus();
	});
});

$('#newroom').click(function() {
	newRoom();
});

$('#options').click(function() {
	$('#menu').css({'right':0, 'bottom':$('#options').height()}).show('slide', {direction: 'down'}, 'fast');
});

$('html').click(function(event) {
	if (!$(event.target).is('#options')) {
	        $('#menu').hide();
	}
});

$('#menu').click(function(event){
     event.stopPropagation();
});


$(window).unload(logout);


//TODO:
//touchscreen slide for messagebox scrolling in mobile client (so no need for scrollbars)
//ideas:
	//only one AJAX request at a time (like cryptocat)
	//get message posting confirmation from server
	//add anchors to links in messages
