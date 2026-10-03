$(document).ready(function () { });

$(document).on("keypress", "#nameInput, #email, #password, #confirm_password", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        $("#btnSignupSubmit").click();
    };
});

$(document).on("click", "#btnSignupSubmit", function (e) {
    e.preventDefault();

    const $btn = $(this);

    const name = $('#nameInput').val().trim();
    const email = $('#email').val().trim();
    const password = $('#password').val().trim();
    const confirmPassword = $('#confirm_password').val().trim();

    const validations = [
        [!name, "Please enter your full name"],
        [!email, "Please enter your email"],
        [!password, "Please enter your password"],
        [password && password.length < 6, "Password must be at least 6 characters"],
        [!confirmPassword, "Please confirm your password"],
        [password && confirmPassword && password !== confirmPassword, "Password and confirm password must be same!"],
    ];

    for (const [condition, message] of validations) {
        if (condition) {
            showToast(false, message);
            return;
        };
    };

    const payload = {
        name: name,
        email: email,
        password: password,
    };

    $btn.prop('disabled', true);
    $('#signupBtnText').addClass('d-none');
    $('#signupBtnSpinner').removeClass('d-none');

    postAjaxCall("/api/auth/signup", payload, function (response) {
        showToast(response.success, response.message);

        $btn.prop('disabled', false);
        $('#signupBtnText').removeClass('d-none');
        $('#signupBtnSpinner').addClass('d-none');

        if (response.flag == 1) {
            setTimeout(() => {
                window.location.href = response?.data?.redirectUrl || `/verify-otp?email=${encodeURIComponent(email)}`;
            }, 1000);
        };
    });
});