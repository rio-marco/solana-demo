$(document).ready(function () {
    'use strict';

    let currentPlatformAddress = null;
    const solanaNetwork = 'devnet';

    let currentWithdrawPage = 1;
    let currentNotificationPage = 1;
    const defaultLimit = 10;

    // Real-Time WebSockets Setup
    if (window.CURRENT_USER_ID && typeof io !== 'undefined') {
        const socket = io();

        socket.on('connect', function () {
            console.log('[Socket.io] Connected to server socket:', socket.id);
            socket.emit('joinRoom', `user_${window.CURRENT_USER_ID}`);
        });

        socket.on('notification', function (data) {
            console.log('[Socket.io] Notification received:', data);

            // Update Total Balance
            if (data.newBalance !== undefined) {
                const formatted = Number(data.newBalance).toFixed(6);
                $('#userWalletBalance').text(`${formatted} SOL`);
                $('.userWalletBalanceDisplay').text(`${formatted} SOL`);
            }

            // Show Toast Alert
            if (data.notification) {
                showToastNotification(data.notification);
                fetchNotificationsList(1);
            }

            // Refresh lists
            fetchWithdrawList(currentWithdrawPage);
        });
    }

    function showToastNotification(notif) {
        const icon = notif.type === 'DEPOSIT' ? 'fa-arrow-down-to-bracket text-success' : 'fa-arrow-up-from-bracket text-primary';
        const bgHeader = notif.type === 'DEPOSIT' ? 'bg-success text-white' : 'bg-primary text-white';

        const toastHtml = `
            <div class="toast show shadow-lg border-0 rounded-3 mb-2" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header ${bgHeader} rounded-top-3">
                    <i class="fa-solid ${icon} me-2"></i>
                    <strong class="me-auto">${notif.title || 'Notification'}</strong>
                    <small class="text-white-50">Just now</small>
                    <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body bg-white rounded-bottom-3 text-dark fs-7">
                    ${notif.message}
                </div>
            </div>
        `;

        const $toast = $(toastHtml).appendTo('#realtimeToastContainer');
        setTimeout(function () {
            $toast.fadeOut(500, function () { $toast.remove(); });
        }, 6000);
    }

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
    }

    function clearAlert() {
        $('#alertContainer').addClass('display-none').empty();
    }

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
            }

            if ($btn) {
                $btn.html('<i class="fa-solid fa-check text-success"></i>');
                setTimeout(() => $btn.html(originalHtml), 2000);
            }
        } catch (err) {
            console.error('Copy failed:', err);
        }
    }

    function checkAndLoadPlatformAddress(forceGenerate = false) {
        const url = forceGenerate ? '/api/deposit/address?generate=true' : '/api/deposit/address';

        if (forceGenerate) {
            $('#btnNewAddress').prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin me-2"></i>Generating Address...');
        }

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
                }
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

    $('#btnCopyAddress').on('click', function () {
        if (!currentPlatformAddress) {
            showAlert("Platform address is not available to copy.");
            return;
        }
        copyToClipboard(currentPlatformAddress, $(this));
    });

    $('#btnGenerateMemo').on('click', function () {
        if (window.USER_MEMO) {
            $('#memoInput').val(window.USER_MEMO).removeClass('is-invalid');
        } else {
            const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase();
            const generatedMemo = `MEMO-${randomHex}`;
            $('#memoInput').val(generatedMemo).removeClass('is-invalid');
        }
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
                }
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
    }

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
        }

        const numAmount = Number(amount);
        if (!amount || isNaN(numAmount) || numAmount <= 0) {
            $('#amountInput').addClass('is-invalid');
            $('#amountError').text('Please enter a valid SOL amount greater than 0.');
            isValid = false;
        }

        return isValid ? { memo, amount: numAmount } : null;
    }

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

                    if (response.updatedWalletBalance !== undefined) {
                        const formatted = Number(response.updatedWalletBalance).toFixed(6);
                        $('#userWalletBalance').text(`${formatted} SOL`);
                        $('.userWalletBalanceDisplay').text(`${formatted} SOL`);
                    }

                    const signature = response.signature || '--';
                    const shortSig = signature.length > 20
                        ? signature.substring(0, 10) + '...' + signature.substring(signature.length - 10)
                        : signature;

                    $('#resSignature').text(shortSig).attr('title', signature);

                    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${solanaNetwork}`;
                    $('#resExplorerLink').attr('href', explorerUrl);

                    $('#depositResultCard').removeClass('display-none').hide().slideDown(400);
                    $('#depositFormCard').slideUp(300);

                    showAlert('Deposit transaction confirmed and added to your wallet balance!', 'success');

                    fetchPlatformBalance();
                } else {
                    console.error("response Error message-------->", response.message);
                    showAlert("Deposit verification failed.");
                }
            },
            error: function (xhr) {
                const errResponse = xhr.responseJSON || {};
                const errMsg = errResponse.message || 'Deposit processing failed.';
                console.error("errMsg-------->", errMsg);
                showAlert(errMsg, 'danger');
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
            $('#amountInput').val('');
            if (window.USER_MEMO) {
                $('#memoInput').val(window.USER_MEMO);
            }
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
        }

        if (!memo || memo.length < 1) {
            $('#withdrawMemoInput').addClass('is-invalid');
            $('#withdrawMemoError').text('Please enter a valid memo string.');
            isValid = false;
        }

        const numAmount = Number(amount);
        if (!amount || isNaN(numAmount) || numAmount <= 0) {
            $('#withdrawAmountInput').addClass('is-invalid');
            $('#withdrawAmountError').text('Please enter a valid SOL withdraw amount.');
            isValid = false;
        }

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

                    if (response.updatedWalletBalance !== undefined) {
                        const formatted = Number(response.updatedWalletBalance).toFixed(6);
                        $('#userWalletBalance').text(`${formatted} SOL`);
                        $('.userWalletBalanceDisplay').text(`${formatted} SOL`);
                    }

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
                    fetchWithdrawList(1);

                    $('#withdrawForm')[0].reset();
                    if (window.USER_MEMO) {
                        $('#withdrawMemoInput').val(window.USER_MEMO);
                    }
                } else {
                    console.error("response Error message-------->", response.message);
                    showAlert(response.message || "Withdrawal failed.", 'danger');
                }
            },
            error: function (xhr) {
                const errResponse = xhr.responseJSON || {};
                const errMsg = errResponse.message || 'Withdrawal processing failed.';
                console.error("errMsg-------->", errMsg);
                showAlert(errMsg, "danger");
            },
            complete: function () {
                $submitBtn.prop('disabled', false);
                $('#btnWithdrawSpinner').addClass('display-none');
                $('#btnWithdrawText').removeClass('display-none');
            },
        });
    });

    // Paginated Withdraw List Retrieval
    function fetchWithdrawList(page = 1, limit = defaultLimit) {
        currentWithdrawPage = page;
        $.ajax({
            url: `/api/withdraw/list?page=${page}&limit=${limit}`,
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
                                <td><span class="badge bg-light text-dark border fw-600 font-mono">${Number(item.amount).toFixed(4)} SOL</span></td>
                                <td><span class="badge bg-success text-white">CONFIRMED</span></td>
                                <td class="font-sans text-muted fs-7">${createdDate}</td>
                            </tr>
                        `;
                        $tbody.append(tr);
                    });

                    renderPagination(
                        '#withdrawPaginationContainer',
                        '#withdrawPaginationInfo',
                        '#withdrawPaginationUl',
                        response.pagination,
                        function (newPage) { fetchWithdrawList(newPage, limit); }
                    );
                } else {
                    $tbody.html(`
                        <tr>
                            <td colspan="4" class="text-center text-muted py-4 font-sans fs-7">
                                No withdrawals recorded yet.
                            </td>
                        </tr>
                    `);
                    $('#withdrawPaginationContainer').addClass('display-none');
                }
            },
            error: function (xhr) {
                const errResponse = xhr.responseJSON || {};
                console.error("fetchWithdrawList error-------->", errResponse.message);
            },
        });
    }

    // Paginated Notifications List Retrieval
    function fetchNotificationsList(page = 1, limit = defaultLimit) {
        currentNotificationPage = page;
        $.ajax({
            url: `/api/notifications?page=${page}&limit=${limit}`,
            method: 'GET',
            dataType: 'json',
            success: function (response) {
                const $container = $('#notificationsList');
                $container.empty();

                if (response.success) {
                    const pagination = response.pagination || {};
                    if (pagination.unreadCount > 0) {
                        $('#unreadBadgeCount').removeClass('display-none').text(pagination.unreadCount);
                    } else {
                        $('#unreadBadgeCount').addClass('display-none');
                    }

                    if (response.notifications && response.notifications.length > 0) {
                        response.notifications.forEach(function (n) {
                            const iconClass = n.type === 'DEPOSIT'
                                ? 'fa-arrow-down-to-bracket text-success'
                                : 'fa-arrow-up-from-bracket text-primary';
                            const dateStr = new Date(n.createdAt).toLocaleString();
                            const unreadClass = !n.isRead ? 'border-start border-4 border-primary bg-light' : '';

                            const card = `
                                <div class="p-3 rounded-3 border shadow-xs ${unreadClass}">
                                    <div class="d-flex align-items-center justify-content-between mb-1">
                                        <span class="fw-700 text-dark fs-7"><i class="fa-solid ${iconClass} me-2"></i>${n.title}</span>
                                        <small class="text-muted fs-8 font-sans">${dateStr}</small>
                                    </div>
                                    <div class="text-secondary fs-7">${n.message}</div>
                                </div>
                            `;
                            $container.append(card);
                        });

                        renderPagination(
                            '#notificationPaginationContainer',
                            '#notificationPaginationInfo',
                            '#notificationPaginationUl',
                            pagination,
                            function (newPage) { fetchNotificationsList(newPage, limit); }
                        );
                    } else {
                        $container.html('<div class="text-center text-muted py-4">No notifications yet.</div>');
                        $('#notificationPaginationContainer').addClass('display-none');
                    }
                }
            },
            error: function (xhr) {
                console.error("fetchNotificationsList error-------->", xhr.responseJSON);
            },
        });
    }

    // Generic Pagination UI Renderer
    function renderPagination(containerId, infoId, ulId, pagination, callback) {
        if (!pagination || pagination.totalPages <= 1) {
            $(containerId).addClass('display-none');
            return;
        }

        $(containerId).removeClass('display-none');

        const page = pagination.page;
        const totalPages = pagination.totalPages;
        const total = pagination.total;
        const start = (page - 1) * pagination.limit + 1;
        const end = Math.min(page * pagination.limit, total);

        $(infoId).text(`Showing ${start} - ${end} of ${total} records`);

        const $ul = $(ulId);
        $ul.empty();

        // Prev button
        const prevDisabled = page === 1 ? 'disabled' : '';
        $ul.append(`
            <li class="page-item ${prevDisabled}">
                <button class="page-item-btn btn btn-sm btn-outline-secondary ${prevDisabled}" data-page="${page - 1}">Prev</button>
            </li>
        `);

        // Page Numbers
        for (let i = 1; i <= totalPages; i++) {
            const active = i === page ? 'active bg-primary text-white' : 'btn-outline-secondary';
            $ul.append(`
                <li class="page-item">
                    <button class="page-item-btn btn btn-sm ${active} mx-0.5" data-page="${i}">${i}</button>
                </li>
            `);
        }

        // Next button
        const nextDisabled = page === totalPages ? 'disabled' : '';
        $ul.append(`
            <li class="page-item ${nextDisabled}">
                <button class="page-item-btn btn btn-sm btn-outline-secondary ${nextDisabled}" data-page="${page + 1}">Next</button>
            </li>
        `);

        $ul.off('click', '.page-item-btn').on('click', '.page-item-btn', function () {
            const p = parseInt($(this).data('page'));
            if (p && p >= 1 && p <= totalPages && p !== page) {
                callback(p);
            }
        });
    }

    $('#btnMarkAllRead').on('click', function () {
        $.ajax({
            url: '/api/notifications/read-all',
            method: 'POST',
            success: function () {
                fetchNotificationsList(currentNotificationPage);
            }
        });
    });

    $(document).on('click', '.btn-copy-tx', function () {
        const sig = $(this).data('sig') || $(this).data('url');
        copyToClipboard(sig, $(this));
    });

    $('#btnRefreshWithdrawList').on('click', function () {
        fetchWithdrawList(1);
    });

    $('#btnDecodeTx').on('click', function () {
        clearAlert();
        const txId = $('#decodeTxInput').val().trim();

        if (!txId) {
            showAlert('Please paste a valid Transaction Id (Signature).');
            return;
        }

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
                }
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

    // Initializations
    checkAndLoadPlatformAddress();
    fetchPlatformBalance();
    fetchWithdrawList(1);
    fetchNotificationsList(1);
});