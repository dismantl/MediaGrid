MediaGrid
=========

MediaGrid is a **takedown-resistant, distributed wireless infrastructure** allowing citizens to **communicate and share real-time photo and video documentation** at public demonstrations, without the need for internet access. A MediaGrid uses a replicated database running on a wireless mesh network of small, battery-powered devices. Smartphones (or any wifi-enabled device) within range can then connect to the wifi network to upload files and securely chat. **ALL files uploaded to the grid are completely recoverable even if most of the devices are confiscated or taken offline**. See the original (outdated) [design document](https://github.com/dismantl/MediaGrid/blob/master/MediaGrid.Design.pdf?raw=true) for more details.

MediaGrid can either be run as a simple web application on any linux server or as part of a fully automated and independent system using a [Raspberry Pi](http://www.raspberrypi.org/).

### Implemented: ###
* Web application for uploading, browsing, and viewing files
* Webchat, including private encrypted chatrooms and encrypted IM*

**\* NOTE: The cryptographic security currently used in MediaGrid chat has [known vulnerabilities](https://blog.crypto.cat/2013/07/new-critical-vulnerability-in-cryptocat-details/), and should not be used for extremely sensitive communications!**

### Partially implemented: ###
* Custom, zero-configuration Debian image for the Raspberry Pi, including automated discovery of, and replication with, other MediaGrid nodes using mDNS/DNSSD

### TODO: ###
* add Batman-Adv or BMX6 meshing
* smart replication algorithm
* documentation
* native Android, iOS clients
* [Serval](https://github.com/servalproject/) integration for signing files and wireless traffic


Hardware Requirements
------------

* Raspberry Pi
* SD Card (with enough space for file storage)
* Atheros-based USB WiFi adapter
* Power source (I'm working on a cheap, high capacity battery pack, but AC adapter will work for now)


Installation
------------
### Linux ###

This section describes the procedure for installing MediaGrid as a stand-alone web application. MediaGrid requires CouchDB version 1.2.x or later, which is in the standard repositories for Debian Wheezy and Ubuntu 12.10 or above. If you have an older Linux OS, you can instead use [Build CouchDB](https://github.com/iriscouch/build-couchdb) to build the latest version of CouchDB.

    sudo apt-get update && sudo apt-get install couchdb python python-pip python-dev git -y
    sudo pip install couchapp

Now get the MediaGrid files:

    cd ~/
    git clone git://github.com/dismantl/MediaGrid.git

Modify the `bind_address` and `timeout` options in the CouchDB configuration file `/etc/couchdb/default.ini`:

    [httpd]
    bind_address = 0.0.0.0
    
    [couch_httpd_auth]
    timeout = 86400
    
Finally, add an admin user in `/etc/couchdb/local.ini`:

    [admins]
    adminuser = s3cr3tp4ssw0rd

replacing the above credentials with your own.  **Important: use unique, random passphrases for each and every node! This is because databases, and thus uploaded files, can be deleted remotely using admin credentials.**
    
Now Restart the CouchDB server:

`sudo service couchdb restart`

Insert MediaGrid into the CouchDB server:

    couchapp push ~/MediaGrid/media http://adminuser:s3cr3tp4ssw0rd@localhost:5984/media
    couchapp push ~/MediaGrid/chat http://adminuser:s3cr3tp4ssw0rd@localhost:5984/chat
replacing 'adminuser:s3cr3tp4ssw0rd' with your own credentials. 

Finally, open up `http://localhost:5984/media/_design/media/index.html` in your web browser to get started. Have fun!

### Windows ###
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



More info
-------------

For questions or comments, send me an e-mail to dan@disman.tl.

All donations to the project are appreciated, and will go towards purchasing hardware for testing and development. You can contribute via [Gittip](https://www.gittip.com/dismantl/) or [Flattr](https://flattr.com/profile/danstaples).


Changelog/Updates
-------------

10/10/2013: After a long break, I've entirely re-written the MediaGrid web application using [AngularJS](http://angularjs.org/), making the client side code much cleaner, faster, and more easily extensible. And, it now has a much better mobile interface that actually works!

1/1/2013: Happy New Year! I've just finished creating a custom, zero-configuration Debian image for the Raspberry Pi. Basically, you just put the image onto an SD card, insert it into the Raspberry Pi, turn it on, and it will automagically configure everything and join with any other MediaGrid nodes it finds nearby. Some of the networking configuration still needs to be tweaked, but once I get that done I will update the source code, release the image, and create an updated design document. After that, I plan on doing performance benchmarking and optimization to get everything ready for some real field testing. Huzzah!

11/8/2012: Committed overhauled codebase. Webchat is more polished, thanks to Twitter Bootstrap. I finally feel satisfied with the desktop client, and will now start working on mobile clients. Also, I just ordered a few Raspberry Pi's so I can start testing multi-node performance. Huzzah!

9/11/2012: Today I released the second version of MediaGrid (v2.0?). I've completely gotten rid of my custom python webapp and Tahoe-LAFS as the distributed filesystem, due to performance issues. They have been replaced with CouchDB, a distributed, non-relational database server. Everything is way faster, and my server-side code is probably under 100 lines of javascript. ALSO, encrypted webchat is now included for private chatrooms, thanks to code taken from [CryptoCat](https://project.crypto.cat).

8/18/2012: So I've kinda become enamored with CouchDB lately, and given the performance issues I've been having with Tahoe-LAFS, I may just re-write everything using CouchDB.  So stay tuned...
