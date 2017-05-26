import { Ber } from 'asn1';


export const findStringByOID = function (buffer, oid, index) {
  if (!index || index === 0) {
    index = 1;
  }
  const crt = new Ber.Reader(buffer);
  let currentOid, currentIndex = 1;
  while (crt.remain > 0) {
    try {
      currentOid = crt.readOID();
      if (currentOid === oid && currentIndex === index)
        return crt.readString(0x0C);
      else if (currentOid === oid && currentIndex < index)
        currentIndex++;
    } catch (e) {
      // caught error here occurs if sequence is not oid type
    }
    crt._offset++;
  }
}
