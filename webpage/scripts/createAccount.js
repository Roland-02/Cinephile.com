//js scripting for createAccount page
window.onload = function () {
    const form = document.getElementById('createAccount-form');

    //event listener for form submission
    form.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent form submission

        //frontend validation
        var email = document.getElementById('email').value;
        var password = document.getElementById('password').value;
        var confirmPassword = document.getElementById('confPassword').value;

        // Perform your validation logic here
        /*
        if (!validateEmail(email)) {
            return document.getElementById('emailError').hidden = false;
        }else{
            document.getElementById('emailError').hidden = true;
        }

        if (!validatePassword(password)) {
            return document.getElementById('passwordError').hidden = false;
        }else{
            document.getElementById('passwordError').hidden = true;
        }

        if (password !== confirmPassword) {
            return document.getElementById('confPasswordError').hidden = false;
        }else{
            document.getElementById('confPasswordError').hidden = true;
        }
        */

        //allow form submission
        form.submit();
        
    });
};


function validateEmail(email) {
    let valid = false;

    //matches email format
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (regex.test(email)){
        valid = true;
    }

    return valid;
}


function validatePassword(password) {
    let valid = false;

    //6 char and an uppercase letter
    const regex = /^(?=.*[A-Z]).{6,}$/;
    if (regex.test(password)){
        valid = true
    };

    return valid; // Replace with your validation logic
}


function togglePassword() {
    var passwordField = document.getElementById("password");
    var confirmPasswordField = document.getElementById("confPassword");

    if (passwordField.type === "password" && confirmPasswordField.type === "password") {
        passwordField.type = "text";
        confirmPasswordField.type = "text";
    } else {
        passwordField.type = "password";
        confirmPasswordField.type = "password";
    }
}


