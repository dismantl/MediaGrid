from twisted.application import internet, service
from twisted.web import static, server, script
import requests
import json

###### SETTINGS ######
host = '127.0.0.1:3456'   # host/port of local Tahoe server
port = 80   # port that MediaGrid is listening on
urlTemplate = 'http://' + host + '/uri'

####### SETUP #######
try:
    wc = open('writecap')
    rc = open('readcap')
    writecap = wc.read()
    readcap = rc.read()
    wc.close()
    rc.close()
except IOError:
    req = requests.put(urlTemplate + '?t=mkdir')
    writecap = req.text
    req = requests.get('%s/%s?t=json' % (urlTemplate, writecap))
    jresp = json.loads(req.text)
    readcap = jresp[1]['ro_uri']
    wc = open('writecap','w')
    wc.write(writecap)
    rc = open('readcap','w')
    rc.write(readcap)
    wc.close()
    rc.close()

try:
    cc = open('chatcap')
    chatcap = cc.read()
    cc.close()
except IOError:
    req = requests.put(urlTemplate + '?t=mkdir')
    chatcap = req.text
    cc = open('chatcap','w')
    cc.write(chatcap)
    cc.close()

root = static.File("./")
root.indexNames=['index.rpy']
root.ignoreExt(".rpy")
root.processors = {'.rpy': script.ResourceScript}
application = service.Application('web')
site = server.Site(root)
sc = service.IServiceCollection(application)
i = internet.TCPServer(port, site)
i.setServiceParent(sc)