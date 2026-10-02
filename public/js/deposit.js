$(document).ready(function () {
    'use strict';

    let currentPlatformAddress = null;
    const solanaNetwork = 'devnet';

    function showAlert(message, type = 'danger') {
        const iconClass = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show border-0 shadow-sm rounded-3" role="alert">
                <i class="fa-solid ${iconClass} me-2"></i> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;

        $('#alertContainer').removeClass('display-none').hide().fadeIn(400);

        $('#alertContainer').html(alertHtml);

        $('html, body').animate({
            scrollTop: $('#alertContainer').offset().top - 100
        }, 300);
    };

    function clearAlert() {
        $('#alertContainer').addClass('display-none');
        $('#alertContainer').empty();
    };

    function checkAndLoadPlatformAddress(forceGenerate = false) {
        const url = forceGenerate ? '/api/deposit/address?generate=true' : '/api/deposit/address';

        if (forceGenerate) {
            $('#btnNewAddress').prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin me-2"></i>Generating Address...');
        };

        $.ajax({
            url: url,
            method: 'GET',
            dataType: 'json',
            success: function (response) {
                if (response.success && response.exists && response.address) {
                    currentPlatformAddress = response.address;
                    $('#platformAddress').text(response.address);

                    $('#addressCard').removeClass('display-none').hide().fadeIn(400);
                    // $('#btnNewAddressContainer').addClass('display-none');
                    clearAlert();
                } else {
                    $('#addressCard').addClass('display-none');
                    // $('#btnNewAddressContainer').removeClass('display-none').hide().fadeIn(400);
                };
            },
            error: function (xhr) {
                const err = xhr.responseJSON ? xhr.responseJSON.message : 'Error contacting server';
                console.error("fetchPlatformAddress err-------->", err);
                showAlert("Could not load deposit address.");
            },
            complete: function () {
                $('#btnNewAddress').prop('disabled', false).html('<i class="fa-solid fa-wallet me-2"></i>Generate Address');
            },
        });
    }

    $('#btnNewAddress').on('click', function () {
        checkAndLoadPlatformAddress(true);
    });

    $('#btnCopyAddress').on('click', async function () {

        if (!currentPlatformAddress) {
            console.warn("Platform address is not available.");
            return;
        };

        const $button = $('#btnCopyAddress');
        const originalHtml = $button.html();

        try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(currentPlatformAddress);
            } else {
                const $tempInput = $('<textarea>');

                $tempInput.val(currentPlatformAddress)
                    .css({
                        position: 'fixed',
                        left: '-9999px',
                        top: '0',
                        opacity: '0'
                    }).appendTo('body');

                $tempInput[0].focus();
                $tempInput[0].select();

                const copied = document.execCommand('copy');

                $tempInput.remove();

                if (!copied) {
                    console.error('Copy command failed.');
                };
            };

            $button
                .removeClass('btn-outline-secondary')
                .addClass('btn-success')
                .html('<i class="fa-solid fa-check me-1"></i> Copied!');

            setTimeout(function () {
                $button
                    .removeClass('btn-success')
                    .addClass('btn-outline-secondary')
                    .html(originalHtml);
            }, 2000);
        } catch (error) {
            console.error('Copy failed:', error);
            showAlert("Unable to copy the address. Please copy it manually.");
        };
    });

    function fetchPlatformBalance() {
        const $btn = $('#btnGetBalance');
        $btn.prop('disabled', true).find('i').addClass('fa-spin');

        $.ajax({
            url: '/api/deposit/balance',
            method: 'GET',
            dataType: 'json',
            success: function (response) {
                if (response.success && response.balance !== undefined) {
                    const formattedBalance = Number(response.balance).toFixed(6);
                    $('#platformBalanceDisplay').text(`${formattedBalance} SOL`);
                } else {
                    console.error("fetchPlatformBalance Error message-------->", response.message);
                    showAlert("Failed to retrieve platform balance");
                };
            },
            error: function (xhr) {
                const err = xhr.responseJSON ? xhr.responseJSON.message : 'RPC query failed';
                console.error("fetchPlatformBalance err-------->", err);
                showAlert("Balance check failed");
            },
            complete: function () {
                $btn.prop('disabled', false).find('i').removeClass('fa-spin');
            },
        });
    };

    $('#btnGetBalance').on('click', function () {
        fetchPlatformBalance();
    });

    function validateFormInputs() {
        let isValid = true;

        const memo = $('#memoInput').val().trim();
        const amount = $('#amountInput').val().trim();

        $('#memoInput, #amountInput').removeClass('is-invalid');

        if (!memo || memo.length < 1 || memo.length > 100) {
            $('#memoInput').addClass('is-invalid');
            $('#memoError').text('Memo is required (1 to 100 characters).');
            isValid = false;
        };

        const numAmount = Number(amount);
        if (!amount || isNaN(numAmount) || numAmount <= 0) {
            $('#amountInput').addClass('is-invalid');
            $('#amountError').text('Please enter a valid SOL amount greater than 0.');
            isValid = false;
        };

        return isValid ? { memo, amount: numAmount } : null;
    };

    $('#memoInput, #amountInput').on('input', function () {
        $(this).removeClass('is-invalid');
    });

    $('#depositForm').on('submit', function (e) {
        e.preventDefault();
        clearAlert();

        const validatedData = validateFormInputs();
        if (!validatedData) return;

        const $submitBtn = $('#btnSubmitDeposit');
        $submitBtn.prop('disabled', true);

        $('#btnSubmitText').addClass('display-none');
        $('#btnSubmitSpinner').removeClass('display-none');

        $.ajax({
            url: '/api/deposit/create',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                memo: validatedData.memo,
                amount: validatedData.amount,
            }),
            dataType: 'json',
            success: function (response) {
                if (response.success && response.status === 'CONFIRMED') {
                    $('#resAmount').text(`${Number(response.amount).toFixed(4)} SOL`);
                    $('#resMemo').text(response.memo);
                    $('#resDepositId').text(response.depositId);

                    const signature = response.signature || '--';
                    const shortSig = signature.length > 20
                        ? signature.substring(0, 10) + '...' + signature.substring(signature.length - 10)
                        : signature;

                    $('#resSignature').text(shortSig).attr('title', signature);

                    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${solanaNetwork}`;
                    $('#resExplorerLink').attr('href', explorerUrl);

                    $('#depositResultCard').removeClass('display-none').hide().slideDown(400);
                    $('#depositFormCard').slideUp(300);

                    showAlert('Deposit transaction submitted and confirmed on Solana blockchain!', 'success');

                    fetchPlatformBalance();
                } else {
                    console.error("response Error message-------->", response.message);
                    showAlert("Deposit verification failed.");
                };
            },
            error: function (xhr) {
                const errResponse = xhr.responseJSON || {};
                const errMsg = errResponse.message || 'Deposit processing failed.';
                console.error("errMsg-------->", errMsg);
                showAlert("Deposit processing failed", 'danger');
            },
            complete: function () {
                $submitBtn.prop('disabled', false);
                $('#btnSubmitSpinner').addClass('display-none');
                $('#btnSubmitText').removeClass('display-none');
            },
        });
    });

    $('#btnResetDeposit').on('click', function () {
        $('#depositResultCard').slideUp(300, function () {
            $('#depositForm')[0].reset();
            $('#memoInput, #amountInput').removeClass('is-invalid');
            $('#depositFormCard').slideDown(300);
            clearAlert();
        });
    });

    checkAndLoadPlatformAddress();
    fetchPlatformBalance();
});