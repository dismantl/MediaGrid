MediaGrid
=========

MediaGrid is a censorship-resistant, distributed wireless infrastructure allowing citizens to share real-time video and photo documentation at public demonstrations. A MediaGrid uses a distributed filesystem running on a wireless mesh network of wifi-equipped Raspberry Pi's. Smartphones (or any wifi-enabled device) within range can then connect to the network and upload files.

Completed/under development:
* Front-end web server for uploading files

TODO:
* OLSRd configuration
* chat functionality
* documentation
* installation/configuration scripts

Requirements
------------

* Tahoe-LAFS (https://tahoe-lafs.org)
* OLSRd
* python >= 2.7
* Twisted Web (http://twistedmatrix.com/trac/wiki/TwistedWeb)
* requests (http://docs.python-requests.org/en/latest/index.html)

Installation
------------

This section describes the procedure for installing the front-end web server. I recommend using an SD card preloaded with Debian Wheezy. Images and instructions for preparing the SD card can be found on the Raspberry Pi website: http://www.raspberrypi.org/downloads.

Once you get the Raspberry Pi up and running (again, refer to the Raspberry Pi website for help), run the following commands from your home directory in the terminal:

`sudo apt-get update && sudo apt-get install tahoe-lafs olsrd python python-twisted-web python-pip -y`

`sudo pip install requests`

`tahoe create-client`

For instructions on configuring Tahoe-LAFS, refer to their documentation: https://tahoe-lafs.org/trac/tahoe-lafs/browser/trunk/docs/configuration.rst. For this particular setup, make sure you turn on storage; set a proper `introducer.furl`; and set `shares.needed`, `shares.happy`, and `shares.total` to suit your particular needs.

Once you have your Tahoe introducer node running, you can start the tahoe service on each node with `tahoe start`.

Finally, in the mediagrid directory, start the front-end server by running `sudo twistd -y mediagrid.py`. Enjoy!