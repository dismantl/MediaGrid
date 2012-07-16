from twisted.web.resource import Resource
from twisted.web.static import File
from twisted.internet import reactor
from twisted.web import resource as resourcelib
from twisted.web import server
from twisted.web.template import Element, renderer, XMLFile, flatten
from twisted.python.filepath import FilePath
from twisted.internet.defer import Deferred
import cgi
import json
import urllib2
import urllib
import requests
from time import asctime, localtime

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

class Content(Element):
    def __init__(self, value, sub):
        Element.__init__(self, loader=XMLFile(open('template.xml')))
        self.deferred = Deferred()
	self.value = value
	if sub != '/':
	    self.sub = sub
	else:
	    self.sub = ''

    @renderer
    def form(self, request, tag):
	tag.fillSlots(posturl=urlTemplate + '/' + writecap + self.sub, whendone='http://%s:%s%s' % (request.getHost().host, port, self.sub))
	return tag

    @renderer
    def current(self, request, tag):
	return tag(request.prepath[len(request.prepath)-1])

    @renderer
    def back(self, request, tag):
	if self.sub != '':
	    yield tag.clone().fillSlots(backurl='http://%s:%s' % (request.getHost().host, port), backtext='Home')
	    for res in request.prepath[:len(request.prepath)-1]:	    
		yield tag.clone().fillSlots(backurl='/%s' % '/'.join(map(str, request.prepath[:request.prepath.index(res)+1])), backtext=res)
	else:
	    tag.fillSlots(backurl="", backtext='')

    @renderer
    def file(self, request, tag):	
	for itm in self.value[1]['children']:
	    if self.value[1]['children'][itm][0] == 'filenode':
		yield tag.clone().fillSlots(type='FILE',
		    fileurl='http://%s/file/%s/@@named=/%s' % (host,self.value[1]['children'][itm][1]['ro_uri'],itm), 
		    filename=itm, 
		    size=str(self.value[1]['children'][itm][1]['size']),
		    time=asctime(localtime(self.value[1]['children'][itm][1]['metadata']['tahoe']['linkmotime'])))
	    elif self.value[1]['children'][itm][0] == 'dirnode':
		yield tag.clone().fillSlots(type='DIR',
		    fileurl='%s/%s' % (self.sub,itm),
		    #fileurl=itm,  
		    filename=itm + '/', 
		    size='-',
		    time=asctime(localtime(self.value[1]['children'][itm][1]['metadata']['tahoe']['linkmotime'])))

class PubDir(resourcelib.Resource):
    def getChild(self, name, request):
	return PubDir(request.uri)

    def __init__(self, sub='/'):
        Resource.__init__(self)
        self.sub = sub

    def render_POST(self, request):
	file = request.args["file"][0]
	print request.args["file"][0][1]
	whendone='http://%s:%s%s' % (request.getHost().host, port, self.sub)
	replace='false'
	t = 'upload'
	req = requests.put(urlTemplate + '/' + writecap + '/TESTFILE8.jpg', file)
	#print req.headers
	return self.render_GET(request)

    def render_GET(self, request):
	try:
	    self.sub = request.args["test"][0]
	except:
	    self.sub = '/'
	####### PRINT OUT RAW PAGE #########
	#client.getPage(url, timeout=30).addCallback(lambda s: (request.write(s),request.finish())).addErrback(lambda e: (request.write('Error: %s' % e),request.finish()))
        #return server.NOT_DONE_YET

	####### PARSE JSON DATA #########
	url2 = url + '/' + self.sub + '?t=json'
	print url2

        request2 = urllib2.Request(url2, None)
	try:
	    response2 = urllib2.urlopen(request2)
	except urllib2.HTTPError, error:
	    #return "404 Error -- File not found."
	    return error.read()
	stuff = response2.read()
	jstuff = json.loads(stuff)
	html = str(jstuff[1]['children'])
	towrite = Content(jstuff, self.sub)
	d = flatten(request, towrite, request.write)
	def done(ignored):
            request.finish()
            return ignored	
	d.addBoth(done)
        return server.NOT_DONE_YET

	####### PRINT OUT PARSED HTML ########
	#client.getPage(url, timeout=30).addCallback(
	#microdom.parseString).addCallback(
	#lambda q: domhelpers.get(q,'tahoe-directory')).addCallback(
	#lambda itms: '<html><head><title>Heey</title></head><body>%s</body></html>' % itms.toprettyxml()).addCallback(
	#lambda s: (request.write(s),request.finish())).addErrback(
        #lambda e: (request.write('Error: %s' % e),request.finish()))
        #return server.NOT_DONE_YET

resource = PubDir()
#resource.putChild("css", File("./css"))
#resource.putChild("js", File("./js"))
#factory = server.Site(resource)
#reactor.listenTCP(port, factory)
#reactor.run()
