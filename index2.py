from twisted.web.static import File
from twisted.internet import reactor
from twisted.web import server
from index import PubDir

resource = PubDir()
resource.putChild("css", File("./css"))
resource.putChild("js", File("./js"))
factory = server.Site(resource)
reactor.listenTCP(8080, factory)
reactor.run()
