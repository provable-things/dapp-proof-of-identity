FROM ubuntu:14.04
MAINTAINER Oraclize "info@oraclize.it"

RUN apt-get update && apt-get -y install python-minimal
COPY mod_pow.py /tmp/
CMD /usr/bin/python /tmp/mod_pow.py 
