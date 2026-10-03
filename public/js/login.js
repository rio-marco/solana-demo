$(document).ready(function () { });

$(document).on("input", "#email, #password", function () {
    const email = $("#email").val();
    const password = $("#password").val();

    if (email && password) {
        $("#login").attr("disabled", false);
    } else {
        $("#login").attr("disabled", true);
    };
});

$(document).on('keypress', '#email, #password', function (e) {
    if (e.key === "Enter") {
        $('#btnLoginSubmit').click();
    }
});

$(document).on("click", "#btnLoginSubmit", function (e) {
    e.preventDefault();

    const $btn = $(this);

    const email = $('#email').val().trim();
    const password = $('#password').val();

    if (!email) {
        showToast(0, "Please enter your email");
        return;
    };

    if (!password) {
        showToast(0, "Please enter your password");
        return;
    };

    $btn.prop('disabled', true);
    $('#loginBtnText').addClass('d-none');
    $('#loginBtnSpinner').removeClass('d-none');

    const payload = {
        email: email,
        password: password,
    };

    postAjaxCall("/api/auth/login", payload, function (response) {
        showToast(response.flag, response.msg);

        $btn.prop('disabled', false);
        $('#loginBtnText').removeClass('d-none');
        $('#loginBtnSpinner').addClass('d-none');

        const redirectUrl = response?.data?.redirectUrl;

        if (response.flag == 1 || (response?.data?.unverified === true || response?.data?.unverified === "true")) {
            setTimeout(() => {
                window.location.href = redirectUrl || "/";
            }, 1000);
        };
    });
});