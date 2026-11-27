/* Independent SHA-256 first-word implementation, FIPS 180-4. ASCII challenges
 * only; bounded proof work, no downloaded code, native timers or WebCrypto. */
var vodixShaConstants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function vodixRotate(x,n){return (x>>>n)|(x<<(32-n));}
function vodixShaWord(text) {
    var words=[], n=text.length, blocks=((n+9+63)>>>6)*16, i;
    for(i=0;i<blocks;i++)words[i]=0;
    for(i=0;i<n;i++)words[i>>>2]|=text.charCodeAt(i)<<(24-(i%4)*8);
    words[n>>>2]|=0x80<<(24-(n%4)*8);words[blocks-1]=n*8;
    var h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],w=new Array(64);
    for(var offset=0;offset<blocks;offset+=16){
        for(i=0;i<64;i++){
            if(i<16)w[i]=words[offset+i];
            else{var x=w[i-15],y=w[i-2];w[i]=((((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3))+w[i-16]+(((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10))+w[i-7])|0;}
        }
        var a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],z=h[7];
        for(i=0;i<64;i++){
            var t1=(z+(((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)))+((e&f)^(~e&g))+vodixShaConstants[i]+w[i])|0;
            var t2=((((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)))+((a&b)^(a&c)^(b&c)))|0;
            z=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;
        }
        var v=[a,b,c,d,e,f,g,z];for(i=0;i<8;i++)h[i]=(h[i]+v[i])|0;
    }
    return h[0]>>>0;
}
function vodixProof(challenge,bits,ctx) {
    var limits=ENDPOINTS.vodix;
    if(typeof challenge!=='string'||!/^[-A-Za-z0-9_:.]{1,256}$/.test(challenge)||!Number.isInteger(bits)||bits<1||bits>limits.maxBits)throw new Error('Vodix: unsupported challenge');
    var threshold=Math.pow(2,32-bits),started=Date.now();
    for(var n=0;n<limits.maxAttempts;n++){
        if(n%128===0&&(Date.now()-started>=limits.proofMs||selectionBudget(ctx)))break;
        if(vodixShaWord(challenge+':'+n)<threshold)return String(n);
    }
    throw new Error('Vodix: proof budget reached');
}
