'use strict';

var mgChatFilters = angular.module('mgChat.filters', []);
  
mgChatFilters.value('msg_map',[]);

// TODO block against blocked users list elsewhere
mgChatFilters.filter('decrypt', ['msg_map',function(msg_map) {
  return function(msg,users,username) {
    if (msg.announcement) return msg.message;
    var plaintext;
    if (msg_map[msg.message[username].msg]) {
      plaintext = msg_map[msg.message[username].msg];
    } else {
      if (!users[msg.from ? msg.from : msg.nick]) {
	// TODO: set undecipherable flag on msg, which will hide the whole line in the markup
	return '';
      } else {
	var cipher_text = msg.message[username].msg;
	plaintext = msgDecrypt(msg.from ? msg.from : msg.nick, msg.message);
	if (plaintext) msg_map[cipher_text] = plaintext;
      }
    }

    return plaintext;
    
    function msgDecrypt(sender, recv) {
      if (recv[username]) {
	var msg = recv[username].msg;
	var hmac = recv[username].hmac;
	if (Crypto.HMAC(Whirlpool, msg, users[sender].seckey.substring(64, 128)) === hmac) {
	  if (msg.match(/^(\w|\/|\+|\?|\=)*$/) && hmac.match(/^(\d|a|b|c|d|e|f){128}$/)) {
	    console.log('3');
	    msg = Crypto.AES.decrypt(msg, Crypto.util.hexToBytes(users[sender].seckey.substring(0, 64)), {
	      mode: new Crypto.mode.CBC(Crypto.pad.iso10126)
	    });
	    return msg;
	  }
	}
      }
      console.log('error decrypting message!');
      return '';
    }
  };
}]);
