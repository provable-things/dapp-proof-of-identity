FROM ubuntu:14.04
MAINTAINER Oraclize "info@oraclize.it"

RUN apt-get update && apt-get -y install python-minimal
COPY sha1.py /tmp/
CMD /usr/bin/python /tmp/sha1.py 
