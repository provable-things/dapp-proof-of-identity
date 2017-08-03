import os
import binascii
import json
import hashlib

def bi2ba(bigint):
    m_bytes = []
    while bigint != 0:
        b = bigint%256
        m_bytes.insert( 0, b )
        bigint //= 256
    return bytearray(m_bytes)

# 0 = base
# 1 = exp
# 2 = mod

rsa = bi2ba(pow(int(os.environ['ARG0'], 16), int(os.environ['ARG1'], 16), int(os.environ['ARG2'], 16)))

if ('ARG3' in os.environ):
	print binascii.hexlify(rsa + hashlib.sha1(os.environ['ARG3'].decode('hex')).digest().encode('hex'))
else:
	print binascii.hexlify(rsa)
