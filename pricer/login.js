var email;
var password;
var credentials;// = '{"email": "my-email","password":"my-password"}';
var jwt = null;


function login()
{          
    email = window.prompt("Please enter your email:","some.person@some.place");
    password = window.prompt("Please enter your password:","L0ts_0f__W0rds___W0rlds____0f_____Wisd0m");
    credentials = '{"email": "' + email +'","password":"' + password +'"}';
    $.ajax(
        {
            url: "https://www.juungle.net/api/v1/user/login",
            type: 'POST',
            contentType: "application/json",
            charset: "utf-8",
            datatype: 'json',
            data: credentials,
            success: function(data)
            {
                console.log(JSON.stringify(data));
                jwt = data.jwtToken;
                console.log(jwt);
                var priceButton = document.getElementById("FixAll");
                priceButton.disabled = false;
            },
            error: function()
            {
                alert("Cannot login.");
            }
        })
        
        
}