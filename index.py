from pprint import pformat
from twisted.internet.protocol import Protocol
from pprint import pprint
from twisted.web.resource import Resource
from twisted.web.static import File
from twisted.internet import reactor, task
#from twisted.web import resource as resourcelib
from twisted.web import server
from twisted.web.template import Element, renderer, XMLFile, flatten, XMLString
from twisted.python.filepath import FilePath
from twisted.internet.defer import Deferred, DeferredList
import cgi
import json
import urllib2
import urllib
import requests
import tempfile
import re
import thread
from time import asctime, localtime, sleep
from twisted.web.client import getPage, Agent
from twisted.web.http_headers import Headers
#from pyfire.twistedx import producer
#from pyfire.twistedx import receiver

host = '127.0.0.1:3456'
port = 8080
urlTemplate = 'http://' + host + '/uri'

filetemp = XMLString(
    """
    <tr xmlns:t="http://twistedmatrix.com/ns/twisted.web.template/0.1" t:render="file" style="display:none">
      <td><t:slot name="type" /></td>
      <td><a><t:attr name="href"><t:slot name="fileurl" /></t:attr><t:slot name="filename" /></a></td>
      <td><t:slot name="size" /></td>
      <td><t:slot name="time" /></td>
      <td class="epoch" style="display:none"><t:slot name="epoch"/></td>
    </tr>
    """)

####### SETUP #######
try:
    wc = open('writecap')
    rc = open('readcap')
    writecap = wc.read()
    readcap = rc.read()
    wc.close()
    rc.close()
except IOError as e:
    data = '-----------------------------111716759037108290644131293\r\nContent-Disposition: form-data; name="t"\r\n\r\nmkdir\r\n-----------------------------111716759037108290644131293--\r\n'
    headers={'Content-Type': 'multipart/form-data; boundary=---------------------------111716759037108290644131293'}
    req = urllib2.Request(urlTemplate, data, headers)
    response = urllib2.urlopen(req)
    writecap = response.read()
    req = urllib2.Request('%s/%s?t=json' % (urlTemplate, writecap), None)
    response = urllib2.urlopen(req)
    jresp = json.load(response)
    readcap = jresp[1]['ro_uri']
    wc = open('writecap','w')
    wc.write(writecap)
    rc = open('readcap','w')
    rc.write(readcap)

writecap = 'URI:DIR2:424wp6cbitntu4y2wgd44ns54y:qw4fvjfavdissfi3v7twj22ull4ldrmp6qrnfi3k4iw2gyuxctya'
readcap = 'URI:DIR2-RO:adg3qmqgodh4nsklx3l5nm2q7a:qw4fvjfavdissfi3v7twj22ull4ldrmp6qrnfi3k4iw2gyuxctya'

url = urlTemplate + '/' + readcap

class FileTemp(Element):
    def __init__(self, value, sub):
        Element.__init__(self, loader=filetemp)
	#self.name = name
	self.value = value
	self.sub = sub

    @renderer
    def file(self, request, tag):
	for itm in sorted(self.value, key=lambda x: self.value[x][1]['metadata']['tahoe']['linkmotime'], reverse=True):
	#for key, val in self.value.iteritems():	
	    if self.value[itm][0] == 'filenode':
		yield tag.clone().fillSlots(type='FILE',
		    fileurl='http://%s:%s/?file=%s/@@named=/%s' % (request.getHost().host,port,self.value[itm][1]['ro_uri'],itm), 
		    filename=itm, 
		    size=str(self.value[itm][1]['size']),
		    time=asctime(localtime(self.value[itm][1]['metadata']['tahoe']['linkmotime'])),
		    epoch=str(self.value[itm][1]['metadata']['tahoe']['linkmotime']))
	    elif self.value[itm][0] == 'dirnode':
		yield tag.clone().fillSlots(type='DIR',
		    fileurl=('?dir=%s/%s' % (self.sub,itm) if self.sub != '' else '?dir=%s' % itm),
		    filename=itm + '/', 
		    size='-',
		    time=asctime(localtime(self.value[itm][1]['metadata']['tahoe']['linkmotime'])),
		    epoch=str(self.value[itm][1]['metadata']['tahoe']['linkmotime']))
	    #return tag

class DirListing(Element):
    def __init__(self, value, sub, leafs):
        Element.__init__(self, loader=XMLFile(open('template.xml')))
        #self.deferred = Deferred()
	self.value = value
	self.sub = sub
	self.leafs = leafs

    @renderer
    def form(self, request, tag):
	#tag.fillSlots(posturl='%s/%s/%s' % (urlTemplate, writecap, self.sub), whendone='http://%s:%s/?dir=%s' % (request.getHost().host, port, self.sub))
	tag.fillSlots(posturl='http://%s:%s/?dir=%s' % (request.getHost().host,port, self.sub), whendone=self.sub)
	return tag

    @renderer
    def current(self, request, tag):
	try:
	    return tag(self.leafs[len(self.leafs)-1])
	except:
	    return tag('')

    @renderer
    def breadcrumb(self, request, tag):
	if self.sub != '':
	    yield tag.clone().fillSlots(backurl='http://%s:%s/?dir=' % (request.getHost().host, port), backtext='Home')
	    for res in self.leafs[:len(self.leafs)-1]:	    
		yield tag.clone().fillSlots(backurl='/?dir=%s' % '/'.join(map(str, self.leafs[:self.leafs.index(res)+1])), backtext=res)
	else:
	    tag.fillSlots(backurl="", backtext='')

    @renderer
    def file(self, request, tag):	
	for itm in sorted(self.value[1]['children'], key=lambda x: self.value[1]['children'][x][1]['metadata']['tahoe']['linkmotime'], reverse=True):
	    if self.value[1]['children'][itm][0] == 'filenode':
		yield tag.clone().fillSlots(type='FILE',
		    fileurl='http://%s:%s/?file=%s/@@named=/%s' % (request.getHost().host,port,self.value[1]['children'][itm][1]['ro_uri'],itm), 
		    filename=itm, 
		    size=str(self.value[1]['children'][itm][1]['size']),
		    time=asctime(localtime(self.value[1]['children'][itm][1]['metadata']['tahoe']['linkmotime'])),
		    epoch=str(self.value[1]['children'][itm][1]['metadata']['tahoe']['linkmotime']))
	    elif self.value[1]['children'][itm][0] == 'dirnode':
		yield tag.clone().fillSlots(type='DIR',
		    fileurl=('?dir=%s/%s' % (self.sub,itm) if self.sub != '' else '?dir=%s' % itm),
		    filename=itm + '/', 
		    size='-',
		    time=asctime(localtime(self.value[1]['children'][itm][1]['metadata']['tahoe']['linkmotime'])),
		    epoch=str(self.value[1]['children'][itm][1]['metadata']['tahoe']['linkmotime']))

class StartPage(Element):
    def __init__(self):
        Element.__init__(self, loader=XMLFile(open('startpage.xml')))
        #self.deferred = Deferred()

class printFile(Protocol):
    def __init__(self, request, finished):
        self.finished = finished
	self.request = request

    def dataReceived(self, bytes):
        #print '##### Received #####\n%s' % (bytes,)
	self.request.write(bytes)

    def connectionLost(self, reason):
        #print 'Finished:', reason.getErrorMessage()
        self.finished.callback(None)

def test():
	print 'about to sleep'
	sleep(10)
	print 'slept'



class PubDir(Resource):

    def __init__(self, sub=''):
        Resource.__init__(self)
        self.sub = sub
	self.listing = ''

    def upload(self, request):
		print 'posting...'
		postheaders = request.getAllHeaders()
  		postfile = cgi.FieldStorage(
	        fp = request.content,
	        headers = postheaders,
	        environ = {'REQUEST_METHOD':'POST',
	                 'CONTENT_TYPE': postheaders['content-type'],
                	}
	        )

		filename = postfile["file"].filename
		if filename == '': filename = 'Untitled.txt'
		file = request.args["file"][0]
		#alternative: file = postfile["file"].value

		#alternative way to get filename:
		#filename = request.args["filename"][0]
		#filename = ''
		#savedPosition = request.content.tell()
	        #try:
	        #    request.content.seek(0)
	        #    match = re.search(r'filename="([^"]+)"',
	        #                      request.content.read())
	        #    if match:
	        #        filename = match.group(1)
	        #    else:
	        #        filename = 'Untitled'
	        #finally:
	        #    request.content.seek(savedPosition)
	
		#don't really need this:
		#replace = request.args["replace"][0]
	
		newfilename = filename
		counter = 0
		while True:
		    print 'checking if file exists...'
		    req = (requests.get('%s/%s/%s/%s?t=json' % (urlTemplate, writecap, self.sub, newfilename)) if self.sub else requests.get('%s/%s/%s?t=json' % (urlTemplate, writecap, newfilename)))
		    if req.content[0:13] == 'No such child': break
		    parts = filename.split('.')
		    newfilename = '%s_%d.%s' % (parts[0], counter, parts[1])
		    counter += 1

		##### UPLOADING REQUEST STARTS HERE! #########
		print 'posting file to tahoe grid...'
		req = (requests.put('%s/%s/%s/%s' % (urlTemplate, writecap, self.sub, newfilename), file) if self.sub else requests.put('%s/%s/%s' % (urlTemplate, writecap, newfilename), file))

		###### PRINT UPLOAD RESPONSE ######
		#print req.text
		print 'done uploading!'

    def render_POST(self, request):
	self.sub = request.args["when_done"][0]
	self.leafs = self.sub.split('/')

	if request.args["t"][0] == 'mkdir':
		dirname = request.args["name"][0]
		req = (requests.put('%s/%s/%s/%s?t=mkdir' % (urlTemplate, writecap, self.sub, dirname)) if self.sub else requests.put('%s/%s/%s?t=mkdir' % (urlTemplate, writecap, dirname)))
		
	elif request.args["t"][0] == 'upload':
		thread.start_new_thread(self.upload, (request,))
		
	return self.showDir(request)

    def getFile(self, response):
	#for x in response.headers.getAllRawHeaders(): print x
	#print str(self.request)[:len(str(self.request))-10].rpartition('/')[2]
	#print response.headers._rawHeaders
	#print response.length
	self.request.setHeader('Content-Length', response.length)
	self.request.setHeader('Accept-Ranges', 'bytes')
	if 'ETag' in response.headers.getAllRawHeaders(): self.request.setHeader('ETag', (response.headers.getRawHeaders('ETag'),)[0][0])
	self.request.setHeader('Content-Type', (response.headers.getRawHeaders('Content-Type'),)[0][0])
	self.request.setHeader('Content-Disposition', 'inline; filename=%s;' % str(self.request)[:len(str(self.request))-10].rpartition('/')[2])
	finished = Deferred()
	response.deliverBody(printFile(self.request, finished))
        return finished

    def poll(self, polltime):
	self.polltime = polltime
	self.loop = task.LoopingCall(self.poll2)
	self.loop.start(15)

    def poll2(self):
	    	url2 = url + '/' + self.sub + '?t=json'
	    #print 'entering loop'
	    #while True:
     	        request2 = urllib2.Request(url2, None)
	        try:
	            response2 = urllib2.urlopen(request2)
	        except urllib2.HTTPError, error:
	            #return "404 Error -- File not found."
	            return error.read()
		
		listing = response2.read()
		if self.listing == listing:
		    return
		else:
		    self.listing = listing
	        jstuff = json.loads(self.listing)
	        sortjstuff = sorted(jstuff[1]['children'], key=lambda x: jstuff[1]['children'][x][1]['metadata']['tahoe']['linkmotime'], reverse=True)
		filelist = {}
		for itm in sortjstuff:
			if round(jstuff[1]['children'][itm][1]['metadata']['tahoe']['linkmotime'],2) > float(self.polltime):
				if self.loop.running: self.loop.stop()
				#add to list to send to FileTemp
				#filelist.append(jstuff[1]['children'][itm])
				filelist[itm] = jstuff[1]['children'][itm]
			else: break
	        #newest = jstuff[1]['children'][sortjstuff[0]][1]['metadata']['tahoe']['linkmotime']
		#if round(newest,2) > float(self.polltime):
		if filelist:
		    #print str(filelist)
		    towrite = FileTemp(filelist,self.sub)
		    d = flatten(self.request, towrite, self.request.write)
		    def done(ignored):
	                self.request.finish()
	                return ignored	
		    d.addCallback(done)

    def render_GET(self, request):
	self.request = request
	#print request.getAllHeaders()

	if "poll" in request.args:
	    self.sub = request.args["dir"][0]
	    self.leafs = self.sub.split('/')
	    polltime = request.args["poll"][0]
	    #print 'polltime = ' + polltime
	    d = Deferred()
	    d.addCallback(self.poll)
	    d.callback(polltime)
	    crap = request.notifyFinish()
	    def stoploop(ignored):
		self.loop.stop()
		return ignored
	    crap.addErrback(stoploop)
	    return server.NOT_DONE_YET
	if "file" in request.args:
	    #print request.args["file"][0]
	    url2 = 'http://' + host + '/file/' + request.args["file"][0]
	    d = Agent(reactor).request('GET', url2, Headers({'User-Agent': ['Twisted Web Client Example']}), None)
	    d.addCallback(self.getFile)
	    def done(ignored):
                request.finish()
                return ignored	
	    d.addBoth(done)
            return server.NOT_DONE_YET
	if 'dir' in request.args:
	    self.sub = request.args["dir"][0]
	    self.leafs = self.sub.split('/')
	    #thread.start_new_thread(test, ())
	    return self.showDir(request)
	else:
	    self.sub = ''
	    self.leafs = []
	    towrite = StartPage()
	    d = flatten(request, towrite, request.write)
	    def done(ignored):
                request.finish()
                return ignored	
	    d.addBoth(done)
            return server.NOT_DONE_YET

    def showDir(self, request):
	####### PARSE JSON DATA #########
	url2 = url + '/' + self.sub + '?t=json'

        request2 = urllib2.Request(url2, None)
	try:
	    response2 = urllib2.urlopen(request2)
	except urllib2.HTTPError, error:
	    #return "404 Error -- File not found."
	    return error.read()
	stuff = response2.read()
	jstuff = json.loads(stuff)
	#html = str(jstuff[1]['children'])
	towrite = DirListing(jstuff, self.sub, self.leafs)
	d = flatten(request, towrite, request.write)
	def done(ignored):
            request.finish()
            return ignored	
	d.addBoth(done)
        return server.NOT_DONE_YET

resource = PubDir()
