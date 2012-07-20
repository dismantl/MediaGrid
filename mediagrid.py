from twisted.application import internet, service
from twisted.web import static, server, script

root = static.File("./")
root.indexNames=['index.rpy']
root.ignoreExt(".rpy")
root.processors = {'.rpy': script.ResourceScript}
application = service.Application('web')
site = server.Site(root)
sc = service.IServiceCollection(application)
i = internet.TCPServer(80, site)
i.setServiceParent(sc)

