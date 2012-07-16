from twisted.web.resource import Resource

class Chat(Resource):

    def __init__(self, sub=''):
        Resource.__init__(self)

    def render_GET(self, request):
	return open("chat.xml").read()
	

resource = Chat()
