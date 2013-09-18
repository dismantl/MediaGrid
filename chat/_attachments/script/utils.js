'use strict';

var seed = Math.seedrandom(),
z = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4096, 0];

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
    	var byte1 = input.charCodeAt(i);
    	result += vowels.charAt((((byte1>>6)&3)+babble)%6) + consonants.charAt((byte1>>2)&15) + vowels.charAt(((byte1&3) + (babble/6))%6);
		if (i+1 >= input.length) {
			break;
		}
		var byte2 = input.charCodeAt(i+1);
		result += consonants.charAt((byte2>>4)&15) + '-' + consonants.charAt(byte2&15);
		babble = (babble*5+byte1*7+byte2) % 36;
	}
	result += 'x';
	return result;
}