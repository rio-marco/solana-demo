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

        $('#alertContainer').removeClass('display-none').html(alertHtml).hide().fadeIn(300);

        $('html, body').animate({
            scrollTop: $('#alertContainer').offset().top - 100
        }, 300);
    };

    function clearAlert() {
        $('#alertContainer').addClass('display-none').empty();
    };

    async function copyToClipboard(text, $btn) {
        if (!text) return;

        const originalHtml = $btn ? $btn.html() : '';

        try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(text);
            } else {
                const $tempInput = $('<textarea>').val(text).css({ position: 'fixed', left: '-9999px', opacity: '0' }).appendTo('body');

                $tempInput[0].focus();
                $tempInput[0].select();

                document.execCommand('copy');

                $tempInput.remove();
            };

            if ($btn) {
                $btn.html('<i class="fa-solid fa-check text-success"></i>');
                setTimeout(() => $btn.html(originalHtml), 2000);
            };
        } catch (err) {
            console.error('Copy failed:', err);
        };
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
                    clearAlert();
                } else {
                    $('#platformAddress').text('No address generated yet.');
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
    };

    $('#btnNewAddress').on('click', function () {
        checkAndLoadPlatformAddress(true);
    });

    $('#btnCopyAddress').on('click', function () {
        if (!currentPlatformAddress) {
            showAlert("Platform address is not available to copy.");
            return;
        };

        copyToClipboard(currentPlatformAddress, $(this));
    });

    $('#btnGenerateMemo').on('click', function () {
        const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
        const generatedMemo = `MEMO-${randomHex}`;
        $('#memoInput').val(generatedMemo).removeClass('is-invalid');
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

    function validateDepositInputs() {
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

        const validatedData = validateDepositInputs();
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

                    showAlert('Deposit transaction confirmed on Solana blockchain!', 'success');

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

    function validateWithdrawInputs() {
        let isValid = true;
        const toAddress = $('#withdrawToAddressInput').val().trim();
        const memo = $('#withdrawMemoInput').val().trim();
        const amount = $('#withdrawAmountInput').val().trim();

        $('#withdrawToAddressInput, #withdrawMemoInput, #withdrawAmountInput').removeClass('is-invalid');

        if (!toAddress || toAddress.length < 32) {
            $('#withdrawToAddressInput').addClass('is-invalid');
            $('#withdrawToAddressError').text('Please enter a valid Solana wallet address.');
            isValid = false;
        };

        if (!memo || memo.length < 1) {
            $('#withdrawMemoInput').addClass('is-invalid');
            $('#withdrawMemoError').text('Please enter a valid memo string.');
            isValid = false;
        };

        const numAmount = Number(amount);
        if (!amount || isNaN(numAmount) || numAmount <= 0) {
            $('#withdrawAmountInput').addClass('is-invalid');
            $('#withdrawAmountError').text('Please enter a valid SOL withdraw amount.');
            isValid = false;
        };

        return isValid ? { toAddress, memo, amount: numAmount } : null;
    }

    $('#withdrawToAddressInput, #withdrawMemoInput, #withdrawAmountInput').on('input', function () {
        $(this).removeClass('is-invalid');
    });

    $('#withdrawForm').on('submit', function (e) {
        e.preventDefault();
        clearAlert();

        const validatedData = validateWithdrawInputs();
        if (!validatedData) return;

        const $submitBtn = $('#btnSubmitWithdraw');
        $submitBtn.prop('disabled', true);

        $('#btnWithdrawText').addClass('display-none');
        $('#btnWithdrawSpinner').removeClass('display-none');

        $.ajax({
            url: '/api/withdraw/create',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(validatedData),
            dataType: 'json',
            success: function (response) {
                if (response.success && response.signature) {
                    $('#withdrawResAmount').text(`${Number(response.amount).toFixed(4)} SOL`);
                    $('#withdrawResMemo').text(response.memo);
                    $('#withdrawResWithdrawalId').text(response.withdrawId);

                    const signature = response.signature || '--';
                    const shortSig = signature.length > 20
                        ? signature.substring(0, 10) + '...' + signature.substring(signature.length - 10)
                        : signature;

                    $('#withdrawResSignature').text(shortSig).attr('title', signature);

                    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${solanaNetwork}`;
                    $('#withdrawResExplorerLink').attr('href', explorerUrl);

                    $('#withdrawResultCard').removeClass('display-none').hide().slideDown(400);

                    showAlert('Withdrawal transaction submitted and confirmed on-chain!', 'success');

                    fetchPlatformBalance();
                    fetchWithdrawList();

                    $('#withdrawForm')[0].reset();
                } else {
                    console.error("response Error message-------->", response.message);
                    showAlert("Withdrawal failed.");
                };
            },
            error: function (xhr) {
                const errResponse = xhr.responseJSON || {};
                const errMsg = errResponse.message || 'Deposit processing failed.';
                console.error("errMsg-------->", errMsg);
                showAlert("Withdrawal processing failed", "danger");
            },
            complete: function () {
                $submitBtn.prop('disabled', false);
                $('#btnWithdrawSpinner').addClass('display-none');
                $('#btnWithdrawText').removeClass('display-none');
            },
        });
    });

    function fetchWithdrawList() {
        $.ajax({
            url: '/api/withdraw/list',
            method: 'GET',
            dataType: 'json',
            success: function (response) {
                const $tbody = $('#withdrawListTbody');
                $tbody.empty();

                if (response.success && response.withdrawals && response.withdrawals.length > 0) {
                    response.withdrawals.forEach(function (item) {
                        const sig = item.transactionSignature || item.withdrawId || 'N/A';
                        const explorerUrl = sig !== 'N/A'
                            ? `https://explorer.solana.com/tx/${sig}?cluster=${solanaNetwork}`
                            : '#';
                        const createdDate = item.createdAt
                            ? new Date(item.createdAt).toLocaleString()
                            : 'N/A';

                        const tr = `
                            <tr>
                                <td>
                                    <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="text-decoration-none text-primary fw-500 text-break">
                                        ${sig}
                                    </a>
                                </td>
                                <td class="font-sans text-muted fs-7">
                                    ${createdDate}
                                </td>
                                <td class="text-end text-nowrap">
                                    <button type="button" class="btn btn-sm btn-outline-secondary action-icon-btn me-1 btn-copy-tx" data-url="${explorerUrl}" data-sig="${sig}" title="Copy Transaction Hash / URL">
                                        <i class="fa-regular fa-copy"></i>
                                    </button>
                                    <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary action-icon-btn" title="Open in Explorer">
                                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                    </a>
                                </td>
                            </tr>
                        `;
                        $tbody.append(tr);
                    });
                } else {
                    $tbody.html(`
                        <tr>
                            <td colspan="3" class="text-center text-muted py-4 font-sans fs-7">
                                No withdrawals recorded yet.
                            </td>
                        </tr>
                    `);
                };
            },
            error: function (xhr) {
                const errResponse = xhr.responseJSON || {};
                const errMsg = errResponse.message || "Failed to fetch withdrawal list.";
                console.error("fetchWithdrawList error-------->", errMsg);
            },
        });
    };

    $(document).on('click', '.btn-copy-tx', function () {
        const sig = $(this).data('sig') || $(this).data('url');
        copyToClipboard(sig, $(this));
    });

    $('#btnRefreshWithdrawList').on('click', function () {
        fetchWithdrawList();
    });

    $('#btnDecodeTx').on('click', function () {
        clearAlert();
        const txId = $('#decodeTxInput').val().trim();

        if (!txId) {
            showAlert('Please paste a valid Transaction Id (Signature).');
            return;
        };

        const $btn = $('#btnDecodeTx');
        $btn.prop('disabled', true);
        $('#btnDecodeText').addClass('display-none');
        $('#btnDecodeSpinner').removeClass('display-none');

        $.ajax({
            url: '/api/transaction/decode',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ transactionId: txId }),
            dataType: 'json',
            success: function (response) {
                if (response.success && response.transaction) {
                    const jsonStr = JSON.stringify(response.transaction, null, 2);
                    $('#decodedJsonCode').text(jsonStr);
                    $('#decodedJsonContainer').removeClass('display-none').hide().slideDown(300);
                } else {
                    showAlert(response.message || 'Could not decode transaction.');
                    $('#decodedJsonContainer').addClass('display-none');
                };
            },
            error: function (xhr) {
                const errResponse = xhr.responseJSON || {};
                showAlert(errResponse.message || 'Failed to decode transaction.', 'danger');
                $('#decodedJsonContainer').addClass('display-none');
            },
            complete: function () {
                $btn.prop('disabled', false);
                $('#btnDecodeSpinner').addClass('display-none');
                $('#btnDecodeText').removeClass('display-none');
            },
        });
    });

    $('#btnCopyJson').on('click', function () {
        const jsonText = $('#decodedJsonCode').text();
        copyToClipboard(jsonText, $(this));
    });

    checkAndLoadPlatformAddress();
    fetchPlatformBalance();
    fetchWithdrawList();
});