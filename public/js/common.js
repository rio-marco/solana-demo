$(document).ready(function () { });

$(document).on("click", ".toggle-password.login", function () {
    const container = $(this).closest(".form-group");
    const passwordInput = container.find(".password-input");
    const toggleIcon = $(this).find("i");
    const type = passwordInput.attr("type");

    if (type === "password") {
        passwordInput.attr("type", "text");
        toggleIcon.removeClass("ti-eye-off").addClass("ti-eye");
    } else {
        passwordInput.attr("type", "password");
        toggleIcon.removeClass("ti-eye").addClass("ti-eye-off");
    }
});

function showToast(flag, val, time) {
    $("#toast").remove();
    if (!val) return;

    let iconClass = "ti ti-alert-triangle";
    let toastClass = "toast-container warning";
    if (flag === 1) {
        iconClass = "ti ti-circle-check";
        toastClass = "toast-container success";
    } else if (flag === 0 || flag === 2) {
        iconClass = "ti ti-exclamation-circle text-danger";
        toastClass = "toast-container error";
    };

    const noti_html = `
        <div id="toast" class="${toastClass}">
            <div class="toast-content">
                <i class="${iconClass}"></i> ${val}
            </div>
        </div>
    `;

    $("body").append(noti_html);

    if (typeof time === "undefined" || time === null) {
        time = 5000;
    };

    setTimeout(function () {
        $("#toast").fadeOut(300, function () {
            $(this).remove();
        });
    }, time);
}

function AjaxCall(url, callback, method = "GET") {
    $.ajax({
        type: method.toUpperCase(),
        url,
        success: function (response) {
            if (response?.flag === 8) {
                window.location.reload();
            } else {
                callback(response);
            }
        },
        error: function (err) {
            console.error("Error:", err);
        }
    });
};

function postAjaxCall(url, data, callback) {
    $.ajax({
        url: url,
        type: "POST",
        data: data,
        success: function (response) {
            if (response?.flag === 8) {
                window.location.reload();
            } else {
                callback(response);
            }
        },
    });
}

function postFileCall(url, formData, callback) {
    $.ajax({
        type: "POST",
        url: url,
        data: formData,
        contentType: false,
        processData: false,
        success: function (response) {
            if (response?.flag === 8) {
                window.location.reload();
            } else {
                callback(response);
            }
        },
        error: function (err) {
            console.error("Error:", err);
        },
    });
};