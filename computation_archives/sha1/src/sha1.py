import os
import hashlib

print hashlib.sha1(os.environ['ARG0'].decode('hex')).digest()