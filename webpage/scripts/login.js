//js scripting for createAccount page
window.onload = function () {
    const form = document.getElementById('login-form');

    //event listener for form submission
    form.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent form submission

        //frontend validation
        var email = document.getElementById('email').value;
        var password = document.getElementById('password').value;

        // Perform your validation logic here
        if (!validateEmail(email) || !validatePassword(password)) {
            window.alert('Credentials invalid');
            return;
        }

        //allow form submission
        form.submit();
        
    });
};


function validateEmail(email) {
    let valid = false;

    //matches email format
    const regex = /\S+@\S+\.\S+/;
    if (regex.test(email)){
        valid = true;
    }

    return valid;
}


function validatePassword(password) {
    return (password && password.trim().length !== 0);
}


function togglePassword() {
    var passwordField = document.getElementById("password");

    if (passwordField.type === "password") {
        passwordField.type = "text";
    } else {
        passwordField.type = "password";
    }
}