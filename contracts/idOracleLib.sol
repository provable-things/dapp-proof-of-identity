/*
MIT License

Copyright (c) 2017 Oraclize LTD

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

pragma solidity ^0.4.6;

import "oraclizeLib.sol";
import "FixedToDynamic.sol";

library idOracleLib {

  using FixedToDynamic for string[2];
  using FixedToDynamic for string[4];

  function computeRSA(bytes _base, bytes _exp, bytes _mod, uint _cost)
  public
  returns (bytes32 callback) {

      return oraclizeLib.oraclize_query("computation", ["Qmd3Vdr5AqFCLDqWhx8fcpQKM6FoUMMieR4cGEyNmL44hJ",
      oraclizeLib.b2s(_base), oraclizeLib.b2s(_exp), oraclizeLib.b2s(_mod)].toDynamic(), _cost);
  }

  function computeSHA1(bytes _body)
  public
  returns (bytes32 callback) {
      return oraclizeLib.oraclize_query("computation", ["QmXcC622oz3oQLjH9rjVKJZLhfHUtY4Pf5rexFpRxJEvtt",
      oraclizeLib.b2s(_body)].toDynamic(), 2000000);
  }

  function queryOCSP(string _cn)
  public
  returns (bytes32 callback) {
      return oraclizeLib.oraclize_query("nested",
      oraclizeLib.strConcat("[URL] http://esteid.oraclize.it/ocsp/_sign?otype=cert&key=${[decrypt] BG+04c4ksqrXd+YyV/AtAXkpfg017wRxBkxcxtKtVHml9VXuEo++koFXVWqKfiAo7TU2KamWspeCzsMSRddOggszdWaSJ5bQUrxw6tBZ9JdfDuvLQiEjJX8EOGd7BGw2LTD04Umk4zU1Fc2iyQzAx2G9ztZXrkF8+1EYoyvDTvlIGT2/PT5lgWWjauYs5iwtrg==}&cn=", _cn), 2000000);
  }

  function verifySigOCSP(bytes _sig)
  public
  returns (bytes32 callback) {
      bytes memory ocspResponderMod = hex'8a1bc6ca1315ae045e1e5b8a967d736ba82f084fe69524449968c91692fd965bee1146683c5232a5803c839bb555f824796e600eadb98c03aae05c977831886bea499f6874a3659cd9a7a9a551bf7a67c69bf8c0f238dec8caf01fc7c026ba9543b73d5f6c52c0911c87f3f677c09f319b79605ea0a8bb4fbc6d5bfa7ea8b41640e708c815f27f8a7241314bea1d2cf7f8f2dfc4edbf4f75b293f73c33d1c832a4de96aca230646059e8625353ac2fd6ab9afddd42b1ecd709babc76b17e97d607d6001697a8f5a62a84f0b156dff3a3635007abf1c994b486c3ab5cbed2c514e83896aab27be56dfd1eacf3c5b511d4bdba23618825f9fce5cf426de9026837';

      return computeRSA(_sig, hex'010001', ocspResponderMod, 1800000);
  }
}
