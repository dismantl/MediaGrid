MediaGrid
=========

MediaGrid is a **takedown-resistant, distributed wireless infrastructure** allowing citizens to **share real-time photo and video documentation** at public demonstrations. A MediaGrid uses a distributed filesystem running on a wireless mesh network of wifi-equipped Raspberry Pi's. Smartphones (or any wifi-enabled device) within range can then connect to the network and upload files. **ALL files uploaded to the grid are completely recoverable even if a majority of the devices are confiscated or taken offline**. See the design document for more details: https://github.com/danstaples/MediaGrid/blob/master/MediaGrid.Design.pdf?raw=true.

Implemented/under development:
* Front-end web application for uploading, browsing, and viewing files
* Webchat, including public and private chatrooms

TODO:
* OLSRd configuration
* documentation
* installation/configuration scripts
* custom Debian image for the RPi
* native Android, iOS clients

Requirements
------------

* Tahoe-LAFS (https://tahoe-lafs.org)
* OLSRd (http://www.olsr.org)
* python >= 2.7
* Twisted Web (http://twistedmatrix.com/trac/wiki/TwistedWeb)
* requests (http://docs.python-requests.org/en/latest/index.html)

Installation (not finished)
------------

This section describes the procedure for installing Tahoe-LAFS and the front-end web server. I recommend using an SD card preloaded with Debian Wheezy. Images and instructions for preparing the SD card can be found on the Raspberry Pi website: http://www.raspberrypi.org/downloads.

Once you get the Raspberry Pi up and running (again, refer to the Raspberry Pi website for help), run the following commands from your home directory in the terminal:

`sudo apt-get update && sudo apt-get install tahoe-lafs olsrd python python-twisted-web python-pip -y`

`sudo pip install requests`

`tahoe create-client`

For instructions on configuring Tahoe-LAFS, refer to their documentation: https://tahoe-lafs.org/trac/tahoe-lafs/browser/trunk/docs/configuration.rst. For this particular setup, make sure you turn on storage; set a proper `introducer.furl`; and set `shares.needed`, `shares.happy`, and `shares.total` to suit your particular needs.

Once you have your Tahoe introducer node running, you can start the tahoe service on each node with `tahoe start`.

Finally, in the mediagrid directory, start the front-end server by running `sudo twistd -y mediagrid.py`. Enjoy!

More info
-------------

For questions or comments, send me an e-mail to dan.staples [at symbol] riseup [dot symbol] net.