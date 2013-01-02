MediaGrid
=========

MediaGrid is a **takedown-resistant, distributed wireless infrastructure** allowing citizens to **communicate and share real-time photo and video documentation** at public demonstrations, without the need for internet access. A MediaGrid uses a distributed database running on a wireless mesh network of small, battery-powered devices. Smartphones (or any wifi-enabled device) within range can then connect to the wifi network to upload files and securely chat. **ALL files uploaded to the grid are completely recoverable even if most of the devices are confiscated or taken offline**. See the original (outdated) design document for more details: https://github.com/danstaples/MediaGrid/blob/master/MediaGrid.Design.pdf?raw=true.

Implemented:
* Web application for uploading, browsing, and viewing files
* Webchat, including private encrypted chatrooms and encrypted IM*
* Automated discovery of, and replication with, other MediaGrid nodes using mDNS/DNSSD
* Custom, zero-configuration Debian image for the Raspberry Pi

**\* NOTE: The security of encrypted chat has not been thoroughly tested. DO NOT rely on it to protect super-sensitive communications!**

TODO:
* OLSRd configuration
* documentation
* native Android, iOS clients

### \*Update\* 1/1/2013
Happy New Year! I've just finished creating a custom, zero-configuration Debian image for the Raspberry Pi. Basically, you just put the image onto an SD card, insert it into the Raspberry Pi, turn it on, and it will automagically configure everything and join with any other MediaGrid nodes it finds nearby. Some of the networking configuration still needs to be tweaked, but once I get that done I will update the source code, release the image, and create an updated design document. After that, I plan on doing performance benchmarking and optimization to get everything ready for some real field testing. Huzzah!

### \*Update\* 11/8/2012
Committed overhauled codebase. Webchat is more polished, thanks to Twitter Bootstrap. I finally feel satisfied with the desktop client, and will now start working on mobile clients. Also, I just ordered a few Raspberry Pi's so I can start testing multi-node performance. Huzzah!

### \*Update\* 9/11/2012
Today I released the second version of MediaGrid (v2.0?). I've completely gotten rid of my custom python webapp and Tahoe-LAFS as the distributed filesystem, due to performance issues. They have been replaced with CouchDB, a distributed, non-relational database server. Everything is way faster, and my server-side code is probably under 100 lines of javascript. ALSO, encrypted webchat is now included for private chatrooms, thanks to code taken from CryptoCat (https://project.crypto.cat).

### \*Update\* 8/18/2012
So I've kinda become enamored with CouchDB lately, and given the performance issues I've been having with Tahoe-LAFS, I may just re-write everything using CouchDB.  So stay tuned...

Requirements
------------

* Raspberry Pi
* SD Card (with enough space for file storage)
* USB WiFi adapter
* Power source (I'm working on a cheap, high capacity battery pack, but AC adapter will work for now)

Installation (outdated, to be replaced with custom Debian image)
------------

This section describes the procedure for installing the CouchDB server. I recommend using an SD card preloaded with Debian Wheezy. Images and instructions for preparing the SD card can be found on the Raspberry Pi website: http://www.raspberrypi.org/downloads.

Once you get the Raspberry Pi up and running (again, refer to the Raspberry Pi website for help), run the following commands from your home directory in the terminal:

    sudo apt-get update && sudo apt-get install couchdb olsrd python python-pip -y
    sudo pip install couchapp

Modify the `port` and `bind_address` options and add an admin user in the CouchDB configuration file `/etc/couchdb/local.ini`:

    [httpd]
    port = 80
    bind_address = 0.0.0.0
    
    [admins]
    adminuser = s3cr3tp4ssw0rd

replacing the above credentials with your own.  **Important: use unique, random passphrases for each and every node! This is because databases, and thus uploaded files, can be deleted remotely using admin credentials.**
    
Now Restart the CouchDB server:

`sudo service couchdb restart`

From the `mediagrid` directory, push the CouchApps onto the CouchDB server:

    couchapp push media http://adminuser:s3cr3tp4ssw0rd@localhost/media
    couchapp push chat http://adminuser:s3cr3tp4ssw0rd@localhost/chat

Finally, open up `http://localhost/media/_design/media/index.html` in your web browser to get started. Have fun!

More info
-------------

For questions or comments, send me an e-mail to dan.staples [at symbol] riseup [dot symbol] net.

All donations to the project are appreciated, and will go towards purchasing hardware for testing and development. You can contribute via [Gittip](https://www.gittip.com/danstaples/) or [Flattr](https://flattr.com/profile/danstaples).
