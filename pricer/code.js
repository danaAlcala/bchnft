//DEPENDENCIES
const BCHSATOSHIS = 100000000; /* How many Satoshis are in a BCH */

//API URL Params for NFTs
const AVAILABLE = "&priceSatoshisSet=true";
const NOTPURCHASED = "&purchaseTxidUnset=true"; /*Excludes NFT re-listed 
by buyers*/
const MAINUSERID = "&userId=296"; /* Right now you would put your user id here.
I eventually want to get the login function to also grab the user id so you don't
have to manually do this. Until then, get your user id and put it here.*/


//Coingecko API
const COINGECKO = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=usd";


// Global variables

// Parent tokens of artists
var tokenIDs =
{
    "PHOTOYSHOP": "88dac34fd486cdca5d011c0eed7cae661ebc1bd16df949a6b6e22226de44a024",
    "JLV": "0ece7b7a27bd62bf2abecede838321cb65842cbb0ae1398d51d77d264338698d",
    "lucivay": "454f7411a1a5a1af8e310b478fa8deae24fa4d321c499a11229c16085d1b0553"
};


/* Desired USD per artist. Right now I tack on the extra five due to volatility.
It just makes it so I don't have to constantly change the price. Eventually
my goal is to be able to set up a server that automatically pings the API over
time. This will allow me to keep the price closer to the actual desired price.
For example: Instead of $105, I might be able to set it to $101 or maybe even 
$100.25, depending on how OK it is to hammer the server while still respecting
the ping limits. */
var currentUSDPrices =
{
    "PHOTOYSHOP": "105.00",
    "JLV": "155.00",
    "lucivay": "155.00"
}

/* This initializes the object that converts desired USD to BCH */
var currentBCHPrices =
{
    "PHOTOYSHOP": "",
    "JLV": "",
    "lucivay": ""
}

/* This initializes the object that converts desired BCH to Satoshis */
var currentSATOSHIPrices =
{
    "PHOTOYSHOP": "",
    "JLV": "",
    "lucivay": ""
}

var dropDownBox = document.getElementById("artistsdropdown"); 

var allMyTokens = [];

var receivedJSONdata;// I need to find a better name for this one.
var NFTs;

var tokenID = tokenIDs.PHOTOYSHOP;


var jsonurl = "https://www.juungle.net/api/v1/nfts?groupTokenId=" + tokenID + MAINUSERID + AVAILABLE + NOTPURCHASED;
var soldTokens = [];
var BCHtoUSD = 0;

var profile = dropDownBox.value;

function updateFromDropDown()
{
    profile = dropDownBox.value;
    updateMainTokenID();
    updateJSONURL();
    clearTable();
    getUSDPrice(getData);
    
    console.log(profile);
    console.log(tokenID);
}

function updateJSONURL()
{
    jsonurl = "https://www.juungle.net/api/v1/nfts?groupTokenId=" + tokenID + MAINUSERID + AVAILABLE + NOTPURCHASED;
}

function updateMainTokenID()
{
    switch (profile)
    {
        case "photoyshop":
            {
                tokenID = tokenIDs.PHOTOYSHOP;
                break;
            }
        case "jlv":
            {
                tokenID = tokenIDs.JLV;
                break;
            }
        case "lucivay":
            {
                tokenID = tokenIDs.lucivay;
                break;
            }
    }
}

function satoshisToBCH(paramSatoshis)
{
    return paramSatoshis / BCHSATOSHIS;
}

function BCHtoUSDollars(paramBCH)
{
    return paramBCH * BCHtoUSD;
}

function getUSDPrice(callback)
{
    $.getJSON(COINGECKO, function(data)
    {
        let BCHtoUSDdata = data;

        let dataButton = document.getElementById("Data");
        let bigMoney = document.getElementById("USD");
        let preferredPrice = document.getElementById("PRICE");
        let newSatoshis = document.getElementById("SATOSHIS");

        let bchPrice;
        let satoshiPrice;
        let usdPrice;
        
        BCHtoUSD = BCHtoUSDdata["bitcoin-cash"]["usd"];
        console.log(BCHtoUSD);

        switch (profile) // Calculations based off of preffered USD price of client
        {

            case "photoyshop":
                {
                    usdPrice = currentUSDPrices.PHOTOYSHOP;
                    break;
                }
            case "jlv":
                {
                    usdPrice = currentUSDPrices.JLV;
                    break;
                }
            case "lucivay":
                {
                    usdPrice = currentUSDPrices.lucivay;
                    break;
                }
        }

        bchPrice = (usdPrice / BCHtoUSD).toFixed(8);
        satoshiPrice = bchPrice * BCHSATOSHIS;

        switch (profile) // update client prices in BCH and Satoshis
        {

            case "photoyshop":
                {
                    currentBCHPrices.PHOTOYSHOP = bchPrice;
                    currentSATOSHIPrices.PHOTOYSHOP = satoshiPrice;
                    break;
                }
            case "jlv":
                {
                    currentBCHPrices.JLV = bchPrice;
                    currentSATOSHIPrices.JLV = satoshiPrice;
                    break;
                }
            case "lucivay":
                {
                    currentBCHPrices.lucivay = bchPrice;
                    currentSATOSHIPrices.lucivay = satoshiPrice;
                    break;
                }
        }

        console.log(bchPrice);

        bigMoney.innerHTML = "1 BCH = $" + BCHtoUSD.toString();
        preferredPrice.innerHTML = "$" + usdPrice.toString() + " = " + bchPrice.toString() + " BCH";
        newSatoshis.innerHTML = "$" + usdPrice.toString() + " = " + satoshiPrice.toString() + " Satoshis";
        dataButton.disabled = false;
        callback(jsonurl);
    })
}

function getNFTData(paramURL)
{
    $.getJSON(paramURL,function(data)
    {
        receivedJSONdata = data;
        NFTs = receivedJSONdata.nfts;
        let i;
        for (i=NFTs.length-1; i >= 0; i--)
        {
            let tokenName = NFTs[i].tokenName;
            let NFTID = NFTs[i].id;
            let tokenPrice = satoshisToBCH(NFTs[i].priceSatoshis).toString();
            let tokenUSD = BCHtoUSDollars(tokenPrice).toFixed(2);
            //console.log(tokenName + ": " + tokenPrice + " BCH $" + tokenUSD);
            buildTable(NFTID, tokenName, tokenUSD);
            allMyTokens.push(NFTID);
            if (NFTs[i].userId !== 296)
            {
                soldTokens.push(NFTs[i]);
            }

        }
        console.log(soldTokens);
        console.log(allMyTokens);
        console.log(dropDownBox.value);
    }
    );
}

function clearTable()
{
    var tableToClear = document.getElementById("myTable");
    let i;
    for (i=1; i < tableToClear.rows.length;)
    {
        tableToClear.deleteRow(i);
    }
    console.log("Clear table");
}

function clearAllMyTokensArray()
{
    allMyTokens = [];
}

function getData(paramURL)
{
    clearAllMyTokensArray();
    clearTable();
    getNFTData(paramURL);    
}

function buildTable(c0, c1, c2)
{    
    var btn = document.createElement("button");
    btn.innerHTML = "Fix";
    var table = document.getElementById("myTable");
    var row = table.insertRow(1);
    var cell0 = row.insertCell(0);
    var cell1 = row.insertCell(1);
    var cell2 = row.insertCell(2);
    var cell3 = row.insertCell(3);
    cell0.innerHTML = c0;
    cell1.innerHTML = c1;
    cell2.innerHTML = c2;
    cell3.innerHTML = "placeholder";    
}

function setPrice(paramID, paramPrice)
{
    var passThisData = {
        nftId: paramID,
        priceSatoshis: paramPrice
      };
    var header = {
        "X-Access-Token": jwt
    };
    var priceSetCommunication = $.ajax( // This executes when setPrice() executes
            {
                url: "https://www.juungle.net/api/v1/user/nfts/set_price",
                headers: header,
                type: 'POST',
                contentType: "application/json",
                charset: "utf-8",
                datatype: 'json',
                data: JSON.stringify(passThisData),
                success: function(data)
                {
                    var responseHeaders = priceSetCommunication.getAllResponseHeaders();
                    console.log(responseHeaders);
                    console.log(JSON.stringify(data));
                },
                error: function(xhr, status, error) {
                    console.log(xhr,response);
                    console.log(xhr.responseText);
                }
            })
            
}

function fixAllPrices(callback)
{
    let setThisSatoshiPrice;
    switch (profile)
    {
        case "photoyshop":
            {
                setThisSatoshiPrice = currentSATOSHIPrices.PHOTOYSHOP;
                break;
            }
        case "jlv":
            {
                setThisSatoshiPrice = currentSATOSHIPrices.JLV;
                break;
            }
        case "lucivay":
            {
                setThisSatoshiPrice = currentSATOSHIPrices.lucivay;
                break;
            }
    }
    /* I need to set this to only fire setPrice if a certain condition is met. */
    let i;
    for (i=0; i < allMyTokens.length; i++)
    {
        setPrice(allMyTokens[i], setThisSatoshiPrice);
        //console.log(allMyTokens[i]);
    }
    setTimeout(() => { callback(jsonurl); }, 2000);
    //setPrice(4837, currentSATOSHIPrices.PHOTOYSHOP);
}
getUSDPrice(getData);
