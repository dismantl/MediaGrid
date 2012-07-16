from twisted.internet.protocol import Protocol
from pprint import pprint
from twisted.web.resource import Resource
from twisted.web.static import File
from twisted.internet import reactor
from twisted.web import resource as resourcelib
from twisted.web import server
from twisted.web.template import Element, renderer, XMLFile, flatten
from twisted.python.filepath import FilePath
from twisted.internet.defer import Deferred, DeferredList
import cgi
import json
import urllib2
import urllib
import requests
import tempfile
import re
from time import asctime, localtime
from twisted.web.client import getPage, Agent
from twisted.web.http_headers import Headers

host = '127.0.0.1:3456'
port = 8080
urlTemplate = 'http://' + host + '/uri'

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

url = urlTemplate + '/' + readcap

class DirListing(Element):
    def __init__(self, value, sub, leafs):
        Element.__init__(self, loader=XMLFile(open('template.xml')))
        self.deferred = Deferred()
	self.value = value
	self.sub = sub
	self.leafs = leafs

    @renderer
    def form(self, request, tag):
	#tag.fillSlots(posturl='%s/%s/%s' % (urlTemplate, writecap, self.sub), whendone='http://%s:%s/?dir=%s' % (request.getHost().host, port, self.sub))
	tag.fillSlots(posturl='%s/%s/%s' % (urlTemplate, writecap, self.sub), whendone=self.sub)
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
		    time=asctime(localtime(self.value[1]['children'][itm][1]['metadata']['tahoe']['linkmotime'])))
	    elif self.value[1]['children'][itm][0] == 'dirnode':
		yield tag.clone().fillSlots(type='DIR',
		    fileurl=('?dir=%s/%s' % (self.sub,itm) if self.sub != '' else '?dir=%s' % itm),
		    filename=itm + '/', 
		    size='-',
		    time=asctime(localtime(self.value[1]['children'][itm][1]['metadata']['tahoe']['linkmotime'])))

class PubDir(resourcelib.Resource):
    #def getChild(self, name, request):
	#return PubDir(request.uri)

    def __init__(self, sub=''):
        Resource.__init__(self)
        self.sub = sub

    def render_POST(self, request):
	self.sub = request.args["when_done"][0]
	self.leafs = self.sub.split('/')

	if request.args["t"][0] == 'mkdir':
		dirname = request.args["name"][0]
		req = (requests.put('%s/%s/%s/%s?t=mkdir' % (urlTemplate, writecap, self.sub, dirname)) if self.sub else requests.put('%s/%s/%s?t=mkdir' % (urlTemplate, writecap, dirname)))
		
	elif request.args["t"][0] == 'upload':
		file = request.args["file"][0]
		#filename = request.args["filename"][0]
		filename = ''
		savedPosition = request.content.tell()
	        try:
	            request.content.seek(0)
	            #request.content.readline()
	            match = re.search(r'filename="([^"]+)"',
	                              request.content.read())
	            if match:
	                filename = match.group(1)
	            else:
	                filename = 'Untitled'
	        finally:
	            request.content.seek(savedPosition)
	
		replace = request.args["replace"][0]
	
		newfilename = filename
		counter = 0
		while True:
		    req = requests.get('%s/%s/%s' % (urlTemplate, writecap, newfilename))
		    if req.content[0:13] == 'No such child': break
		    parts = filename.split('.')
		    newfilename = '%s_%d.%s' % (parts[0], counter, parts[1])
		    counter += 1
		req = (requests.put('%s/%s/%s/%s' % (urlTemplate, writecap, self.sub, newfilename), file) if self.sub else requests.put('%s/%s/%s' % (urlTemplate, writecap, newfilename), file))
	print req.text
		
	return self.showDir(request)

    def render_GET(self, request):
	self.request = request
	#print request.getAllHeaders()
	if "file" in request.args:
	    print request.args["file"][0]
	    url2 = 'http://' + host + '/file/' + request.args["file"][0]
	    request2 = urllib2.Request(url2, None)
	    try:
	        response2 = urllib2.urlopen(request2)
    	    except urllib2.HTTPError, error:
	    #    #return "404 Error -- File not found."
	        return error.read()
	    request.setHeader('Content-Type', response2.info().gettype())
	    #print response2.info()
	    return response2.read()

	if 'dir' in request.args:
	    self.sub = request.args["dir"][0]
	    self.leafs = self.sub.split('/')
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
	html = str(jstuff[1]['children'])
	towrite = DirListing(jstuff, self.sub, self.leafs)
	d = flatten(request, towrite, request.write)
	def done(ignored):
            request.finish()
            return ignored	
	d.addBoth(done)
        return server.NOT_DONE_YET

resource = PubDir()
