import os
import hashlib
import binascii

print binascii.hexlify(hashlib.sha1(os.environ['ARG0'].decode('hex')).digest())
