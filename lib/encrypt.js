var edge = require("edge");
var log4js = require("log4js");
var logger = log4js.getLogger("userService");
var Q = require('Q');

exports.rijndael = edge.func(function () {
    /*
     using System;
     using System.Collections.Generic;
     using System.Text;
     using System.IO;
     using System.IO.Compression;
     using System.Security.Cryptography;
     using System.Runtime.Serialization;
     using System.Runtime.Serialization.Formatters.Binary;
     using System.Collections;
     using System.Threading.Tasks;

     public class Startup
     {
     public async Task<Object> Invoke(Object input)
     {
     SymmetricAlgorithm mobjCryptoService = new RijndaelManaged();
     string sTemp;
     string Key = "LXyqsoft";
     if (mobjCryptoService.LegalKeySizes.Length > 0)
     {
     int lessSize = 0, moreSize = mobjCryptoService.LegalKeySizes[0].MinSize;
     while (Key.Length * 8 > moreSize)
     {
     lessSize = moreSize;
     moreSize += mobjCryptoService.LegalKeySizes[0].SkipSize;
     }
     sTemp = Key.PadRight(moreSize / 8, ' ');
     }
     else
     sTemp = Key;

     byte[] bytKey = Encoding.UTF8.GetBytes(sTemp);
     byte[] bytIn = Encoding.UTF8.GetBytes(input.ToString());
     System.IO.MemoryStream ms = new System.IO.MemoryStream();


     mobjCryptoService.Key = bytKey;
     mobjCryptoService.IV = bytKey;

     ICryptoTransform encrypto = mobjCryptoService.CreateEncryptor();
     CryptoStream cs = new CryptoStream(ms, encrypto, CryptoStreamMode.Write);

     cs.Write(bytIn, 0, bytIn.Length);
     cs.FlushFinalBlock();

     byte[] bytOut = ms.GetBuffer();
     int i = 0;
     for (i = bytOut.Length - 1; i > 0; i--)
     if (bytOut[i] != 0)
     break;
     i++;
     return System.Convert.ToBase64String(bytOut, 0, i);
     }
     }
     */
});

exports.decrypting = edge.func(function () {
    /*
     using System;
     using System.Collections.Generic;
     using System.Text;
     using System.IO;
     using System.IO.Compression;
     using System.Security.Cryptography;
     using System.Runtime.Serialization;
     using System.Runtime.Serialization.Formatters.Binary;
     using System.Collections;
     using System.Threading.Tasks;

     public class Startup
     {
     public async Task<Object> Invoke(Object input)
     {
     SymmetricAlgorithm mobjCryptoService = new RijndaelManaged();
     string sTemp;
     string Key = "LXyqsoft";
     if (mobjCryptoService.LegalKeySizes.Length > 0)
     {
     int lessSize = 0, moreSize = mobjCryptoService.LegalKeySizes[0].MinSize;
     while (Key.Length * 8 > moreSize)
     {
     lessSize = moreSize;
     moreSize += mobjCryptoService.LegalKeySizes[0].SkipSize;
     }
     sTemp = Key.PadRight(moreSize / 8, ' ');
     }
     else
     sTemp = Key;

     byte[] bytKey = Encoding.UTF8.GetBytes(sTemp);
     byte[] bytIn = System.Convert.FromBase64String(input.ToString());

     System.IO.MemoryStream ms = new System.IO.MemoryStream(bytIn, 0, bytIn.Length);


     mobjCryptoService.Key = bytKey;
     mobjCryptoService.IV = bytKey;

     ICryptoTransform encrypto = mobjCryptoService.CreateDecryptor();

     CryptoStream cs = new CryptoStream(ms, encrypto, CryptoStreamMode.Read);

     System.IO.StreamReader sr = new System.IO.StreamReader(cs);
     return sr.ReadToEnd();
     }
     }
     */
});

exports.rijndealInPromise = function (text) {
    var deferred = Q.defer();
    this.rijndael(text, function (err, result) {
        if (err) {
            logger.error(err);
            return deferred.reject('服务器异常');
        }

        deferred.resolve(result);
    });


    return deferred.promise;
};