MediaGrid Installation Guide on Windows
-------------
1.Install Couchdb from http://couchdb.apache.org/#download, and tick "Install couchdb as a Windows service" and "Start service after installation".

Then configure your Couchdb. Modify the bind_address and timeout options in the CouchDB configuration file C:\Program Files (x86)\Apache Software Foundation\CouchDB\etc\couchdb\default.ini. 

	[httpd]
	bind_address = 0.0.0.0

	[couch_httpd_auth]
	timeout = 86400

Then, add an admin user in C:\Program Files (x86)\Apache Software Foundation\CouchDB\etc\couchdb\local.ini: 

	[admins]
	admin = s3cr3tp4ssw0rd

replacing the above credentials with those of your choosing. 

Note: If you're using a 32bit system, configuration file is at C:\Program Files \Apache Software Foundation\CouchDB\etc\couchdb\default.ini.

Finally, go to your Start Menu, and input "cmd.exe" and press Enter to open your commandline, and type the following command to restart the "Apache CouchDB" service:

	net stop "Apache CouchDB"
	net start "Apache CouchDB"

2.Install Couchapp from http://www.couchapp.org/page/windows-python-installers.

Choose the one that does not require python. Remember to click "add installation path to the search path" at the last step of installation.

3.Download MediaGrid from Github.

You can either use git to clone it, or download a zip file from current page.

In order to clone it with git, you should install git, and type following command in your commandline:

	git clone git://github.com/dismantl/MediaGrid.git

Then change directory to the MediaGrid in commandline and use the following command to insert MediaGrid into the CouchDB server:

	couchapp push MediaGrid/media http://admin:s3cr3tp4ssw0rd@127.0.0.1:5984/media
	couchapp push MediaGrid/chat http://admin:s3cr3tp4ssw0rd@127.0.0.1:5984/chat

replacing 'admin:s3cr3tp4ssw0rd' with your own credentials.

4.Open link http://127.0.0.1:5984/media/_design/media/index.html in your browser and enjoy.
