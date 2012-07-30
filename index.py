from twisted.internet.protocol import Protocol
from twisted.web.resource import Resource
from twisted.internet import reactor, task
from twisted.web import server
from twisted.web.template import Element, renderer, XMLFile, flatten, XMLString
from twisted.internet.defer import Deferred
from twisted.web.util import redirectTo
from twisted.web.client import Agent
from twisted.web.http_headers import Headers
import cgi
import json
import requests
import re
import thread
from time import asctime, localtime

###### SETTINGS ######
host = '127.0.0.1:3456'   # host/port of local Tahoe server
port = 80   # port that MediaGrid is listening on
urlTemplate = 'http://' + host + '/uri'

wc = open('writecap')
rc = open('readcap')
writecap = wc.read()
readcap = rc.read()
wc.close()
rc.close()

url = urlTemplate + '/' + readcap

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

###### Template for sending new file listings to polling client ######
class FileTemp(Element):
    def __init__(self, value, sub):
        Element.__init__(self, loader=filetemp)
	self.value = value
	self.sub = sub

    @renderer
    def file(self, request, tag):
	for itm in sorted(self.value, key=lambda x: self.value[x][1]['metadata']['tahoe']['linkmotime'], reverse=True):	
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

###### Template for file directory page ######
class DirListing(Element):
    def __init__(self, value, sub, leafs):
        Element.__init__(self, loader=XMLFile(open('template.xml')))
	self.value = value
	self.sub = sub
	self.leafs = leafs

    @renderer
    def form(self, request, tag):
	tag.fillSlots(posturl='./?dir=%s' % (self.sub), whendone=self.sub)
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

###### Sends file data in chunks to client ######
class printFile(Protocol):
    def __init__(self, request, finished):
        self.finished = finished
	self.request = request

    def dataReceived(self, bytes):
	self.request.write(bytes)

    def connectionLost(self, reason):
        self.finished.callback(None)

###### The main resource for handling client requests and interfacing with the Tahoe-LAFS server ######
class MediaGrid(Resource):

    def render_GET(self, request):
	###### AJAX long-polling by client ######
	if "poll" in request.args:
	    sub = request.args["dir"][0]  # the current directory
	    polltime = request.args["poll"][0]  # timestamp of newest file client has listed
	    loop = task.LoopingCall(self.poll, polltime, request, sub)
	    d = loop.start(5)
	    def done(ignored):
		try:
		    loop.stop()
		except:
		    pass
	    d.addErrback(done)
 	    crap = request.notifyFinish()
	    crap.addBoth(lambda x: loop.stop())
	    return server.NOT_DONE_YET
	###### Return file contents ######
	elif "file" in request.args:   
	    d = Agent(reactor).request('GET', 'http://%s/file/%s' % (host, request.args["file"][0]))  # get file from Tahoe server
	    d.addCallback(self.getFile, request)   # then send it on to the client
	    d.addBoth(lambda x: request.finish())
            return server.NOT_DONE_YET
	###### List contents of directory ######
	elif 'dir' in request.args:
	    sub = request.args["dir"][0]   # current directory
	    leafs = sub.split('/')
	    return self.showDir(request, sub, leafs)
	###### Start page ######
	else:
	    towrite = open('startpage.xml').read()
	    return towrite

    def render_POST(self, request):
	sub = request.args["when_done"][0]
	leafs = sub.split('/')

	###### Create directory ######
	if request.args["t"][0] == 'mkdir':
	    dirname = request.args["name"][0]
	    req = (requests.put('%s/%s/%s/%s?t=mkdir' % (urlTemplate, writecap, sub, dirname)) if sub else requests.put('%s/%s/%s?t=mkdir' % (urlTemplate, writecap, dirname)))
		
	###### Upload file ######
	elif request.args["t"][0] == 'upload':

	    # Twisted.web doesn't know how to get the filename...here's a workaround:
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

	    file = request.args["file"][0]   # Fetch the file contents
	    #alternative: file = postfile["file"].value

	    # Upload file to Tahoe server in new thread so we can respond to client
	    thread.start_new_thread(self.upload, (sub, file, filename))
		
	request.addCookie('uploaded','1')
	return redirectTo('http://%s:%s/?dir=%s' % (request.getHost().host,port,sub),request)

    def showDir(self, request, sub, leafs):
	req = requests.get('%s/%s?t=json' % (url,sub))
	jstuff = json.loads(req.text)
	towrite = DirListing(jstuff, sub, leafs)
	d = flatten(request, towrite, request.write)
	d.addBoth(lambda x: request.finish())
        return server.NOT_DONE_YET

    def getFile(self, response, request):
	request.setHeader('Content-Length', response.length)
	request.setHeader('Accept-Ranges', 'bytes')
	if 'ETag' in response.headers.getAllRawHeaders(): request.setHeader('ETag', (response.headers.getRawHeaders('ETag'),)[0][0])
	request.setHeader('Content-Type', (response.headers.getRawHeaders('Content-Type'),)[0][0])
	request.setHeader('Content-Disposition', 'inline; filename=%s;' % str(request)[:len(str(request))-10].rpartition('/')[2])
	finished = Deferred()
	response.deliverBody(printFile(request, finished))
        return finished

    def poll(self, polltime, request, sub):
	req = requests.get('%s/%s?t=json' % (url,sub))   # Get json info of directory contents
	jstuff = json.loads(req.text)
	sortjstuff = sorted(jstuff[1]['children'], 
		key=lambda x: jstuff[1]['children'][x][1]['metadata']['tahoe']['linkmotime'], 
		reverse=True)   # sort for newest first
	filelist = {}
	for itm in sortjstuff:
	    if (polltime == '') or (round(jstuff[1]['children'][itm][1]['metadata']['tahoe']['linkmotime'],2) > float(polltime)):   # is file newer than what the client has?
		filelist[itm] = jstuff[1]['children'][itm]
	    else: break
	if filelist:   # if we found newer files, send info to client
	    towrite = FileTemp(filelist,sub)
	    d = flatten(request, towrite, request.write)
	    d.addCallback(lambda x: request.finish())
	    return d

    ###### Upload file to Tahoe server ######
    def upload(self, sub, file, filename):
	newfilename = filename
	counter = 0
	while True:
	    # Check if file of same name already exists
	    req = (requests.get('%s/%s/%s/%s?t=json' % (urlTemplate, writecap, sub, newfilename)) if sub else requests.get('%s/%s/%s?t=json' % (urlTemplate, writecap, newfilename)))
	    if req.content[0:13] == 'No such child': break
	    parts = filename.split('.')
	    newfilename = '%s_%d.%s' % (parts[0], counter, parts[1])
	    counter += 1

	req = (requests.put('%s/%s/%s/%s' % (urlTemplate, writecap, sub, newfilename), file) if sub else requests.put('%s/%s/%s' % (urlTemplate, writecap, newfilename), file))   # upload the damn thing

resource = MediaGrid()
