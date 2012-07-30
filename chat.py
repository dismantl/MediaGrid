from twisted.web.resource import Resource
from twisted.web import server, http
from twisted.internet import task
from twisted.web.resource import ErrorPage
import requests
import json
from time import time, sleep, strftime, localtime

###### SETTINGS ######
host = '127.0.0.1:3456'   # host/port of local Tahoe server
port = 80   # port that MediaGrid is listening on
urlTemplate = 'http://' + host + '/uri'

cc = open('chatcap')
chatcap = cc.read()
cc.close()

class Chat(Resource):

    def __init__(self, sub=''):
        Resource.__init__(self)
	requests.put('%s/%s/users?t=mkdir' % (urlTemplate, chatcap))  # create chatroom file directory

    def render_GET(self, request):
	###### Handle AJAX long-polling by client ######
	if "msgtime" in request.args:
	    polltime = request.args["msgtime"][0]
	    room = (chatcap if request.args["room"][0] == 'default' else request.args["room"][0])
	    session = request.getSession()
	    loop = task.LoopingCall(self.poll, polltime, room, request, session.motd)
	    session.motd = False
	    d = loop.start(0.5)
	    def done(ignored):
		try:
		    loop.stop()
		except:
		    pass
	    d.addErrback(done)
 	    crap = request.notifyFinish()
	    crap.addBoth(lambda x: loop.stop())
	    return server.NOT_DONE_YET
	return open("chat.xml").read()

    def render_POST(self, request):
	room = (chatcap if request.args["room"][0] == 'default' else request.args["room"][0])
	username = request.args["username"][0]
	if len(username) > 10: raise Exception
	if len(room) > 90: raise Exception
	if "t" in request.args:
	    t = request.args["t"][0]

	    ###### Create private chatroom ######
	    if t == 'mkdir':
	        req = requests.put(urlTemplate + '?t=mkdir')
	        newroom = req.text
		now = self.switch_room(request, username, room, newroom)
		request.setHeader('Content-Type', 'application/json')
	        return json.dumps({'time':str(int(now) - 1), 'room':newroom})
	    ###### Change username ######
	    elif t == 'newnick':
		newnick = request.args['newnick'][0]
		if len(newnick) > 10: raise Exception
		try:
		    self.newUser(newnick)
		except:
		    return 'inuse'
		requests.delete('%s/%s/users/%s' % (urlTemplate, chatcap, username)) # delete user from global list of online users
		for itm in self.getDir(room):
	    	    if itm["name"].startswith('join.' + username):
			requests.delete('%s/%s/%s' % (urlTemplate, room, itm["name"]))
		now = time() * 1000
	    	requests.put('%s/%s/nick.%s.%s.%d' % (urlTemplate, room, newnick, username, now))
	    	requests.put('%s/%s/join.%s.0' % (urlTemplate, room, newnick))
		session = request.getSession()
		session.__dict__[room] = newnick
		return ''
	    ###### Logout user ######
	    elif t == 'logout':
	        if username != '':
		    requests.delete('%s/%s/users/%s' % (urlTemplate, chatcap, username)) # delete user from global list of online users
		    self.leave_room(request, username, room)
		    ###### TODO: if no users on server (no files in [chatcap]/users dir), change to new chatcap and unlink old chatcap
		    return ''
	    ###### Join private chatroom ######
	    elif t == 'join':
		newroom = request.args['new'][0]
		if len(newroom) > 90: raise Exception
		users = self.getUsers(newroom)
	        now = self.switch_room(request, username, room, newroom)
		request.setHeader('Content-Type', 'application/json')
	        return json.dumps({'time':str(int(now) - 1), 'users':users})
	    ###### New user ######
	    elif t == 'register':
		try:
		    self.newUser(username)
		except:
		    return 'inuse'
	        now = time() * 1000
	        users = self.getUsers(room)
	        requests.put('%s/%s/join.%s.%d' % (urlTemplate, room, username, now))
	        session = request.getSession()
	        session.__dict__[room] = username
		session.motd = True
	        request.setHeader('Content-Type', 'application/json')
	        return json.dumps({'time':str(int(now) - 1), 'users':users})
	else:
	    ##### Post message to chat #####
	    session = request.getSession()
	    try:
		sesuser = session.__dict__[room]
	    except:
		return 'error: user not registered'
	    if sesuser == username:  # make sure user is checked into room before allowing post
		msg = request.args["msg"][0].strip()
		if len(msg) > 512: raise Exception
		filename = '%d' % (time() * 1000)
		req = requests.put('%s/%s/%s' % (urlTemplate, room, filename), username + ':' + msg)
	        return ''
	    else:
		return 'error: passed username doesn\'t match registered username'    

    def poll(self, polltime, room, request, motd):
	msgs = []
	for itm in self.getDir(room):
	    firstpart = itm['name'][:4]
	    if firstpart == 'join' or firstpart == 'left':   # join room, leave room
		if itm['name'].rpartition('.')[2] > polltime:
		    msg = {'epoch': itm['name'].rpartition('.')[2], 'time': strftime("%H:%M:%S", localtime(int(itm['name'].rpartition('.')[2]) /1000)), firstpart: itm['name'].split('.')[1] }
		    msgs.append(msg)
	    elif firstpart == 'nick':  # change username
		if itm['name'].split('.')[3] > polltime:
		    msg = {'epoch': itm['name'].split('.')[3], 'time': strftime("%H:%M:%S", localtime(int(itm['name'].split('.')[3]) /1000)), 'nick': itm['name'].split('.')[1], 'old': itm['name'].split('.')[2] }
		    msgs.append(msg)
	    elif firstpart == 'user':
		pass
	    elif firstpart == 'motd':  # Message of the Day
		if motd:
		    req = requests.get('http://%s/file/%s' % (host,itm["readcap"]))
		    msg = { 'epoch':0,'motd':req.text }
		    msgs.append(msg)
	    else:  # all other messages
		if itm['name'] > polltime:
		    req = requests.get('http://%s/file/%s' % (host,itm["readcap"]))
		    msg = { 'epoch': itm["name"], 'time': strftime("%H:%M:%S", localtime(int(itm["name"]) /1000)), 'user': req.text.partition(':')[0], 'text': req.text.partition(':')[2] }
		    msgs.append(msg)
	if msgs:   # if we found newer messages, send them to client
	    msgs = sorted(msgs, key = lambda i: i["epoch"])
	    request.setHeader('Content-Type', 'application/json')
	    request.write(json.dumps(msgs))
	    request.finish()

    ###### get list of files from chatroom directory ######
    def getDir(self, room=chatcap):
	req = requests.get('%s/%s?t=json' % (urlTemplate,room))
	jstuff = json.loads(req.text)
	files = []
	for key, val in jstuff[1]['children'].iteritems():
	    if 'size' in val[1]:
		size = val[1]['size']
	    else:
		size = ''
	    temp = {'name': key, 'type': val[0], 'time': val[1]['metadata']['tahoe']['linkmotime'], 'readcap': val[1]['ro_uri'], 'size': size}
	    files.append(temp)
	return files

    def switch_room(self, request, username, old, new):
	now = time() * 1000
	requests.put('%s/%s/join.%s.%d' % (urlTemplate, new, username, now))  # will raise exception if room doesn't exist
	session = request.getSession()
	session.__dict__[new] = username  # 
	self.leave_room(request, username, old)
	return now

    def leave_room(self, request, username, room):
	for itm in self.getDir(room):
	    if itm["name"].startswith('join.' + username):
		requests.delete('%s/%s/%s' % (urlTemplate, room, itm["name"]))
		requests.put('%s/%s/left.%s.%d' % (urlTemplate, room, username, time() * 1000))
		session = request.getSession()
		del session.__dict__[room]

    def getUsers(self, room):
	users = []
	for itm in self.getDir(room):
	    if itm['name'][:4] == 'join':
	        users.append(itm['name'].split('.')[1])
	return users

    def newUser(self, nick):
	if nick.isalnum() == False:
	    raise Exception
	else:
	    nick = nick.strip().lower()
	for itm in self.getDir(chatcap + '/users'): # check if requested username already in global list of online users
	    if itm['name'] == nick: raise Exception
	requests.put('%s/%s/users/%s' % (urlTemplate, chatcap, nick)) # add user to global list of online users

resource = Chat()

##### TODO:
##### cron job to delete old chat messages or switch chatcaps?
##### store message in filename after time, e.g. '1234567.message goes here', instead of as file contents? (reduces number of requests to Tahoe)
